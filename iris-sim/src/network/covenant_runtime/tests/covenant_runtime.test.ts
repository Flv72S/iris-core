/**
 * Microstep 14M — Covenant Runtime & Event Engine. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { Covenant, CovenantContext, CovenantResult } from '../../covenants/index.js';
import { CovenantRegistry, CovenantSeverity } from '../../covenants/index.js';
import type { ConsensusLogEntry } from '../../consensus_log/index.js';
import type { ReplayResult } from '../../replay/index.js';
import {
  CovenantRuntimeEngine,
  CovenantRuntimeStore,
  EventBus,
  RuntimeContextBuilder,
  RuntimeScheduler,
} from '../index.js';

const emptyState = Object.freeze({
  accepted_proposals: [] as readonly string[],
  last_accepted_proposal_id: null as string | null,
  last_expected_state_hash: null as string | null,
});

const validReplayResult: ReplayResult = {
  final_state: emptyState,
  final_hash: 'h',
  valid: true,
  errors: [],
};

function defaultDeps() {
  return {
    getState: () => emptyState,
    getLog: (): readonly ConsensusLogEntry[] => [],
    replay: () => validReplayResult,
  };
}

describe('Covenant Runtime & Event Engine (14M)', () => {
  describe('event trigger', () => {
    it('emit event → evaluation executed', () => {
      const eventBus = new EventBus();
      const store = new CovenantRuntimeStore();
      const registry = new CovenantRegistry();
      const engine = new CovenantRuntimeEngine(registry, eventBus, store, defaultDeps());
      engine.start();

      eventBus.emit({ type: 'MANUAL_TRIGGER', timestamp: Date.now() });

      const all = store.getAll();
      assert.strictEqual(all.length, 1);
      assert.ok(all[0]!.report.evaluated_at > 0);
    });
  });

  describe('persistence', () => {
    it('evaluation → stored correctly', () => {
      const eventBus = new EventBus();
      const store = new CovenantRuntimeStore();
      const registry = new CovenantRegistry();
      const alwaysPass: Covenant = {
        id: 'p',
        name: 'Pass',
        validate(): CovenantResult {
          return { covenant_id: this.id, valid: true, violations: [] };
        },
      };
      registry.register(alwaysPass);
      const engine = new CovenantRuntimeEngine(registry, eventBus, store, defaultDeps());
      engine.start();

      eventBus.emit({ type: 'STATE_UPDATED', timestamp: Date.now() });

      const all = store.getAll();
      assert.strictEqual(all.length, 1);
      assert.strictEqual(all[0]!.report.valid, true);
      assert.strictEqual(all[0]!.report.results.length, 1);
      assert.ok(typeof all[0]!.id === 'string' && all[0]!.id.length > 0);
    });
  });

  describe('violation event', () => {
    it('violation → COVENANT_VIOLATION event emitted', () => {
      const eventBus = new EventBus();
      const store = new CovenantRuntimeStore();
      const registry = new CovenantRegistry();
      const failing: Covenant = {
        id: 'fail',
        name: 'Fail',
        validate(): CovenantResult {
          return {
            covenant_id: this.id,
            valid: false,
            violations: [
              { type: 'TEST_VIOLATION', message: 'expected', severity: CovenantSeverity.HIGH },
            ],
          };
        },
      };
      registry.register(failing);
      const engine = new CovenantRuntimeEngine(registry, eventBus, store, defaultDeps());
      engine.start();

      let received: unknown = null;
      eventBus.subscribe('COVENANT_VIOLATION', (event) => {
        received = event.payload;
      });

      eventBus.emit({ type: 'MANUAL_TRIGGER', timestamp: Date.now() });

      assert.ok(received != null);
      const violations = received as readonly { type: string; message: string }[];
      assert.strictEqual(violations.length, 1);
      assert.strictEqual(violations[0]!.type, 'TEST_VIOLATION');
    });
  });

  describe('scheduler', () => {
    it('interval → repeated execution', () => {
      const scheduler = new RuntimeScheduler();
      let count = 0;
      scheduler.start(5, () => {
        count++;
      });
      return new Promise<void>((resolve) => {
        const t = setTimeout(() => {
          scheduler.stop();
          assert.ok(count >= 2, `expected at least 2 ticks, got ${count}`);
          resolve();
        }, 25);
        if (typeof t.unref === 'function') t.unref();
      });
    });
  });

  describe('RuntimeContextBuilder', () => {
    it('builds context with consensus payload for CONSENSUS_COMPLETED', () => {
      const deps = defaultDeps();
      const event = {
        type: 'CONSENSUS_COMPLETED' as const,
        payload: { proposal_id: 'p1', accepted: true, quorum_reached: true, total_votes: 3 },
        timestamp: 1000,
      };
      const ctx = RuntimeContextBuilder.build(event, deps);
      assert.strictEqual(ctx.consensus_result?.proposal_id, 'p1');
      assert.strictEqual(ctx.replay_result?.valid, true);
      assert.strictEqual((ctx.metadata as { eventType: string }).eventType, 'CONSENSUS_COMPLETED');
    });
  });

  describe('integration: consensus → runtime → violation detection', () => {
    it('consensus completed with inconsistent state → violation emitted', () => {
      const eventBus = new EventBus();
      const store = new CovenantRuntimeStore();
      const registry = new CovenantRegistry();
      const consistencyCovenant: Covenant = {
        id: 'consistency',
        name: 'Consensus accepted must reflect in state',
        validate(ctx: CovenantContext): CovenantResult {
          if (ctx.consensus_result?.accepted && ctx.current_state.accepted_proposals.length === 0) {
            return {
              covenant_id: this.id,
              valid: false,
              violations: [
                { type: 'STATE_INCONSISTENT', message: 'Accepted but no proposals', severity: CovenantSeverity.HIGH },
              ],
            };
          }
          return { covenant_id: this.id, valid: true, violations: [] };
        },
      };
      registry.register(consistencyCovenant);

      const deps = defaultDeps();
      const engine = new CovenantRuntimeEngine(registry, eventBus, store, deps);
      engine.start();

      let violationPayload: unknown = null;
      eventBus.subscribe('COVENANT_VIOLATION', (event) => {
        violationPayload = event.payload;
      });

      eventBus.emit({
        type: 'CONSENSUS_COMPLETED',
        payload: { proposal_id: 'p1', accepted: true, quorum_reached: true, total_votes: 3 },
        timestamp: Date.now(),
      });

      assert.ok(violationPayload != null);
      const violations = violationPayload as readonly { type: string }[];
      assert.ok(violations.some((v) => v.type === 'STATE_INCONSISTENT'));
      assert.strictEqual(store.getAll().length, 1);
    });
  });
});
