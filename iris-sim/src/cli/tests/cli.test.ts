import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from '../cli.js';

function mkTmp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'iris-cli-'));
}

async function captureOutput(fn: () => Promise<void>): Promise<string> {
  const oldLog = console.log;
  const oldWrite = process.stdout.write.bind(process.stdout);
  let out = '';
  console.log = (...args: unknown[]) => {
    out += `${args.map(String).join(' ')}\n`;
  };
  (process.stdout.write as unknown as (chunk: string) => boolean) = (chunk: string) => {
    out += chunk;
    return true;
  };
  try {
    await fn();
    return out;
  } finally {
    console.log = oldLog;
    (process.stdout.write as unknown as (chunk: string) => boolean) = oldWrite as unknown as (chunk: string) => boolean;
  }
}

describe('IRIS CLI (16C)', () => {
  it('start without config -> OK', async () => {
    const cwd = mkTmp();
    const code = await runCli(['node', 'iris', 'start'], cwd);
    assert.strictEqual(code, 0);
    const st = JSON.parse(fs.readFileSync(path.join(cwd, '.iris', 'iris.state.json'), 'utf8')) as { status: string };
    assert.strictEqual(st.status, 'running');
    await runCli(['node', 'iris', 'stop'], cwd);
  });

  it('status after start -> RUNNING', async () => {
    const cwd = mkTmp();
    await runCli(['node', 'iris', 'start'], cwd);
    const code = await runCli(['node', 'iris', 'status'], cwd);
    assert.strictEqual(code, 0);
    await runCli(['node', 'iris', 'stop'], cwd);
  });

  it('init hello-world creates project files', async () => {
    const cwd = mkTmp();
    const code = await runCli(['node', 'iris', 'init', 'hello-world', '--yes'], cwd);
    assert.strictEqual(code, 0);
    assert.ok(fs.existsSync(path.join(cwd, 'iris.config.json')));
    assert.ok(fs.existsSync(path.join(cwd, 'index.ts')));
    assert.ok(fs.existsSync(path.join(cwd, 'README.md')));
    const idx = fs.readFileSync(path.join(cwd, 'index.ts'), 'utf8');
    assert.match(idx, /IrisNode/);
    assert.match(idx, /node:ready/);
  });

  it('init messaging-basic copies sender and receiver', async () => {
    const cwd = mkTmp();
    const code = await runCli(['node', 'iris', 'init', 'messaging-basic', '--yes'], cwd);
    assert.strictEqual(code, 0);
    assert.ok(fs.existsSync(path.join(cwd, 'sender.ts')));
    assert.ok(fs.existsSync(path.join(cwd, 'receiver.ts')));
    assert.ok(fs.readFileSync(path.join(cwd, 'sender.ts'), 'utf8').includes('PING'));
  });

  it('init secure-node enables encryption in template', async () => {
    const cwd = mkTmp();
    const code = await runCli(['node', 'iris', 'init', 'secure-node', '--yes'], cwd);
    assert.strictEqual(code, 0);
    const idx = fs.readFileSync(path.join(cwd, 'index.ts'), 'utf8');
    assert.match(idx, /IrisBuilder/);
    assert.match(idx, /enableEncryption\(true\)/);
  });

  it('init rejects unknown template', async () => {
    const cwd = mkTmp();
    const code = await runCli(['node', 'iris', 'init', 'not-a-template', '--yes'], cwd);
    assert.strictEqual(code, 1);
  });

  it('init overwrites non-empty dir with IRIS_INIT_YES', async () => {
    const cwd = mkTmp();
    fs.writeFileSync(path.join(cwd, 'existing.txt'), 'x', 'utf8');
    process.env.IRIS_INIT_YES = '1';
    const code = await runCli(['node', 'iris', 'init', 'hello-world'], cwd);
    delete process.env.IRIS_INIT_YES;
    assert.strictEqual(code, 0);
    assert.ok(fs.existsSync(path.join(cwd, 'index.ts')));
  });

  it('logs default and --last output lines', async () => {
    const cwd = mkTmp();
    await runCli(['node', 'iris', 'start'], cwd);
    const p = path.join(cwd, '.iris', 'iris.log');
    fs.appendFileSync(p, 'line-a\nline-b\nline-c\n', 'utf8');
    const outDefault = await captureOutput(async () => {
      const code = await runCli(['node', 'iris', 'logs'], cwd);
      assert.strictEqual(code, 0);
    });
    assert.match(outDefault, /IRIS Logs \(last 50 lines\)/);
    const outLast = await captureOutput(async () => {
      const code = await runCli(['node', 'iris', 'logs', '--last', '2'], cwd);
      assert.strictEqual(code, 0);
    });
    assert.match(outLast, /line-b/);
    assert.match(outLast, /line-c/);
    await runCli(['node', 'iris', 'stop'], cwd);
  });

  it('logs --follow receives new entries', async () => {
    const cwd = mkTmp();
    await runCli(['node', 'iris', 'start'], cwd);
    const p = path.join(cwd, '.iris', 'iris.log');
    process.env.IRIS_LOGS_ONCE = '1';
    fs.appendFileSync(p, 'follow-line\n', 'utf8');
    const out = await captureOutput(async () => {
      const code = await runCli(['node', 'iris', 'logs', '--follow', '--last', '1'], cwd);
      assert.strictEqual(code, 0);
    });
    delete process.env.IRIS_LOGS_ONCE;
    assert.match(out, /follow-line/);
    await runCli(['node', 'iris', 'stop'], cwd);
  });

  it('config invalid handled with readable message', async () => {
    const cwd = mkTmp();
    fs.writeFileSync(path.join(cwd, 'iris.config.json'), JSON.stringify({ transport: { type: 'smtp' } }), 'utf8');
    const code = await runCli(['node', 'iris', 'start'], cwd);
    assert.strictEqual(code, 1);
  });

  it('daemon mode creates PID file and can stop', async () => {
    const cwd = mkTmp();
    const code = await runCli(['node', 'iris', 'start', '--daemon'], cwd);
    assert.strictEqual(code, 0);
    const pidFile = path.join(cwd, '.iris', 'iris.pid');
    assert.ok(fs.existsSync(pidFile));
    const pid = Number(fs.readFileSync(pidFile, 'utf8').trim());
    assert.ok(Number.isFinite(pid));

    const statusCode = await runCli(['node', 'iris', 'status'], cwd);
    assert.strictEqual(statusCode, 0);

    const stopCode = await runCli(['node', 'iris', 'stop'], cwd);
    assert.strictEqual(stopCode, 0);
    assert.ok(!fs.existsSync(pidFile));
  });

  it('double daemon start is locked', async () => {
    const cwd = mkTmp();
    const first = await runCli(['node', 'iris', 'start', '--daemon'], cwd);
    assert.strictEqual(first, 0);
    const second = await runCli(['node', 'iris', 'start', '--daemon'], cwd);
    assert.strictEqual(second, 0);
    await runCli(['node', 'iris', 'stop'], cwd);
  });

  it('stale PID is cleaned and daemon can start', async () => {
    const cwd = mkTmp();
    const irisDir = path.join(cwd, '.iris');
    fs.mkdirSync(irisDir, { recursive: true });
    fs.writeFileSync(path.join(irisDir, 'iris.pid'), '999999', 'utf8');
    const code = await runCli(['node', 'iris', 'start', '--daemon'], cwd);
    assert.strictEqual(code, 0);
    const pid = Number(fs.readFileSync(path.join(irisDir, 'iris.pid'), 'utf8').trim());
    assert.ok(pid > 0 && pid !== 999999);
    await runCli(['node', 'iris', 'stop'], cwd);
  });

  it('status includes health and transport info', async () => {
    const cwd = mkTmp();
    await runCli(['node', 'iris', 'start'], cwd);
    const out = await captureOutput(async () => {
      const code = await runCli(['node', 'iris', 'status'], cwd);
      assert.strictEqual(code, 0);
    });
    assert.match(out, /IRIS Node Status/);
    assert.match(out, /Transport: ws:\/\/localhost:/);
    assert.match(out, /Healthy|Unhealthy/);
    await runCli(['node', 'iris', 'stop'], cwd);
  });

  it('metrics --json outputs parseable stable schema', async () => {
    const cwd = mkTmp();
    const irisDir = path.join(cwd, '.iris');
    fs.mkdirSync(irisDir, { recursive: true });
    fs.writeFileSync(
      path.join(irisDir, 'metrics.json'),
      JSON.stringify({ metrics: { messages_received: 2, messages_sent: 3 }, timestamp: new Date().toISOString(), nodeId: 'n1' }),
      'utf8',
    );
    const out = await captureOutput(async () => {
      const code = await runCli(['node', 'iris', 'metrics', '--json'], cwd);
      assert.strictEqual(code, 0);
    });
    const parsed = JSON.parse(out.trim()) as { metrics: Record<string, number>; timestamp: string; nodeId: string };
    assert.strictEqual(parsed.nodeId, 'n1');
    assert.strictEqual(parsed.metrics.messages_sent, 3);
  });

  it('metrics --prometheus outputs Prometheus text (no JSON)', async () => {
    const cwd = mkTmp();
    const irisDir = path.join(cwd, '.iris');
    fs.mkdirSync(irisDir, { recursive: true });
    fs.writeFileSync(
      path.join(irisDir, 'metrics.json'),
      JSON.stringify({ metrics: { messages_sent: 7 }, timestamp: new Date().toISOString(), nodeId: 'n1' }),
      'utf8',
    );
    const out = await captureOutput(async () => {
      const code = await runCli(['node', 'iris', 'metrics', '--prometheus'], cwd);
      assert.strictEqual(code, 0);
    });
    assert.ok(out.includes('# HELP iris_messages_sent_total'));
    assert.ok(out.includes('# TYPE iris_messages_sent_total'));
    assert.ok(out.includes('iris_messages_sent_total{node_id="n1"} 7'));
    assert.ok(!out.trim().startsWith('{'));
  });

  it('inspect --json outputs parseable object', async () => {
    const cwd = mkTmp();
    const out = await captureOutput(async () => {
      const code = await runCli(['node', 'iris', 'inspect', '--json'], cwd);
      assert.strictEqual(code, 0);
    });
    const parsed = JSON.parse(out.trim()) as { state: string; logs: string[] };
    assert.ok(typeof parsed.state === 'string');
    assert.ok(Array.isArray(parsed.logs));
  });

  it('node revoke without --confirm fails safely', async () => {
    const cwd = mkTmp();
    const code = await runCli(['node', 'iris', 'node', 'revoke', 'node-a'], cwd);
    assert.strictEqual(code, 1);
  });

  it('node revoke --dry-run returns success without HTTP call', async () => {
    const cwd = mkTmp();
    const code = await runCli(['node', 'iris', 'node', 'revoke', 'node-a', '--confirm', '--dry-run'], cwd);
    assert.strictEqual(code, 0);
  });
});

