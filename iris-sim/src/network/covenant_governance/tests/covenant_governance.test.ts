/**
 * Microstep 14Q — Identity & Governance Layer. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CovenantPersistenceEngine } from '../../covenant_persistence/index.js';
import { CovenantPersistenceStore } from '../../covenant_persistence/index.js';
import { CovenantHistoryEngine } from '../../covenant_versioning/index.js';
import { CovenantRollbackEngine } from '../../covenant_versioning/index.js';
import {
  DEFAULT_POLICY,
  GovernedCovenantService,
  GovernanceEngine,
  GovernanceError,
  GovernanceErrorCode,
  enrichMetadata,
} from '../index.js';

function def(id: string): { id: string; name: string; enabled: boolean; severity: 'HIGH'; condition: string } {
  return { id, name: `C${id}`, enabled: true, severity: 'HIGH', condition: 'state.value < 100' };
}

const admin: { actor_id: string; roles: readonly ('ADMIN')[] } = { actor_id: 'admin-1', roles: ['ADMIN'] };
const operator: { actor_id: string; roles: readonly ('OPERATOR')[] } = { actor_id: 'op-1', roles: ['OPERATOR'] };
const auditor: { actor_id: string; roles: readonly ('AUDITOR')[] } = { actor_id: 'aud-1', roles: ['AUDITOR'] };

describe('Covenant Governance (14Q)', () => {
  describe('authorization', () => {
    it('ADMIN can all', () => {
      const engine = new GovernanceEngine([...DEFAULT_POLICY]);
      engine.authorize(admin, 'CREATE');
      engine.authorize(admin, 'UPDATE');
      engine.authorize(admin, 'DISABLE');
      engine.authorize(admin, 'ROLLBACK');
      engine.authorize(admin, 'READ');
    });

    it('OPERATOR cannot disable', () => {
      const engine = new GovernanceEngine([...DEFAULT_POLICY]);
      engine.authorize(operator, 'CREATE');
      engine.authorize(operator, 'READ');
      assert.throws(
        () => engine.authorize(operator, 'DISABLE'),
        (e: unknown) => e instanceof GovernanceError && e.code === GovernanceErrorCode.UNAUTHORIZED,
      );
      assert.throws(
        () => engine.authorize(operator, 'ROLLBACK'),
        (e: unknown) => e instanceof GovernanceError && e.code === GovernanceErrorCode.UNAUTHORIZED,
      );
    });

    it('AUDITOR read only', () => {
      const engine = new GovernanceEngine([...DEFAULT_POLICY]);
      engine.authorize(auditor, 'READ');
      for (const action of ['CREATE', 'UPDATE', 'DISABLE', 'ROLLBACK'] as const) {
        assert.throws(
          () => engine.authorize(auditor, action),
          (e: unknown) => e instanceof GovernanceError && e.code === GovernanceErrorCode.UNAUTHORIZED,
        );
      }
    });
  });

  describe('unauthorized access', () => {
    it('OPERATOR tries disable → throws', () => {
      const engine = new GovernanceEngine([...DEFAULT_POLICY]);
      assert.throws(
        () => engine.authorize(operator, 'DISABLE'),
        (e: unknown) => e instanceof GovernanceError && e.code === GovernanceErrorCode.UNAUTHORIZED,
      );
    });
  });

  describe('no roles', () => {
    it('actor.roles empty → error', () => {
      const engine = new GovernanceEngine([...DEFAULT_POLICY]);
      assert.throws(
        () => engine.authorize({ actor_id: 'x', roles: [] }, 'READ'),
        (e: unknown) => e instanceof GovernanceError && e.code === GovernanceErrorCode.NO_ROLES,
      );
    });
  });

  describe('metadata injection', () => {
    it('metadata contains actor_id, action, timestamp', () => {
      const out = enrichMetadata(undefined, admin, 'CREATE');
      assert.strictEqual(out.actor_id, 'admin-1');
      assert.strictEqual(out.action, 'CREATE');
      assert.ok(typeof out.timestamp === 'number' && out.timestamp > 0);
    });
    it('supplied metadata merged', () => {
      const out = enrichMetadata({ note: 'test' }, admin, 'UPDATE');
      assert.strictEqual(out.actor_id, 'admin-1');
      assert.strictEqual(out.action, 'UPDATE');
      assert.strictEqual((out as { note?: string }).note, 'test');
    });
  });

  describe('integration', () => {
    it('governed service → persistence append', () => {
      const store = new CovenantPersistenceStore();
      const persistence = new CovenantPersistenceEngine(store);
      const history = new CovenantHistoryEngine(store);
      const rollback = new CovenantRollbackEngine(persistence, history);
      const governance = new GovernanceEngine([...DEFAULT_POLICY]);
      const service = new GovernedCovenantService(governance, persistence, rollback);

      const record = service.create(admin, def('c1'));
      assert.ok(record.record_id);
      assert.strictEqual(store.getAll().length, 1);
      assert.strictEqual(store.getAll()[0]!.metadata?.actor_id, 'admin-1');
    });

    it('unauthorized → no append', () => {
      const store = new CovenantPersistenceStore();
      const persistence = new CovenantPersistenceEngine(store);
      const history = new CovenantHistoryEngine(store);
      const rollback = new CovenantRollbackEngine(persistence, history);
      const governance = new GovernanceEngine([...DEFAULT_POLICY]);
      const service = new GovernedCovenantService(governance, persistence, rollback);

      service.create(admin, def('c1'));
      assert.throws(
        () => service.disable(operator, 'c1'),
        (e: unknown) => e instanceof GovernanceError && e.code === GovernanceErrorCode.UNAUTHORIZED,
      );
      assert.strictEqual(store.getAll().length, 1);
    });

    it('getCurrentDefinitions requires READ', () => {
      const store = new CovenantPersistenceStore();
      const persistence = new CovenantPersistenceEngine(store);
      const history = new CovenantHistoryEngine(store);
      const rollback = new CovenantRollbackEngine(persistence, history);
      const governance = new GovernanceEngine([...DEFAULT_POLICY]);
      const service = new GovernedCovenantService(governance, persistence, rollback);
      service.create(admin, def('c1'));
      const defs = service.getCurrentDefinitions(auditor);
      assert.strictEqual(defs.length, 1);
      assert.throws(
        () => service.getCurrentDefinitions({ actor_id: 'no-role', roles: [] }),
        (e: unknown) => e instanceof GovernanceError && e.code === GovernanceErrorCode.NO_ROLES,
      );
    });
  });

  describe('invalid actor', () => {
    it('empty actor_id → INVALID_ACTOR', () => {
      const engine = new GovernanceEngine([...DEFAULT_POLICY]);
      assert.throws(
        () => engine.authorize({ actor_id: '', roles: ['ADMIN'] }, 'READ'),
        (e: unknown) => e instanceof GovernanceError && e.code === GovernanceErrorCode.INVALID_ACTOR,
      );
    });
  });
});
