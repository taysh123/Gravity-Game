// Command line of the boot smoke harness (scripts/harness/boot-smoke.mjs). Pure: no I/O, unit-tested in args.test.mjs.
//
//   npm run smoke                      preview mode (production build + vite preview), the default and what CI runs
//   npm run smoke -- --mode=dev        the Vite dev server (DEV-only hooks exist there)
//   npm run smoke -- --only=screens,first-run
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
  --shard=<i>/<n>       run only the i-th of n balanced slices of the jobs (CI runs the slices on separate runners).
  --exclusive           run only what is specific to the chosen mode: the checks that need it (a DEV-only hook) and the checks
                        that name it as a control mode (their dev run proves the labels their preview run asserts are absent).
  --jobs=<n>            run n jobs (a check at a viewport) at once, 1 to 8. Default 1: parallel pages compete for the CPU.
  --artifacts=<dir>     write a screenshot of every failed job into <dir> (CI uploads it).
  --verbose             after the table, list every assertion of every job (the counts show what was actually tested).
  --help, -h            this text.

Exit code 0 when every check passes with zero console errors, page errors, unhandled rejections and failed same-origin
requests; 1 otherwise; 2 for a harness error (bad arguments, server did not start).
`;

export function parseArgs(argv) {
  const out = { mode: 'preview', only: [], list: false, build: true, headed: false, verbose: false, jobs: 1, shard: null, exclusive: false, artifacts: null, help: false };
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
      case '--verbose':
        out.verbose = true;
        break;
      case '--shard': {
        const value = takeValue('--shard', inline);
        const m = /^(\d+)\/(\d+)$/.exec(value);
        const index = m ? Number(m[1]) : 0;
        const total = m ? Number(m[2]) : 0;
        if (!m || index < 1 || total > 16 || index > total) throw new Error(`--shard must be i/n with 1 <= i <= n <= 16 (got "${value}")`);
        out.shard = { index, total };
        break;
      }
      case '--exclusive':
        out.exclusive = true;
        break;
      case '--artifacts':
        out.artifacts = takeValue('--artifacts', inline);
        break;
      case '--jobs': {
        const value = takeValue('--jobs', inline);
        const n = Number(value);
        if (value === '' || !Number.isInteger(n) || n < 1 || n > 8) throw new Error(`--jobs must be a whole number from 1 to 8 (got "${value}")`);
        out.jobs = n;
        break;
      }
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
