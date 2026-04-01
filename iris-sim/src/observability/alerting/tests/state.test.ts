import { describe, it } from 'node:test';
import assert from 'node:assert';

import { AlertState } from '../alert_state.js';

describe('AlertState', () => {
  it('tracks one active alert per rule id', () => {
    const s = new AlertState();
    assert.strictEqual(s.isActive('r1'), false);
    s.activate({ ruleId: 'r1', triggeredAt: 1, value: 2 });
    assert.strictEqual(s.isActive('r1'), true);
    assert.strictEqual(s.getActive('r1')?.value, 2);
    s.updateValue('r1', 3);
    assert.strictEqual(s.getActive('r1')?.value, 3);
  });

  it('resolve removes active', () => {
    const s = new AlertState();
    s.activate({ ruleId: 'r1', triggeredAt: 1, value: 1 });
    const r = s.resolve('r1', 99);
    assert.strictEqual(r?.resolvedAt, 99);
    assert.strictEqual(s.isActive('r1'), false);
  });

  it('getAllActive is sorted and copied', () => {
    const s = new AlertState();
    s.activate({ ruleId: 'b', triggeredAt: 1, value: 1 });
    s.activate({ ruleId: 'a', triggeredAt: 2, value: 2 });
    const all = s.getAllActive();
    assert.deepStrictEqual(
      all.map((x) => x.ruleId),
      ['a', 'b'],
    );
  });
});
