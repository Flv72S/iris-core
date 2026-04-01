/**
 * Kill-Switch During Execution — Phase 7.V+ Failure Injection
 *
 * Attivazione kill-switch a metà esecuzione; verifica stop immediato e audit append-only.
 */

import type { ExecutionKillSwitchRegistry } from '../../../../src/core/execution/kill-switch/ExecutionKillSwitch';
import { triggerGlobalStop } from '../../../../src/core/execution/killswitch-propagation';

export type KillSwitchDuringExecutionResult = {
  readonly stoppedImmediately: boolean;
  readonly lastResultStatus: 'BLOCKED' | 'EXECUTED' | 'SKIPPED';
  readonly auditAppendOnly: boolean;
};

export function runKillSwitchDuringExecutionScenario(
  registry: ExecutionKillSwitchRegistry,
  runWithRegistry: (reg: ExecutionKillSwitchRegistry) => { result: { status: string }; auditLength: number }
): KillSwitchDuringExecutionResult {
  const out1 = runWithRegistry(registry);
  const len1 = out1.auditLength;

  triggerGlobalStop(registry);

  const out2 = runWithRegistry(registry);
  const len2 = out2.auditLength;

  return Object.freeze({
    stoppedImmediately: out2.result.status === 'BLOCKED',
    lastResultStatus: out2.result.status as 'BLOCKED' | 'EXECUTED' | 'SKIPPED',
    auditAppendOnly: len2 >= len1,
  });
}
