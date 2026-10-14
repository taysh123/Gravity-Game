// The web server the smoke harness drives, and the process handling around it.
//
// Two modes (see args.mjs): `preview` serves the production build with `vite preview` (after `npm run build`),
// `dev` runs the Vite dev server. Both bind 127.0.0.1 on a free port picked at run time (--strictPort, so a stolen
// port fails loudly instead of silently moving).
//
// PROCESS SAFETY. The harness only ever stops a process it started itself, by the PID of its own child handle:
//   - Windows: `taskkill /PID <child pid> /T /F` (that PID's tree: vite and its esbuild service).
//   - POSIX:   the child is spawned detached as its own process group and the group is signalled (`kill(-pid)`).
// There is no kill by image/process name anywhere, no `pkill`, no `taskkill /IM`. Every managed child is stopped on
// success, on failure and on SIGINT/SIGTERM/SIGHUP (installCleanup), and a last-resort 'exit' hook kills what is left.
// The server is `node <vite bin>` spawned directly (no npx, no shell), so the child PID is the server itself.

import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODES } from './args.mjs';

const require = createRequire(import.meta.url);
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const HOST = '127.0.0.1';
const OUTPUT_TAIL_CHARS = 8000;

/** The entry file of the project's own vite (its package "bin"), so the server can be started with plain `node`. */
export function viteBin() {
  const pkg = require.resolve('vite/package.json', { paths: [ROOT] });
  return path.join(path.dirname(pkg), 'bin', 'vite.js');
}

export function serverCommand({ mode, port }) {
  if (!MODES.includes(mode)) throw new Error(`serverCommand: unknown mode "${mode}"`);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`serverCommand: bad port "${port}"`);
  const common = ['--host', HOST, '--port', String(port), '--strictPort'];
  return { command: process.execPath, args: mode === 'preview' ? [viteBin(), 'preview', ...common] : [viteBin(), ...common] };
}

/** The kill-by-PID command for a platform, or null where the process group is signalled instead. Never by name. */
export function killCommand(platform, pid) {
  if (!Number.isInteger(pid) || pid < 1) throw new Error(`killCommand: pid must be a positive integer (got ${String(pid)})`);
  return platform === 'win32' ? { command: 'taskkill', args: ['/PID', String(pid), '/T', '/F'] } : null;
}

export function findFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, HOST, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

// ---- managed child processes -------------------------------------------------------------------------------------

const live = new Set();

function killTreeNow(child) {
  if (child.exitCode !== null || child.signalCode !== null || child.pid === undefined) return; // gone: the PID may be reused
  const cmd = killCommand(process.platform, child.pid);
  if (cmd) {
    spawnSync(cmd.command, cmd.args, { stdio: 'ignore', windowsHide: true });
    return;
  }
  try {
    process.kill(-child.pid, 'SIGKILL'); // the group this child leads (spawned detached)
  } catch {
    try {
      child.kill('SIGKILL');
    } catch {
      // already gone
    }
  }
}

/**
 * Spawn a child the harness owns. `stop()` ends it and its whole tree (idempotent, safe after it exited).
 * @returns {{child: import('node:child_process').ChildProcess, label: string, output: () => string, exited: () => boolean, stop: () => Promise<void>}}
 */
export function spawnManaged(command, args, { label = command, cwd = ROOT, env = process.env, shell = false } = {}) {
  const child = spawn(command, args, {
    cwd,
    env,
    shell,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    detached: process.platform !== 'win32',
  });
  let tail = '';
  const keep = (chunk) => {
    tail = (tail + chunk).slice(-OUTPUT_TAIL_CHARS);
  };
  child.stdout.on('data', keep);
  child.stderr.on('data', keep);
  let done = false;
  const exitWaiters = [];
  child.once('exit', () => {
    done = true;
    exitWaiters.splice(0).forEach((resolve) => resolve());
  });
  child.once('error', (err) => {
    keep(`[spawn error] ${err.message}\n`);
    done = true;
    exitWaiters.splice(0).forEach((resolve) => resolve());
  });
  const handle = {
    child,
    label,
    output: () => tail,
    exited: () => done,
    async stop() {
      live.delete(handle);
      if (done) return;
      killTreeNow(child);
      await new Promise((resolve) => {
        exitWaiters.push(resolve);
        setTimeout(resolve, 10000).unref(); // a stuck exit must not hang the run
      });
    },
    killNow() {
      live.delete(handle);
      killTreeNow(child);
    },
  };
  live.add(handle);
  return handle;
}

/** Call once from the entry point: stop every managed child on SIGINT/SIGTERM/SIGHUP and on any process exit. */
export function installCleanup() {
  const killAll = () => {
    for (const handle of [...live]) handle.killNow();
  };
  process.once('exit', killAll);
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.once(signal, () => {
      console.error(`\n[harness] ${signal}: stopping the processes it started`);
      killAll();
      process.exit(130);
    });
  }
}

// ---- build + serve -----------------------------------------------------------------------------------------------

async function waitForHttp(url, proc, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (proc.exited()) throw new Error(`${proc.label} exited before it served ${url}`);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      await res.arrayBuffer();
      if (res.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`${proc.label} did not serve ${url} within ${timeoutMs} ms`);
}

/** `npm run build` (tsc + vite build), the same step CI runs. Fixed command string, no user input reaches the shell. */
export async function buildApp() {
  const proc = spawnManaged('npm run build', [], { label: 'npm run build', shell: true });
  await new Promise((resolve) => (proc.exited() ? resolve() : proc.child.once('exit', resolve)));
  if (proc.child.exitCode !== 0) {
    await proc.stop();
    throw new Error(`npm run build failed (exit ${proc.child.exitCode})\n${proc.output()}`);
  }
}

/** Start the server for a mode on a free port. Resolves once it answers; `stop()` ends it. */
export async function startServer({ mode, timeoutMs = 120000 }) {
  const port = await findFreePort();
  const { command, args } = serverCommand({ mode, port });
  const proc = spawnManaged(command, args, { label: `vite ${mode}` });
  const url = `http://${HOST}:${port}`;
  try {
    await waitForHttp(`${url}/`, proc, timeoutMs);
  } catch (err) {
    const output = proc.output();
    await proc.stop();
    throw new Error(`${err.message}\n--- server output ---\n${output}`);
  }
  return { url, origin: url, port, pid: proc.child.pid, mode, stop: () => proc.stop(), output: () => proc.output() };
}
