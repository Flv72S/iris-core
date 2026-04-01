/**
 * Step 8D — Governance Runtime Gate. Single point of verification before any AI action.
 */

import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import { computeAdaptationSnapshot } from '../../self_adaptation/engine/self_adaptation_engine.js';
import type { RuntimeActionRequest, RuntimeDecision } from '../types/runtime_types.js';
import { resolveRuntimeDecision } from '../decision/runtime_decision_resolver.js';

/**
 * Pipeline: Governance snapshot + enforcement → adaptation → runtime decision.
 */
export function evaluateRuntimeAction(
  request: RuntimeActionRequest,
  governanceSnapshot: GovernanceTierSnapshot,
  enforcement: PolicyEnforcementResult
): RuntimeDecision {
  const adaptation = computeAdaptationSnapshot(governanceSnapshot, enforcement);
  return resolveRuntimeDecision(request, adaptation);
}
