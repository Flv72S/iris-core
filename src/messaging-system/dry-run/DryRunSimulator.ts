/**
 * DryRunSimulator - C.4.D
 * Interfaccia per simulazione dichiarativa. Nessuna selezione reale, nessuna mutazione, nessun side-effect.
 */

import type { ActionPlanSnapshot } from '../action-plan/ActionPlanSnapshot';
import type { ExecutionSemanticSnapshot } from '../execution-semantics/ExecutionSemanticSnapshot';
import type { ExecutionReadinessSnapshot } from '../execution-readiness/ExecutionReadinessSnapshot';
import type { MessagingCapabilityRegistry } from '../capabilities/MessagingCapabilityRegistry';
import type { DryRunResult } from './DryRunResult';

export interface DryRunSimulator {
  readonly id: string;
  simulate(
    planSnapshot: ActionPlanSnapshot,
    semanticsSnapshot: ExecutionSemanticSnapshot,
    readinessSnapshot: ExecutionReadinessSnapshot,
    capabilityRegistry: MessagingCapabilityRegistry
  ): readonly DryRunResult[] | null;
}
