// Renderer-crash marker (D-11, P00-T12). When the WebView's renderer process dies, MainActivity.java recreates the
// activity (at most PLATFORM.RENDERER_MAX_RECOVERIES per process) and adds one to a String count under
// PLATFORM.RENDERER_GONE_KEY in the Capacitor Preferences file. The new page cannot see that event any other way, so
// Saves.hydrate() reads the marker through the Preferences mirror, clears it, and reports one non-fatal.
//
// The marker is a native flag, not save data: it lives outside PLATFORM.SAVE_PREFIX, so the mirror/localStorage
// reconcile never copies it and Saves.remove (which only mirrors save keys) must not be used to clear it.
import type { AsyncKV } from './saves';

// The count MainActivity wrote. 0 = nothing to report (absent, or a literal "0"). A present value that is not a plain
// non-negative integer still means "an event happened" (only MainActivity writes the key), so it counts as 1.
export function parseRendererGone(raw: string | null): number {
  if (raw === null) return 0;
  return /^\d+$/.test(raw) ? Number(raw) : 1;
}

// Read, clear, then report; resolves to the number of renderer deaths reported (0 = none). Never rejects.
//   - Cleared BEFORE the report, so a marker that was reported can never be reported again by a later boot. If the
//     process dies in between, one non-fatal is lost, which is the cheaper mistake.
//   - A failed clear leaves the marker for the next boot and reports the failure instead of the event (the event is
//     reported once the clear works), so a stuck marker produces one `saves.rendererGone` error per boot, never a
//     stream of duplicate renderer_gone reports.
export async function consumeRendererGone(
  mirror: Pick<AsyncKV, 'get' | 'remove'>,
  key: string,
  report: (error: unknown, context: string) => void,
): Promise<number> {
  const say = (error: unknown, context: string): void => {
    try {
      report(error, context);
    } catch {
      // reporting must never break boot
    }
  };
  let raw: string | null;
  try {
    raw = await mirror.get(key);
  } catch (error) {
    say(error, 'saves.rendererGone');
    return 0;
  }
  if (raw === null) return 0;
  try {
    await mirror.remove(key);
  } catch (error) {
    say(error, 'saves.rendererGone');
    return 0;
  }
  const count = parseRendererGone(raw);
  if (count > 0) say(`renderer_gone x${count}`, 'native');
  return count;
}
