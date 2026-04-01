import { describe, it } from 'node:test';
import assert from 'node:assert';

import { evaluateCondition } from '../alert_rules.js';
import type { AlertCondition } from '../alert_types.js';

describe('alert rules / evaluateCondition', () => {
  const gt: AlertCondition = { metric: 'm', operator: '>', threshold: 10 };

  it('compares > < >= <=', () => {
    assert.strictEqual(evaluateCondition(11, gt), true);
    assert.strictEqual(evaluateCondition(10, gt), false);
    assert.strictEqual(evaluateCondition(9, { ...gt, operator: '<', threshold: 10 }), true);
    assert.strictEqual(evaluateCondition(10, { ...gt, operator: '>=', threshold: 10 }), true);
    assert.strictEqual(evaluateCondition(9, { ...gt, operator: '<=', threshold: 10 }), true);
  });

  it('== and !=', () => {
    assert.strictEqual(evaluateCondition(3, { metric: 'm', operator: '==', threshold: 3 }), true);
    assert.strictEqual(evaluateCondition(3.0000000001, { metric: 'm', operator: '==', threshold: 3 }), true);
    assert.strictEqual(evaluateCondition(4, { metric: 'm', operator: '!=', threshold: 3 }), true);
  });

  it('NaN and non-finite values are false', () => {
    assert.strictEqual(evaluateCondition(NaN, gt), false);
    assert.strictEqual(evaluateCondition(Number.POSITIVE_INFINITY, gt), false);
  });
});
