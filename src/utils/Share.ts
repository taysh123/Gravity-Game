// Dependency-free share helper for the "tell a friend" surfaces (Gravity Run result
// card, etc.). Prefers the Web Share API (works in the Capacitor Android WebView and
// most mobile browsers — image when supported, else text), and falls back to copying
// the text to the clipboard. A native @capacitor/share can drop in behind this later.

type ShareNavigator = {
  canShare?: (data: { files?: File[]; text?: string; title?: string }) => boolean;
  share?: (data: { files?: File[]; text?: string; title?: string }) => Promise<void>;
};

export const Share = {
  // Share an optional PNG card + caption. Resolves to true if a share/copy happened.
  async shareCard(blob: Blob | null, text: string, title = 'GRAVITY FLOW'): Promise<boolean> {
    const nav = navigator as unknown as ShareNavigator;
    try {
      if (blob && nav.share && nav.canShare) {
        const file = new File([blob], 'gravity-run.png', { type: 'image/png' });
        if (nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], text, title });
          return true;
        }
      }
      if (nav.share) {
        await nav.share({ text, title });
        return true;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // user cancelled the share sheet, or it's unsupported — not an error.
    }
    return false;
  },
};
