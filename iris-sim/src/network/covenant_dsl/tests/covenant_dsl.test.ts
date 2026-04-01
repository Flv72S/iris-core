/**
 * Microstep 14N — Covenant DSL. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { CovenantContext } from '../../covenants/index.js';
import { CovenantRegistry } from '../../covenants/index.js';
import {
  CovenantCompiler,
  CovenantDSLError,
  CovenantDSLErrorCode,
  CovenantLoader,
  evaluate,
  parseCondition,
} from '../index.js';
import type { ConsensusLogEntry } from '../../consensus_log/index.js';
import type { ReplayResult } from '../../replay/index.js';
import { ReplayErrorType } from '../../replay/index.js';
import { EventBus } from '../../covenant_runtime/index.js';
import { CovenantRuntimeEngine } from '../../covenant_runtime/index.js';
import { CovenantRuntimeStore } from '../../covenant_runtime/index.js';

const emptyState = Object.freeze({
  accepted_proposals: [] as readonly string[],
  last_accepted_proposal_id: null as string | null,
  last_expected_state_hash: null as string | null,
});

function context(overrides: Partial<CovenantContext> = {}): CovenantContext {
  return Object.freeze({
    current_state: emptyState,
    ...overrides,
  });
}

describe('Covenant DSL (14N)', () => {
  describe('valid expression', () => {
    it('state.value < 1000 → true', () => {
      const ctx = context({
        current_state: Object.freeze({
          ...emptyState,
          accepted_proposals: Object.freeze(['p1', 'p2']),
          last_accepted_proposal_id: 'p2',
          last_expected_state_hash: null,
        }),
      });
      const result = evaluate('state.value < 1000', ctx);
      assert.strictEqual(result, true);
    });

    it('state.value >= 2 → true when count is 2', () => {
      const ctx = context({
        current_state: Object.freeze({
          accepted_proposals: Object.freeze(['a', 'b']),
          last_accepted_proposal_id: 'b',
          last_expected_state_hash: null,
        }),
      });
      assert.strictEqual(evaluate('state.value >= 2', ctx), true);
      assert.strictEqual(evaluate('state.value >= 3', ctx), false);
    });

    it('replay.valid → true when replay_result.valid is true', () => {
      const ctx = context({
        replay_result: {
          final_state: emptyState,
          final_hash: 'h',
          valid: true,
          errors: [],
        },
      });
      assert.strictEqual(evaluate('replay.valid', ctx), true);
    });

    it('log.length == 0 → true', () => {
      assert.strictEqual(evaluate('log.length == 0', context()), true);
    });
  });

  describe('invalid expression', () => {
    it('state..value → reject', () => {
      assert.throws(
        () => parseCondition('state..value'),
        (e: unknown) => e instanceof CovenantDSLError && e.code === CovenantDSLErrorCode.INVALID_SYNTAX,
      );
    });

    it('empty condition → reject', () => {
      assert.throws(
        () => parseCondition('  '),
        (e: unknown) => e instanceof CovenantDSLError && e.code === CovenantDSLErrorCode.INVALID_SYNTAX,
      );
    });

    it('unknown identifier → reject', () => {
      assert.throws(
        () => parseCondition('foo.bar == 1'),
        (e: unknown) => e instanceof CovenantDSLError && e.code === CovenantDSLErrorCode.UNKNOWN_IDENTIFIER,
      );
    });
  });

  describe('unsafe expression', () => {
    it('process.exit() → reject', () => {
      assert.throws(
        () => parseCondition('process.exit()'),
        (e: unknown) => e instanceof CovenantDSLError && (e.code === CovenantDSLErrorCode.UNSAFE_TOKEN || e.code === CovenantDSLErrorCode.UNKNOWN_IDENTIFIER),
      );
    });

    it('eval in identifier → reject', () => {
      assert.throws(
        () => parseCondition('eval.x'),
        (e: unknown) => e instanceof CovenantDSLError && e.code === CovenantDSLErrorCode.UNSAFE_TOKEN,
      );
    });
  });

  describe('compilation', () => {
    it('DSL → Covenant → validate()', () => {
      const def = {
        id: 'max_state_value',
        name: 'State Value Limit',
        description: 'Limit accepted proposals count',
        enabled: true,
        severity: 'HIGH' as const,
        condition: 'state.value < 1000',
      };
      const covenant = CovenantCompiler.compile(def);
      assert.strictEqual(covenant.id, 'max_state_value');
      const result = covenant.validate(context({
        current_state: Object.freeze({
          accepted_proposals: Object.freeze(['p1']),
          last_accepted_proposal_id: 'p1',
          last_expected_state_hash: null,
        }),
      }));
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.violations.length, 0);

      const failResult = covenant.validate(context({
        current_state: Object.freeze({
          accepted_proposals: Object.freeze(Array.from({ length: 1001 }, (_, i) => `p${i}`)),
          last_accepted_proposal_id: 'p1000',
          last_expected_state_hash: null,
        }),
      }));
      assert.strictEqual(failResult.valid, false);
      assert.strictEqual(failResult.violations.length, 1);
      assert.strictEqual(failResult.violations[0]!.type, 'DSL_CONDITION_FAILED');
    });

    it('enabled: false → always valid', () => {
      const def = {
        id: 'disabled',
        name: 'Disabled',
        enabled: false,
        severity: 'HIGH' as const,
        condition: 'state.value > 99999',
      };
      const covenant = CovenantCompiler.compile(def);
      const result = covenant.validate(context());
      assert.strictEqual(result.valid, true);
    });
  });

  describe('integration: DSL → load → registry → runtime → violation', () => {
    it('load definitions, register, emit event, violation detected', () => {
      const definitions = [
        {
          id: 'replay_must_be_valid',
          name: 'Replay valid',
          enabled: true,
          severity: 'CRITICAL' as const,
          condition: 'replay.valid',
        },
      ];
      const covenants = CovenantLoader.loadFromJSON(definitions);
      const registry = new CovenantRegistry();
      for (const c of covenants) registry.register(c);

      const eventBus = new EventBus();
      const store = new CovenantRuntimeStore();
      const invalidReplay: ReplayResult = {
        final_state: emptyState,
        final_hash: 'h',
        valid: false,
        errors: [{ type: ReplayErrorType.STATE_MISMATCH, message: 'm' }],
      };
      const deps = {
        getState: () => emptyState,
        getLog: (): readonly ConsensusLogEntry[] => [],
        replay: () => invalidReplay,
      };
      const engine = new CovenantRuntimeEngine(registry, eventBus, store, deps);
      engine.start();

      let violations: unknown = null;
      eventBus.subscribe('COVENANT_VIOLATION', (event) => {
        violations = event.payload;
      });

      eventBus.emit({ type: 'MANUAL_TRIGGER', timestamp: Date.now() });

      assert.ok(violations != null);
      const list = violations as readonly { type: string }[];
      assert.ok(list.some((v) => v.type === 'DSL_CONDITION_FAILED'));
      assert.strictEqual(store.getAll().length, 1);
    });
  });
});
