// installCleanup: the server (a managed child) is stopped on SIGINT/SIGTERM, on a normal exit that forgot to stop it, and on an
// uncaught exception. Each scenario runs in a throwaway Node process that starts a long-running managed child, prints its PID,
// and then ends in the way under test. The test asserts that child is gone afterwards, and that an unrelated bystander is not.

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

const SERVER_URL = pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'server.mjs')).href;

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
};
const until = async (fn, ms = 10000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
};

/** Run a scenario in a child Node process. `ending` is the code that ends it, after it has printed `CHILD <pid>`. */
async function scenario(ending) {
  const source = `
    import { installCleanup, spawnManaged } from ${JSON.stringify(SERVER_URL)};
    installCleanup();
    const proc = spawnManaged(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { label: 'sleeper' });
    console.log('CHILD ' + proc.child.pid);
    setTimeout(() => { ${ending} }, 300);
    setInterval(() => {}, 1000);
  `;
  const runner = spawn(process.execPath, ['--input-type=module', '-e', source], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  runner.stdout.on('data', (d) => (out += d));
  runner.stderr.on('data', (d) => (out += d));
  const exit = new Promise((resolve) => runner.once('exit', (code) => resolve(code)));
  expect(await until(() => /CHILD \d+/.test(out))).toBe(true);
  const childPid = Number(out.match(/CHILD (\d+)/)[1]);
  expect(alive(childPid)).toBe(true);
  const code = await exit;
  return { childPid, code, out };
}

describe('installCleanup stops what the harness started, on every way out', () => {
  it('on SIGINT (Ctrl-C): the child is stopped and the process exits 130', async () => {
    const bystander = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
    try {
      const { childPid, code } = await scenario("process.emit('SIGINT')");
      expect(code).toBe(130);
      expect(await until(() => !alive(childPid))).toBe(true);
      expect(alive(bystander.pid)).toBe(true);
    } finally {
      bystander.kill();
    }
  }, 30000);

  it('on SIGTERM: the child is stopped and the process exits 130', async () => {
    const { childPid, code } = await scenario("process.emit('SIGTERM')");
    expect(code).toBe(130);
    expect(await until(() => !alive(childPid))).toBe(true);
  }, 30000);

  it('on a plain process.exit() that never called stop()', async () => {
    const { childPid } = await scenario('process.exit(0)');
    expect(await until(() => !alive(childPid))).toBe(true);
  }, 30000);

  it('on an uncaught exception', async () => {
    const { childPid, code } = await scenario("throw new Error('boom')");
    expect(code).not.toBe(0);
    expect(await until(() => !alive(childPid))).toBe(true);
  }, 30000);
});
