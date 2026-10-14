// Command line of the boot smoke harness (scripts/harness/boot-smoke.mjs). Pure: no I/O, unit-tested in args.test.mjs.
//
//   npm run smoke                      preview mode (production build + vite preview), the default and what CI runs
//   npm run smoke -- --mode=dev        the Vite dev server (DEV-only hooks exist there)
//   npm run smoke -- --only=scene-boot,hit-areas
//   npm run smoke -- --list
//
// Anything unknown is an error: a mistyped flag must not turn into a green run that checked something else.

export const MODES = ['preview', 'dev'];

export const USAGE = `Boot smoke harness

Usage: node scripts/harness/boot-smoke.mjs [options]   (npm run smoke -- [options])

  --mode=<preview|dev>  preview (default): npm run build, then vite preview. The shipped bundle.
                        dev: the Vite dev server. DEV-only hooks (window.__game, later __crashTest) exist there.
  --only=<a,b,...>      run only these checks (repeatable). Default: every check that supports the mode.
  --list                print the checks for the chosen mode and exit.
  --no-build            preview mode: reuse the existing dist/ instead of running npm run build first.
  --headed              show the browser window (debugging; CI is always headless).
  --help, -h            this text.

Exit code 0 when every check passes with zero console errors, page errors, unhandled rejections and failed same-origin
requests; 1 otherwise; 2 for a harness error (bad arguments, server did not start).
`;

export function parseArgs(argv) {
  const out = { mode: 'preview', only: [], list: false, build: true, headed: false, help: false };
  const args = [...argv];
  const takeValue = (flag, inline) => {
    if (inline !== undefined) return inline;
    const next = args.shift();
    if (next === undefined || next.startsWith('--')) throw new Error(`${flag} needs a value`);
    return next;
  };
  while (args.length > 0) {
    const arg = args.shift();
    const eq = arg.indexOf('=');
    const flag = eq === -1 ? arg : arg.slice(0, eq);
    const inline = eq === -1 ? undefined : arg.slice(eq + 1);
    switch (flag) {
      case '--mode': {
        const value = takeValue('--mode', inline);
        if (!MODES.includes(value)) throw new Error(`--mode must be "preview" or "dev" (got "${value}")`);
        out.mode = value;
        break;
      }
      case '--only': {
        for (const name of takeValue('--only', inline).split(',')) {
          const n = name.trim();
          if (n && !out.only.includes(n)) out.only.push(n);
        }
        break;
      }
      case '--no-build':
        out.build = false;
        break;
      case '--list':
        out.list = true;
        break;
      case '--headed':
        out.headed = true;
        break;
      case '--help':
      case '-h':
        out.help = true;
        break;
      default:
        throw new Error(`Unknown argument "${arg}". Try --help.`);
    }
  }
  return out;
}
