/**
 * Microstep 14L — AI Covenant Monitoring Platform. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { Covenant, CovenantContext, CovenantResult } from '../index.js';
import type { ReplayResult } from '../../replay/index.js';
import { ReplayErrorType } from '../../replay/index.js';
import {
  CovenantEngine,
  CovenantRegistry,
  CovenantSeverity,
  CovenantExecutor,
  CovenantValidator,
} from '../index.js';

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

describe('AI Covenant Monitoring Platform (14L)', () => {
  describe('valid covenant', () => {
    it('all rules satisfied → valid = true', () => {
      const alwaysPass: Covenant = {
        id: 'always-pass',
        name: 'Always pass',
        validate(): CovenantResult {
          return { covenant_id: this.id, valid: true, violations: [] };
        },
      };
      const registry = new CovenantRegistry();
      registry.register(alwaysPass);
      const engine = new CovenantEngine(registry);
      const report = engine.evaluate(context());
      assert.strictEqual(report.valid, true);
      assert.strictEqual(report.violations.length, 0);
      assert.strictEqual(report.results.length, 1);
    });
  });

  describe('violation detection', () => {
    it('rule broken → violation returned', () => {
      const threshold = 10;
      const stateThreshold: Covenant = {
        id: 'state-threshold',
        name: 'State threshold',
        description: 'Accepted proposals count must not exceed threshold',
        validate(ctx): CovenantResult {
          const count = ctx.current_state.accepted_proposals.length;
          if (count > threshold) {
            return {
              covenant_id: this.id,
              valid: false,
              violations: [
                {
                  type: 'THRESHOLD_EXCEEDED',
                  message: `accepted_proposals length ${count} > ${threshold}`,
                  severity: CovenantSeverity.HIGH,
                },
              ],
            };
          }
          return { covenant_id: this.id, valid: true, violations: [] };
        },
      };
      const registry = new CovenantRegistry();
      registry.register(stateThreshold);
      const engine = new CovenantEngine(registry);

      const report = engine.evaluate(
        context({
          current_state: Object.freeze({
            ...emptyState,
            accepted_proposals: Object.freeze(Array.from({ length: 15 }, (_, i) => `p${i}`)),
            last_accepted_proposal_id: 'p14',
            last_expected_state_hash: null,
          }),
        }),
      );
      assert.strictEqual(report.valid, false);
      assert.strictEqual(report.violations.length, 1);
      assert.strictEqual(report.violations[0]!.type, 'THRESHOLD_EXCEEDED');
      assert.strictEqual(report.violations[0]!.severity, CovenantSeverity.HIGH);
    });
  });

  describe('multiple covenants', () => {
    it('multiple rules → aggregated results', () => {
      const a: Covenant = {
        id: 'a',
        name: 'A',
        validate(): CovenantResult {
          return { covenant_id: this.id, valid: true, violations: [] };
        },
      };
      const b: Covenant = {
        id: 'b',
        name: 'B',
        validate(): CovenantResult {
          return {
            covenant_id: this.id,
            valid: false,
            violations: [
              { type: 'B_VIOLATION', message: 'B failed', severity: CovenantSeverity.MEDIUM },
            ],
          };
        },
      };
      const registry = new CovenantRegistry();
      registry.register(a);
      registry.register(b);
      const engine = new CovenantEngine(registry);
      const report = engine.evaluate(context());
      assert.strictEqual(report.valid, false);
      assert.strictEqual(report.results.length, 2);
      assert.strictEqual(report.violations.length, 1);
      assert.strictEqual(report.violations[0]!.type, 'B_VIOLATION');
    });
  });

  describe('replay-based covenant', () => {
    it('invalid replay → violation', () => {
      const replayConsistency: Covenant = {
        id: 'replay-consistency',
        name: 'Replay consistency',
        validate(ctx): CovenantResult {
          if (ctx.replay_result == null) {
            return { covenant_id: this.id, valid: true, violations: [] };
          }
          if (!ctx.replay_result.valid) {
            return {
              covenant_id: this.id,
              valid: false,
              violations: [
                {
                  type: 'REPLAY_INVALID',
                  message: 'Replay validation failed',
                  severity: CovenantSeverity.CRITICAL,
                },
              ],
            };
          }
          return { covenant_id: this.id, valid: true, violations: [] };
        },
      };
      const registry = new CovenantRegistry();
      registry.register(replayConsistency);
      const engine = new CovenantEngine(registry);

      const invalidReplay: ReplayResult = {
        final_state: emptyState,
        final_hash: 'h',
        valid: false,
        errors: [{ type: ReplayErrorType.STATE_MISMATCH, message: 'm' }],
      };
      const report = engine.evaluate(context({ replay_result: invalidReplay }));
      assert.strictEqual(report.valid, false);
      assert.ok(report.violations.some((v) => v.type === 'REPLAY_INVALID'));
    });
  });

  describe('executor does not crash on throw', () => {
    it('covenant that throws → violation, not uncaught exception', () => {
      const throwing: Covenant = {
        id: 'throws',
        name: 'Throws',
        validate(): CovenantResult {
          throw new Error('Covenant threw');
        },
      };
      const results = CovenantExecutor.executeAll([throwing], context());
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0]!.valid, false);
      assert.strictEqual(results[0]!.violations.length, 1);
      assert.ok(results[0]!.violations[0]!.message.includes('Covenant threw'));
    });
  });

  describe('CovenantValidator', () => {
    it('validateResults: all valid → true', () => {
      const results: CovenantResult[] = [
        { covenant_id: '1', valid: true, violations: [] },
        { covenant_id: '2', valid: true, violations: [] },
      ];
      assert.strictEqual(CovenantValidator.validateResults(results), true);
    });
    it('validateResults: one invalid → false', () => {
      const results: CovenantResult[] = [
        { covenant_id: '1', valid: true, violations: [] },
        { covenant_id: '2', valid: false, violations: [{ type: 'X', message: 'm', severity: CovenantSeverity.LOW }] },
      ];
      assert.strictEqual(CovenantValidator.validateResults(results), false);
    });
  });

  describe('integration: consensus → state update → replay → covenant evaluation', () => {
    it('violations detected correctly', () => {
      const replayCovenant: Covenant = {
        id: 'replay-ok',
        name: 'Replay must be valid',
        validate(ctx): CovenantResult {
          if (ctx.replay_result && !ctx.replay_result.valid) {
            return {
              covenant_id: this.id,
              valid: false,
              violations: [
                { type: 'REPLAY_INVALID', message: 'Replay invalid', severity: CovenantSeverity.CRITICAL },
              ],
            };
          }
          return { covenant_id: this.id, valid: true, violations: [] };
        },
      };
      const stateCovenant: Covenant = {
        id: 'has-accepted',
        name: 'At least one accepted when consensus present',
        validate(ctx): CovenantResult {
          if (ctx.consensus_result?.accepted && ctx.current_state.accepted_proposals.length === 0) {
            return {
              covenant_id: this.id,
              valid: false,
              violations: [
                { type: 'STATE_INCONSISTENT', message: 'Consensus accepted but no accepted proposals', severity: CovenantSeverity.HIGH },
              ],
            };
          }
          return { covenant_id: this.id, valid: true, violations: [] };
        },
      };

      const registry = new CovenantRegistry();
      registry.register(replayCovenant);
      registry.register(stateCovenant);
      const engine = new CovenantEngine(registry);

      const invalidReplay: ReplayResult = {
        final_state: emptyState,
        final_hash: 'h',
        valid: false,
        errors: [],
      };
      const ctxInvalidReplay = context({
        consensus_result: { proposal_id: 'p1', accepted: true, quorum_reached: true, total_votes: 3 },
        current_state: emptyState,
        replay_result: invalidReplay,
      });
      const report1 = engine.evaluate(ctxInvalidReplay);
      assert.strictEqual(report1.valid, false);
      assert.ok(report1.violations.some((v) => v.type === 'REPLAY_INVALID'));

      const ctxConsensusAcceptedNoState = context({
        consensus_result: { proposal_id: 'p1', accepted: true, quorum_reached: true, total_votes: 3 },
        current_state: emptyState,
      });
      const report2 = engine.evaluate(ctxConsensusAcceptedNoState);
      assert.strictEqual(report2.valid, false);
      assert.ok(report2.violations.some((v) => v.type === 'STATE_INCONSISTENT'));

      const validReplay: ReplayResult = {
        final_state: emptyState,
        final_hash: 'h',
        valid: true,
        errors: [],
      };
      const ctxAllGood = context({
        consensus_result: { proposal_id: 'p1', accepted: true, quorum_reached: true, total_votes: 3 },
        current_state: Object.freeze({
          accepted_proposals: Object.freeze(['p1']),
          last_accepted_proposal_id: 'p1',
          last_expected_state_hash: null,
        }),
        replay_result: validReplay,
      });
      const report3 = engine.evaluate(ctxAllGood);
      assert.strictEqual(report3.valid, true);
      assert.strictEqual(report3.violations.length, 0);
    });
  });
});
