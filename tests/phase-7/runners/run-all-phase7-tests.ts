/**
 * Run All Phase 7 Tests — Phase 7.V
 *
 * Esegue: tutti i domini, tutti i guardrail, tutti i kill-switch, replay completo.
 * Non esegue certificazione; costruisce il banco prova e verifica che l’infrastruttura funzioni.
 */

import { runExecutionHarness } from '../harness/execution-harness';
import { runReplay } from '../harness/replay-engine';
import { runDeterminismCheck } from '../harness/determinism-checker';
import { ALL_RESOLUTION_FIXTURES } from '../fixtures/resolution-states';
import { ALL_ACTION_INTENT_FIXTURES } from '../fixtures/action-intents';
import { ALL_KILL_SWITCH_SCENARIOS } from '../fixtures/kill-switch-scenarios';

const FIXED_NOW = new Date('2025-01-15T10:00:00.000Z').getTime();

type RunResult = { ok: boolean; message: string; detail?: unknown };

function runDomainTests(): RunResult[] {
  const results: RunResult[] = [];
  const allowed = ALL_RESOLUTION_FIXTURES.find((r) => r.resolvedState === 'ALLOWED');
  if (allowed == null) {
    results.push({ ok: false, message: 'No ALLOWED resolution fixture' });
    return results;
  }

  for (const intentFixture of ALL_ACTION_INTENT_FIXTURES) {
    try {
      const out = runExecutionHarness({
        resolution: allowed,
        intentFixture,
        nowMs: FIXED_NOW,
      });
      const ok = out.result.status === 'EXECUTED' || out.result.status === 'BLOCKED' || out.result.status === 'SKIPPED';
      results.push({
        ok,
        message: `Domain ${intentFixture.domain}/${intentFixture.type} → ${out.result.status}`,
        detail: out.result,
      });
    } catch (e) {
      results.push({ ok: false, message: `Domain ${intentFixture.domain} throw`, detail: e });
    }
  }
  return results;
}

function runKillSwitchTests(): RunResult[] {
  const results: RunResult[] = [];
  const allowed = ALL_RESOLUTION_FIXTURES.find((r) => r.resolvedState === 'ALLOWED');
  const intentFixture = ALL_ACTION_INTENT_FIXTURES[0];
  if (allowed == null || intentFixture == null) {
    results.push({ ok: false, message: 'Missing fixture for kill-switch' });
    return results;
  }

  for (const scenario of ALL_KILL_SWITCH_SCENARIOS) {
    try {
      const out = runExecutionHarness({
        resolution: allowed,
        intentFixture,
        killSwitch: scenario,
        nowMs: FIXED_NOW,
      });
      const expectedBlock = out.result.status === 'BLOCKED';
      results.push({
        ok: expectedBlock,
        message: `Kill-switch ${scenario.id} → ${out.result.status} (expect BLOCKED)`,
        detail: out.result,
      });
    } catch (e) {
      results.push({ ok: false, message: `Kill-switch ${scenario.id} throw`, detail: e });
    }
  }
  return results;
}

function runReplayTests(): RunResult[] {
  const results: RunResult[] = [];
  const allowed = ALL_RESOLUTION_FIXTURES.find((r) => r.resolvedState === 'ALLOWED');
  if (allowed == null) return results;

  for (const intentFixture of ALL_ACTION_INTENT_FIXTURES) {
    try {
      const originalOutput = runExecutionHarness({
        resolution: allowed,
        intentFixture,
        nowMs: FIXED_NOW,
      });
      const replayResult = runReplay({
        originalOutput,
        resolution: allowed,
        intentFixture,
        nowMs: FIXED_NOW,
      });
      results.push({
        ok: replayResult.identical,
        message: `Replay ${intentFixture.id} → identical=${replayResult.identical}`,
        detail: replayResult.diff,
      });
    } catch (e) {
      results.push({ ok: false, message: `Replay ${intentFixture.id} throw`, detail: e });
    }
  }
  return results;
}

export function runAllPhase7Tests(): { passed: number; failed: number; results: RunResult[] } {
  const results: RunResult[] = [
    ...runDomainTests(),
    ...runKillSwitchTests(),
    ...runReplayTests(),
  ];
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  return { passed, failed, results };
}

/** CLI entry when run as script (ts-node/tsx). */
function main(): void {
  const { passed, failed, results } = runAllPhase7Tests();
  console.log('Phase 7.V — Run all tests');
  console.log(`Passed: ${passed}, Failed: ${failed}`);
  results.forEach((r) => {
    console.log(`  [${r.ok ? 'OK' : 'FAIL'}] ${r.message}`);
    if (r.detail != null && !r.ok) console.log('    detail:', r.detail);
  });
  process.exit(failed > 0 ? 1 : 0);
}

if (typeof process !== 'undefined' && process.argv[1]?.includes('run-all-phase7-tests')) {
  main();
}
