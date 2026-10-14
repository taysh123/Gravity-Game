import { spawn } from 'node:child_process';
import net from 'node:net';
import { describe, expect, it, vi } from 'vitest';
import { findFreePort, killCommand, killTree, serverCommand, spawnManaged, viteBin } from './server.mjs';

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
};

const until = async (fn, ms = 8000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
};

describe('serverCommand: node + the project\'s own vite, no shell, no PATH lookup', () => {
  it('serves the production build with vite preview on a given port', () => {
    const { command, args } = serverCommand({ mode: 'preview', port: 4173 });
    expect(command).toBe(process.execPath);
    expect(args).toEqual([viteBin(), 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort']);
  });

  it('serves the dev server with plain vite', () => {
    const { command, args } = serverCommand({ mode: 'dev', port: 5199 });
    expect(command).toBe(process.execPath);
    expect(args).toEqual([viteBin(), '--host', '127.0.0.1', '--port', '5199', '--strictPort']);
  });

  it('refuses an unknown mode and a bad port', () => {
    expect(() => serverCommand({ mode: 'prod', port: 1 })).toThrow(/mode/);
    expect(() => serverCommand({ mode: 'dev', port: 0 })).toThrow(/port/);
    expect(() => serverCommand({ mode: 'dev', port: '80; rm -rf /' })).toThrow(/port/);
  });

  it('points at a vite entry file that exists', async () => {
    const { existsSync } = await import('node:fs');
    expect(existsSync(viteBin())).toBe(true);
  });
});

describe('killCommand: by PID and its tree, never by image name', () => {
  it('uses taskkill /PID <pid> /T /F on Windows', () => {
    expect(killCommand('win32', 4242)).toEqual({ command: 'taskkill', args: ['/PID', '4242', '/T', '/F'] });
  });

  it('has no command on POSIX: the process group is signalled instead', () => {
    expect(killCommand('linux', 4242)).toBeNull();
    expect(killCommand('darwin', 4242)).toBeNull();
  });

  it('refuses anything that is not a positive integer PID', () => {
    for (const bad of [0, -1, 1.5, '12', '12; calc', NaN, undefined, null]) {
      expect(() => killCommand('win32', bad)).toThrow(/pid/);
    }
  });

  it('never builds an /IM (image name) kill', () => {
    const cmd = killCommand('win32', 99);
    expect(cmd.args.map((a) => a.toUpperCase())).not.toContain('/IM');
  });
});

describe('findFreePort', () => {
  it('returns a port that can be bound right away, and a different one next time it is held', async () => {
    const port = await findFreePort();
    expect(Number.isInteger(port)).toBe(true);
    expect(port).toBeGreaterThan(1023);
    const holder = net.createServer();
    await new Promise((resolve) => holder.listen(port, '127.0.0.1', resolve));
    const other = await findFreePort();
    expect(other).not.toBe(port);
    await new Promise((resolve) => holder.close(resolve));
  });
});

describe('spawnManaged: stop() ends the process it started, its children, and nothing else', () => {
  // A parent that spawns a grandchild, prints both PIDs, then idles.
  const parentSource = `
    const { spawn } = require('node:child_process');
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
    console.log('PIDS ' + process.pid + ' ' + child.pid);
    setInterval(() => {}, 1000);
  `;

  it('kills the whole tree on stop()', async () => {
    const proc = spawnManaged(process.execPath, ['-e', parentSource], { label: 'tree-test' });
    let out = '';
    proc.child.stdout.on('data', (d) => (out += d));
    expect(await until(() => /PIDS \d+ \d+/.test(out))).toBe(true);
    const [, parentPid, grandPid] = out.match(/PIDS (\d+) (\d+)/).map(Number);
    expect(proc.child.pid).toBe(parentPid);
    expect(alive(parentPid)).toBe(true);
    expect(alive(grandPid)).toBe(true);

    await proc.stop();

    expect(await until(() => !alive(parentPid))).toBe(true);
    expect(await until(() => !alive(grandPid))).toBe(true);
  }, 20000);

  it('leaves an unrelated process alone', async () => {
    const bystander = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
    try {
      const proc = spawnManaged(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { label: 'victim' });
      expect(await until(() => alive(proc.child.pid))).toBe(true);
      await proc.stop();
      expect(await until(() => !alive(proc.child.pid))).toBe(true);
      expect(alive(bystander.pid)).toBe(true);
    } finally {
      bystander.kill();
    }
  }, 20000);

  it('stop() is idempotent and safe on a process that already exited', async () => {
    const proc = spawnManaged(process.execPath, ['-e', 'process.exit(0)'], { label: 'short' });
    await until(() => proc.exited());
    await proc.stop();
    await proc.stop();
    expect(proc.exited()).toBe(true);
  }, 20000);

  it('keeps the tail of the output for diagnostics when a server fails to start', async () => {
    const proc = spawnManaged(process.execPath, ['-e', 'console.log("hello out"); console.error("hello err")'], { label: 'chatty' });
    await until(() => proc.exited());
    await until(() => /hello out/.test(proc.output()) && /hello err/.test(proc.output()));
    expect(proc.output()).toContain('hello out');
    expect(proc.output()).toContain('hello err');
  }, 20000);
});

describe('killTree: taskkill on the own child PID first, the child handle as the fallback', () => {
  const liveChild = () => ({ pid: 4321, exitCode: null, signalCode: null, kill: vi.fn() });

  it('on Windows runs taskkill /PID <pid> /T /F and leaves the handle alone when it worked', () => {
    const child = liveChild();
    const run = vi.fn(() => ({ status: 0 }));
    killTree(child, { platform: 'win32', run });
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0].slice(0, 2)).toEqual(['taskkill', ['/PID', '4321', '/T', '/F']]);
    expect(child.kill).not.toHaveBeenCalled();
  });

  it('on Windows falls back to child.kill() when taskkill exits non-zero', () => {
    const child = liveChild();
    killTree(child, { platform: 'win32', run: () => ({ status: 128 }) });
    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
  });

  it('on Windows falls back to child.kill() when taskkill cannot even be started', () => {
    const child = liveChild();
    killTree(child, { platform: 'win32', run: () => ({ status: null, error: new Error('spawn taskkill ENOENT') }) });
    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
  });

  it('does not throw when the fallback finds the process already gone', () => {
    const child = liveChild();
    child.kill = () => {
      throw new Error('ESRCH');
    };
    expect(() => killTree(child, { platform: 'win32', run: () => ({ status: 128 }) })).not.toThrow();
  });

  it('does nothing for a child that already exited: its PID may belong to someone else by now', () => {
    const run = vi.fn();
    const exited = { ...liveChild(), exitCode: 0 };
    killTree(exited, { platform: 'win32', run });
    const signalled = { ...liveChild(), signalCode: 'SIGTERM' };
    killTree(signalled, { platform: 'win32', run });
    expect(run).not.toHaveBeenCalled();
    expect(exited.kill).not.toHaveBeenCalled();
  });
});
