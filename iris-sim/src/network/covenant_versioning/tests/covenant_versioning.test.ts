/**
 * Microstep 14P — Versioning & Immutable History. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CovenantPersistenceEngine } from '../../covenant_persistence/index.js';
import { CovenantPersistenceStore } from '../../covenant_persistence/index.js';
import { CovenantLoader } from '../../covenant_dsl/index.js';
import { CovenantRegistry } from '../../covenants/index.js';
import {
  CovenantHistoryEngine,
  CovenantHistoryQuery,
  CovenantRollbackEngine,
  diffCovenants,
} from '../index.js';

function def(
  id: string,
  overrides: Partial<{ name: string; condition: string; enabled: boolean }> = {},
): {
  id: string;
  name: string;
  enabled: boolean;
  severity: 'HIGH';
  condition: string;
} {
  return {
    id,
    name: overrides.name ?? `Covenant ${id}`,
    enabled: overrides.enabled ?? true,
    severity: 'HIGH',
    condition: overrides.condition ?? 'state.value < 1000',
  };
}

describe('Covenant Versioning (14P)', () => {
  describe('history', () => {
    it('create + update → 2 versions returned', () => {
      const store = new CovenantPersistenceStore();
      const persistence = new CovenantPersistenceEngine(store);
      const history = new CovenantHistoryEngine(store);
      persistence.create(def('c1'));
      persistence.update(def('c1', { name: 'Updated' }));
      const versions = history.getHistory('c1');
      assert.strictEqual(versions.length, 2);
      assert.strictEqual(versions[0]!.version, 1);
      assert.strictEqual(versions[1]!.version, 2);
    });
  });

  describe('get specific version', () => {
    it('version retrieval works', () => {
      const store = new CovenantPersistenceStore();
      const persistence = new CovenantPersistenceEngine(store);
      persistence.create(def('c1', { condition: 'v1' }));
      persistence.update(def('c1', { condition: 'v2' }));
      const query = new CovenantHistoryQuery(new CovenantHistoryEngine(store));
      const v1 = query.getVersion('c1', 1);
      const v2 = query.getVersion('c1', 2);
      assert.ok(v1 != null);
      assert.ok(v2 != null);
      assert.strictEqual(v1.definition.condition, 'v1');
      assert.strictEqual(v2.definition.condition, 'v2');
    });
    it('non-existing version → null', () => {
      const store = new CovenantPersistenceStore();
      const persistence = new CovenantPersistenceEngine(store);
      persistence.create(def('c1'));
      const query = new CovenantHistoryQuery(new CovenantHistoryEngine(store));
      assert.strictEqual(query.getVersion('c1', 99), null);
      assert.strictEqual(query.getVersion('missing', 1), null);
    });
  });

  describe('latest version', () => {
    it('correct latest returned', () => {
      const store = new CovenantPersistenceStore();
      const persistence = new CovenantPersistenceEngine(store);
      persistence.create(def('c1', { condition: 'a' }));
      persistence.update(def('c1', { condition: 'b' }));
      persistence.update(def('c1', { condition: 'c' }));
      const query = new CovenantHistoryQuery(new CovenantHistoryEngine(store));
      const latest = query.getLatest('c1');
      assert.ok(latest != null);
      assert.strictEqual(latest.version, 3);
      assert.strictEqual(latest.definition.condition, 'c');
    });
  });

  describe('diff', () => {
    it('detect changed fields', () => {
      const a = def('x', { condition: 'a', name: 'A' });
      const b = def('x', { condition: 'b', name: 'A' });
      const result = diffCovenants(a, b);
      assert.strictEqual(result.changed, true);
      assert.ok(result.fields.some((f) => f.field === 'condition' && f.from === 'a' && f.to === 'b'));
    });
    it('unchanged → changed = false', () => {
      const a = def('x');
      const b = def('x');
      const result = diffCovenants(a, b);
      assert.strictEqual(result.changed, false);
      assert.strictEqual(result.fields.length, 0);
    });
  });

  describe('rollback', () => {
    it('rollback creates NEW version, version incremented, definition matches target', () => {
      const store = new CovenantPersistenceStore();
      const persistence = new CovenantPersistenceEngine(store);
      const history = new CovenantHistoryEngine(store);
      const rollback = new CovenantRollbackEngine(persistence, history);
      persistence.create(def('c1', { condition: 'v1' }));
      persistence.update(def('c1', { condition: 'v2' }));
      persistence.update(def('c1', { condition: 'v3' }));
      const record = rollback.rollbackToVersion('c1', 1);
      assert.strictEqual(record.version, 4);
      assert.strictEqual(record.action, 'UPDATE');
      const defs = persistence.getCurrentDefinitions();
      assert.strictEqual(defs.length, 1);
      assert.strictEqual(defs[0]!.condition, 'v1');
    });
  });

  describe('determinism', () => {
    it('same records → same history', () => {
      const store = new CovenantPersistenceStore();
      const persistence = new CovenantPersistenceEngine(store);
      persistence.create(def('c1'));
      persistence.update(def('c1', { name: 'N2' }));
      const history = new CovenantHistoryEngine(store);
      const h1 = history.getHistory('c1');
      const h2 = history.getHistory('c1');
      assert.strictEqual(h1.length, h2.length);
      assert.strictEqual(h1[1]!.definition.name, h2[1]!.definition.name);
    });
  });

  describe('integration: persistence → versioning → DSL → runtime', () => {
    it('getCurrentDefinitions → loadFromJSON → registry', () => {
      const store = new CovenantPersistenceStore();
      const persistence = new CovenantPersistenceEngine(store);
      const history = new CovenantHistoryEngine(store);
      persistence.create(def('a'));
      persistence.update(def('a', { condition: 'state.value < 500' }));
      const defs = persistence.getCurrentDefinitions();
      assert.strictEqual(defs.length, 1);
      const covenants = CovenantLoader.loadFromJSON(defs);
      const registry = new CovenantRegistry();
      for (const c of covenants) registry.register(c);
      assert.strictEqual(registry.getAll().length, 1);
      const latest = new CovenantHistoryQuery(history).getLatest('a');
      assert.strictEqual(latest?.definition.condition, 'state.value < 500');
    });
  });
});
