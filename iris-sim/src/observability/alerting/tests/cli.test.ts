import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runAlerts } from '../../../cli/commands/alerts.js';
import { loadAlertRules } from '../alert_persist.js';

function mkTmp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'iris-alerts-cli-'));
}

describe('iris alerts CLI', () => {
  it('list empty', async () => {
    const cwd = mkTmp();
    const code = (await runAlerts(cwd, ['node', 'iris', 'alerts', 'list'])).exitCode;
    assert.strictEqual(code, 0);
  });

  it('add, list, remove', async () => {
    const cwd = mkTmp();
    let code = (
      await runAlerts(cwd, [
        'node',
        'iris',
        'alerts',
        'add',
        '--metric',
        'messages_sent',
        '--operator',
        '>',
        '--threshold',
        '3',
        '--name',
        'test',
      ])
    ).exitCode;
    assert.strictEqual(code, 0);
    const rules = loadAlertRules(cwd);
    assert.strictEqual(rules.length, 1);
    assert.strictEqual(rules[0]!.condition.metric, 'messages_sent');
    code = (await runAlerts(cwd, ['node', 'iris', 'alerts', 'list'])).exitCode;
    assert.strictEqual(code, 0);
    const id = rules[0]!.id;
    code = (await runAlerts(cwd, ['node', 'iris', 'alerts', 'remove', id])).exitCode;
    assert.strictEqual(code, 0);
    assert.strictEqual(loadAlertRules(cwd).length, 0);
  });

  it('active with no file', async () => {
    const cwd = mkTmp();
    const code = (await runAlerts(cwd, ['node', 'iris', 'alerts', 'active'])).exitCode;
    assert.strictEqual(code, 0);
  });
});
