/**
 * ExecutionReadinessEvaluator - C.4.C
 * Interfaccia per valutazione dichiarativa. Nessuna selezione globale, nessuna mutazione, nessun side-effect.
 */

import type { ActionPlanSnapshot } from '../action-plan/ActionPlanSnapshot';
import type { ExecutionSemanticSnapshot } from '../execution-semantics/ExecutionSemanticSnapshot';
import type { MessagingCapabilityRegistry } from '../capabilities/MessagingCapabilityRegistry';
import type { ExecutionReadinessVerdict } from './ExecutionReadinessVerdict';

export interface ExecutionReadinessEvaluator {
  readonly id: string;
  evaluate(
    planSnapshot: ActionPlanSnapshot,
    semanticsSnapshot: ExecutionSemanticSnapshot,
    capabilityRegistry: MessagingCapabilityRegistry
  ): readonly ExecutionReadinessVerdict[] | null;
}
