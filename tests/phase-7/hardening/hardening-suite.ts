/**
 * Hardening Suite — Phase 7.V+
 *
 * Esegue tutte le verifiche: determinismo forte, failure injection, phase boundary.
 * readyForCertification === true solo se deterministic && failuresHandled && boundariesRespected.
 */

import { runExecutionHarness } from '../harness/execution-harness';
import { runReplay } from '../harness/replay-engine';
import { RESOLVED_ALLOWED } from '../fixtures/resolution-states';
import { FOCUS_NOTIFICATION } from '../fixtures/action-intents';
import { createSharedRegistry } from '@/core/execution/killswitch-propagation';
import { compareAuditSnapshots } from './determinism/deep-structural-compare';
import { verifyAuditHashConsistency } from './determinism/audit-hash';
import { assertNoSideEffectViolations } from './determinism/side-effect-detector';
import { runKillSwitchDuringExecutionScenario } from './failure-injection/kill-switch-during-execution';
import { runCorruptedAuditReplayScenario, corruptAuditSnapshot } from './failure-injection/corrupted-audit-replay';
import { assertNoSignalLayerWrites } from './phase-boundary/signal-layer-write-detector';
import { assertNoPreferenceMutations } from './phase-boundary/preference-mutation-detector';
import { assertNoLearningActivation } from './phase-boundary/learning-activation-detector';
import { freezeClock, frozenNowMs, resetFrozenClock } from './time/frozen-clock';

export type HardeningReport = {
  readonly deterministic: boolean;
  readonly failuresHandled: boolean;
  readonly boundariesRespected: boolean;
  readonly readyForCertification: boolean;
  readonly details?: {
    readonly determinismDiff?: unknown;
    readonly auditHashConsistent?: boolean;
    readonly sideEffectViolations?: readonly unknown[];
    readonly killSwitchStopped?: boolean;
    readonly corruptedAuditDetected?: boolean;
    readonly signalLayerViolations?: readonly unknown[];
    readonly preferenceViolations?: readonly unknown[];
    readonly learningViolations?: readonly unknown[];
  };
};

const FIXED_SEED = '2025-01-15T10:00:00.000Z';

function runDeterminismChecks(): { ok: boolean; diff?: unknown; hashConsistent?: boolean } {
  resetFrozenClock();
  freezeClock(FIXED_SEED);
  const now = frozenNowMs(FIXED_SEED);

  const out1 = runExecutionHarness({
    resolution: RESOLVED_ALLOWED,
    intentFixture: FOCUS_NOTIFICATION,
    nowMs: now,
  });

  const out2 = runExecutionHarness({
    resolution: RESOLVED_ALLOWED,
    intentFixture: FOCUS_NOTIFICATION,
    nowMs: now,
  });

  const diff = compareAuditSnapshots(out1.auditSnapshot, out2.auditSnapshot);
  const hashConsistent = verifyAuditHashConsistency(out1.auditSnapshot, out2.auditSnapshot);
  const ok = diff == null && hashConsistent;
  resetFrozenClock();
  return { ok, diff: diff ?? undefined, hashConsistent };
}

function runReplayConsistency(): boolean {
  resetFrozenClock();
  freezeClock(FIXED_SEED);
  const now = frozenNowMs(FIXED_SEED);

  const originalOutput = runExecutionHarness({
    resolution: RESOLVED_ALLOWED,
    intentFixture: FOCUS_NOTIFICATION,
    nowMs: now,
  });
  const replayResult = runReplay({
    originalOutput,
    resolution: RESOLVED_ALLOWED,
    intentFixture: FOCUS_NOTIFICATION,
    nowMs: now,
  });
  resetFrozenClock();
  return replayResult.identical;
}

function runFailureInjectionChecks(): {
  ok: boolean;
  killSwitchStopped?: boolean;
  corruptedAuditDetected?: boolean;
} {
  const now = new Date(FIXED_SEED).getTime();
  const registry = createSharedRegistry();

  const killSwitchResult = runKillSwitchDuringExecutionScenario(registry, (reg) => {
    const o = runExecutionHarness({
      resolution: RESOLVED_ALLOWED,
      intentFixture: FOCUS_NOTIFICATION,
      registry: reg,
      nowMs: now,
    });
    return { result: o.result, auditLength: o.auditSnapshot.length };
  });

  const outForCorrupt = runExecutionHarness({
    resolution: RESOLVED_ALLOWED,
    intentFixture: FOCUS_NOTIFICATION,
    nowMs: now,
  });
  const corrupted = corruptAuditSnapshot(
    outForCorrupt.auditSnapshot,
    0,
    Object.freeze({ status: 'BLOCKED' as const, reason: 'corrupted' })
  );
  const corruptResult = runCorruptedAuditReplayScenario(outForCorrupt.auditSnapshot, corrupted);

  const ok =
    killSwitchResult.stoppedImmediately &&
    killSwitchResult.auditAppendOnly &&
    corruptResult.mismatchDetected;

  return {
    ok,
    killSwitchStopped: killSwitchResult.stoppedImmediately,
    corruptedAuditDetected: corruptResult.mismatchDetected,
  };
}

function runPhaseBoundaryChecks(): {
  ok: boolean;
  signal?: readonly unknown[];
  preference?: readonly unknown[];
  learning?: readonly unknown[];
} {
  const signal = assertNoSignalLayerWrites();
  const preference = assertNoPreferenceMutations();
  const learning = assertNoLearningActivation();
  const ok = signal.ok && preference.ok && learning.ok;
  return {
    ok,
    signal: signal.violations,
    preference: preference.violations,
    learning: learning.violations,
  };
}

/**
 * Esegue l'intera hardening suite e produce il report.
 */
export function runHardeningSuite(): HardeningReport {
  const determinism = runDeterminismChecks();
  const replayOk = runReplayConsistency();
  const deterministic = determinism.ok && replayOk;

  const failures = runFailureInjectionChecks();
  const failuresHandled = failures.ok;

  const boundaries = runPhaseBoundaryChecks();
  const boundariesRespected = boundaries.ok;

  const sideEffect = assertNoSideEffectViolations();

  const readyForCertification =
    deterministic && failuresHandled && boundariesRespected && sideEffect.ok;

  return Object.freeze({
    deterministic,
    failuresHandled,
    boundariesRespected,
    readyForCertification,
    details: Object.freeze({
      determinismDiff: determinism.diff,
      auditHashConsistent: determinism.hashConsistent,
      sideEffectViolations: sideEffect.violations,
      killSwitchStopped: failures.killSwitchStopped,
      corruptedAuditDetected: failures.corruptedAuditDetected,
      signalLayerViolations: boundaries.signal,
      preferenceViolations: boundaries.preference,
      learningViolations: boundaries.learning,
    }),
  });
}
