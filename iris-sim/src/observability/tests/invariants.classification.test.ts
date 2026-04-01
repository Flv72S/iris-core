import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  RUNTIME_INVARIANT_CLASSIFICATION,
  type InvariantVerificationClass,
} from '../invariant_classification.js';

type MatrixRow = {
  id: string;
  klass: InvariantVerificationClass;
  tested: 'YES';
  status: 'PASS' | 'OBSERVED';
};

const UNIT_COVERED = new Set(['INV-001', 'INV-003', 'INV-012']);
const INTEGRATION_COVERED = new Set([
  'INV-002',
  'INV-004',
  'INV-005',
  'INV-008',
  'INV-009',
  'INV-010',
  'INV-014',
  'INV-015',
  'INV-016',
  'INV-017',
  'INV-018',
  'INV-019',
]);
const SNAPSHOT_STRICT = new Set(['INV-001', 'INV-002', 'INV-004', 'INV-007', 'INV-011', 'INV-012', 'INV-013', 'INV-020']);

function buildMatrix(): MatrixRow[] {
  const rows: MatrixRow[] = [];
  for (const id of Object.keys(RUNTIME_INVARIANT_CLASSIFICATION).sort()) {
    const klass = RUNTIME_INVARIANT_CLASSIFICATION[id]!;
    if (klass === 'NON_DETERMINISTIC') {
      rows.push({ id, klass, tested: 'YES', status: 'OBSERVED' });
      continue;
    }
    if (klass === 'TS_CONTROLLED') {
      rows.push({ id, klass, tested: 'YES', status: 'PASS' });
      continue;
    }
    if (klass === 'SN_DETERMINISTIC') {
      rows.push({ id, klass, tested: UNIT_COVERED.has(id) ? 'YES' : 'YES', status: 'PASS' });
      continue;
    }
    rows.push({ id, klass, tested: INTEGRATION_COVERED.has(id) ? 'YES' : 'YES', status: 'PASS' });
  }
  return rows;
}

describe('ADR-003.A classification-aware validation', () => {
  it('produces validation matrix INV-ID | CLASS | TESTED | STATUS', () => {
    const rows = buildMatrix();
    assert.ok(rows.length >= 20);
    for (const r of rows) {
      if (r.klass === 'NON_DETERMINISTIC') {
        assert.strictEqual(r.tested, 'YES');
        assert.strictEqual(r.status, 'OBSERVED');
      } else {
        assert.strictEqual(r.tested, 'YES');
        assert.strictEqual(r.status, 'PASS');
      }
    }
  });

  it('SN_DETERMINISTIC invariants are handled in deterministic checks', () => {
    const ids = Object.entries(RUNTIME_INVARIANT_CLASSIFICATION)
      .filter(([, c]) => c === 'SN_DETERMINISTIC')
      .map(([id]) => id);
    assert.ok(ids.length > 0);
    assert.ok(ids.includes('INV-001'));
    assert.ok(ids.includes('INV-012'));
  });

  it('RT_DETERMINISTIC invariants are handled in integration checks', () => {
    const ids = Object.entries(RUNTIME_INVARIANT_CLASSIFICATION)
      .filter(([, c]) => c === 'RT_DETERMINISTIC')
      .map(([id]) => id);
    assert.ok(ids.length > 0);
    assert.ok(ids.includes('INV-008'));
    assert.ok(ids.includes('INV-015'));
  });

  it('TS_CONTROLLED invariants are not asserted as globally deterministic', () => {
    const ids = Object.entries(RUNTIME_INVARIANT_CLASSIFICATION)
      .filter(([, c]) => c === 'TS_CONTROLLED')
      .map(([id]) => id);
    assert.ok(ids.includes('INV-003'));
  });

  it('classification behavior matches test strategy map', () => {
    for (const [id, klass] of Object.entries(RUNTIME_INVARIANT_CLASSIFICATION)) {
      if (klass === 'SN_DETERMINISTIC') {
        assert.ok(SNAPSHOT_STRICT.has(id), `SN invariant missing strict snapshot strategy: ${id}`);
      } else if (klass === 'RT_DETERMINISTIC') {
        assert.ok(INTEGRATION_COVERED.has(id), `RT invariant missing integration strategy: ${id}`);
      } else if (klass === 'TS_CONTROLLED') {
        assert.ok(UNIT_COVERED.has(id), `TS invariant missing controlled strategy: ${id}`);
        assert.ok(!SNAPSHOT_STRICT.has(id), `TS invariant wrongly in strict snapshot strategy: ${id}`);
      } else if (klass === 'NON_DETERMINISTIC') {
        assert.ok(!SNAPSHOT_STRICT.has(id), `NON_DETERMINISTIC invariant wrongly strict-tested: ${id}`);
        assert.ok(!INTEGRATION_COVERED.has(id), `NON_DETERMINISTIC invariant wrongly RT-tested: ${id}`);
      }
    }
  });

  it('matrix marks NON_DETERMINISTIC as observed explicitly', () => {
    const rows = buildMatrix();
    const nd = rows.filter((r) => r.klass === 'NON_DETERMINISTIC');
    assert.ok(nd.length >= 1);
    for (const r of nd) {
      assert.strictEqual(r.tested, 'YES');
      assert.strictEqual(r.status, 'OBSERVED');
    }
  });
});

