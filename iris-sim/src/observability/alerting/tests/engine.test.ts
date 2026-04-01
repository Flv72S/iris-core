import { describe, it } from 'node:test';
import assert from 'node:assert';

import { AlertEngine } from '../alert_engine.js';
import { AlertRegistry } from '../alert_registry.js';
import { AlertState } from '../alert_state.js';
import type { AlertRule } from '../alert_types.js';

describe('AlertEngine', () => {
  const rule: AlertRule = {
    id: 'r-high',
    name: 'high',
    level: 'WARNING',
    condition: { metric: 'messages_sent', operator: '>', threshold: 5 },
    cooldownMs: 1000,
  };

  it('triggers when threshold exceeded', () => {
    const reg = new AlertRegistry();
    reg.register(rule);
    const state = new AlertState();
    const engine = new AlertEngine(reg, state, { defaultCooldownMs: 60_000 });
    const fired = engine.evaluate({ messages_sent: 10 });
    assert.strictEqual(fired.length >= 1, true);
    assert.strictEqual(state.isActive('r-high'), true);
    assert.strictEqual(state.getActive('r-high')?.value, 10);
  });

  it('resolves when metric drops below threshold', () => {
    const reg = new AlertRegistry();
    reg.register(rule);
    const state = new AlertState();
    const engine = new AlertEngine(reg, state, { defaultCooldownMs: 60_000 });
    engine.evaluate({ messages_sent: 10 });
    const out = engine.evaluate({ messages_sent: 1 });
    assert.ok(out.some((a) => a.resolvedAt !== undefined));
    assert.strictEqual(state.isActive('r-high'), false);
  });

  it('cooldown suppresses repeat emits while condition stays true', async () => {
    const reg = new AlertRegistry();
    reg.register({ ...rule, cooldownMs: 200 });
    const state = new AlertState();
    const engine = new AlertEngine(reg, state, { defaultCooldownMs: 60_000 });
    const a = engine.evaluate({ messages_sent: 100 });
    assert.strictEqual(a.length, 1);
    const b = engine.evaluate({ messages_sent: 100 });
    assert.strictEqual(b.length, 0);
    await new Promise((r) => setTimeout(r, 250));
    const c = engine.evaluate({ messages_sent: 101 });
    assert.strictEqual(c.length >= 1, true);
  });

  it('missing metric resolves active alert', () => {
    const reg = new AlertRegistry();
    reg.register(rule);
    const state = new AlertState();
    const engine = new AlertEngine(reg, state, {});
    engine.evaluate({ messages_sent: 10 });
    const out = engine.evaluate({});
    assert.ok(out.some((x) => x.resolvedAt !== undefined));
  });

  it('onAlert callback receives instance', () => {
    const reg = new AlertRegistry();
    reg.register(rule);
    const state = new AlertState();
    const engine = new AlertEngine(reg, state, {});
    const seen: string[] = [];
    engine.onAlert((a) => seen.push(a.ruleId));
    engine.evaluate({ messages_sent: 10 });
    assert.deepStrictEqual(seen, ['r-high']);
  });

  it('multiple rules on same metric', () => {
    const reg = new AlertRegistry();
    reg.register({ ...rule, id: 'a', condition: { ...rule.condition, operator: '>', threshold: 1 } });
    reg.register({ ...rule, id: 'b', condition: { ...rule.condition, operator: '>', threshold: 100 } });
    const state = new AlertState();
    const engine = new AlertEngine(reg, state, {});
    engine.evaluate({ messages_sent: 50 });
    assert.strictEqual(state.isActive('a'), true);
    assert.strictEqual(state.isActive('b'), false);
  });
});
