/**
 * Microstep 14O — Covenant Persistence Layer. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CovenantRegistry } from '../../covenants/index.js';
import { CovenantLoader } from '../../covenant_dsl/index.js';
import {
  buildCovenantSnapshot,
  CovenantPersistenceEngine,
  CovenantPersistenceError,
  CovenantPersistenceErrorCode,
  CovenantPersistenceStore,
} from '../index.js';

function def(id: string, overrides: Partial<{ name: string; condition: string }> = {}): {
  id: string;
  name: string;
  enabled: boolean;
  severity: 'HIGH';
  condition: string;
} {
  return {
    id,
    name: overrides.name ?? `Covenant ${id}`,
    enabled: true,
    severity: 'HIGH',
    condition: overrides.condition ?? 'state.value < 1000',
  };
}

describe('Covenant Persistence (14O)', () => {
  describe('create', () => {
    it('create covenant → version 1, record appended', () => {
      const store = new CovenantPersistenceStore();
      const engine = new CovenantPersistenceEngine(store);
      const d = def('c1');
      const record = engine.create(d);
      assert.strictEqual(record.version, 1);
      assert.strictEqual(record.action, 'CREATE');
      assert.strictEqual(record.covenant_id, 'c1');
      assert.ok(record.record_id.length > 0);
      assert.strictEqual(store.getAll().length, 1);
    });
  });

  describe('update', () => {
    it('update → version increments, history preserved', () => {
      const store = new CovenantPersistenceStore();
      const engine = new CovenantPersistenceEngine(store);
      engine.create(def('c1'));
      const r2 = engine.update(def('c1', { name: 'Updated' }));
      assert.strictEqual(r2.version, 2);
      assert.strictEqual(r2.action, 'UPDATE');
      assert.strictEqual(store.getAll().length, 2);
      const byId = store.getByCovenantId('c1');
      assert.strictEqual(byId.length, 2);
      const versions = byId.map((r) => r.version).sort((a, b) => a - b);
      assert.deepStrictEqual(versions, [1, 2]);
    });
  });

  describe('disable', () => {
    it('disable → covenant excluded from snapshot', () => {
      const store = new CovenantPersistenceStore();
      const engine = new CovenantPersistenceEngine(store);
      engine.create(def('c1'));
      engine.disable('c1');
      const current = engine.getCurrentDefinitions();
      assert.strictEqual(current.length, 0);
      assert.strictEqual(store.getAll().length, 2);
    });
  });

  describe('snapshot', () => {
    it('multiple versions → latest selected, disabled excluded', () => {
      const store = new CovenantPersistenceStore();
      const engine = new CovenantPersistenceEngine(store);
      engine.create(def('a', { condition: 'v1' }));
      engine.update(def('a', { condition: 'v2' }));
      engine.create(def('b'));
      engine.disable('b');
      const snapshot = buildCovenantSnapshot(store.getAll());
      assert.strictEqual(snapshot.size, 1);
      assert.strictEqual(snapshot.get('a')?.condition, 'v2');
      assert.strictEqual(snapshot.has('b'), false);
    });
  });

  describe('determinism', () => {
    it('same records → same snapshot', () => {
      const records = [
        {
          record_id: 'r1',
          covenant_id: 'x',
          version: 1,
          action: 'CREATE' as const,
          definition: def('x'),
          timestamp: 1000,
        },
        {
          record_id: 'r2',
          covenant_id: 'x',
          version: 2,
          action: 'UPDATE' as const,
          definition: def('x', { name: 'X2' }),
          timestamp: 2000,
        },
      ];
      const s1 = buildCovenantSnapshot(records);
      const s2 = buildCovenantSnapshot(records);
      assert.strictEqual(s1.size, s2.size);
      assert.strictEqual(s1.get('x')?.name, s2.get('x')?.name);
    });
  });

  describe('error cases', () => {
    it('duplicate create → DUPLICATE_CREATE', () => {
      const store = new CovenantPersistenceStore();
      const engine = new CovenantPersistenceEngine(store);
      engine.create(def('c1'));
      assert.throws(
        () => engine.create(def('c1')),
        (e: unknown) =>
          e instanceof CovenantPersistenceError && e.code === CovenantPersistenceErrorCode.DUPLICATE_CREATE,
      );
    });

    it('update non-existing → NOT_FOUND', () => {
      const store = new CovenantPersistenceStore();
      const engine = new CovenantPersistenceEngine(store);
      assert.throws(
        () => engine.update(def('missing')),
        (e: unknown) =>
          e instanceof CovenantPersistenceError && e.code === CovenantPersistenceErrorCode.NOT_FOUND,
      );
    });

    it('disable non-existing → NOT_FOUND', () => {
      const store = new CovenantPersistenceStore();
      const engine = new CovenantPersistenceEngine(store);
      assert.throws(
        () => engine.disable('missing'),
        (e: unknown) =>
          e instanceof CovenantPersistenceError && e.code === CovenantPersistenceErrorCode.NOT_FOUND,
      );
    });

    it('update after disable → INVALID_UPDATE', () => {
      const store = new CovenantPersistenceStore();
      const engine = new CovenantPersistenceEngine(store);
      engine.create(def('c1'));
      engine.disable('c1');
      assert.throws(
        () => engine.update(def('c1')),
        (e: unknown) =>
          e instanceof CovenantPersistenceError && e.code === CovenantPersistenceErrorCode.INVALID_UPDATE,
      );
    });
  });

  describe('integration with DSL', () => {
    it('getCurrentDefinitions → loadFromJSON → registry', () => {
      const store = new CovenantPersistenceStore();
      const engine = new CovenantPersistenceEngine(store);
      engine.create(def('d1'));
      engine.create(def('d2'));
      const defs = engine.getCurrentDefinitions();
      assert.strictEqual(defs.length, 2);
      const covenants = CovenantLoader.loadFromJSON(defs);
      const registry = new CovenantRegistry();
      for (const c of covenants) registry.register(c);
      assert.strictEqual(registry.getAll().length, 2);
    });
  });
});
