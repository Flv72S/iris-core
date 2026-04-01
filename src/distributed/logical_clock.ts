/**
 * 16F.6.B — Deterministic merge of event streams (commutative union + causal linear extension).
 */
import { mergeDeterministicUnion } from './merge_algebra';
import { validateNormalizedGlobalInput } from './event_validation';

import type { DistributedEvent, NormalizedGlobalInput } from './global_input';

export { mergeDeterministicUnion } from './merge_algebra';

/**
 * Commutative merge: `merge(A,B) === merge(B,A)` for identical canonical event sets.
 * Produces a `NormalizedGlobalInput` with empty `nodeConfigs` / `adminInputs` (events-only bundle).
 */
export function mergeEventStreams(
  eventsA: readonly DistributedEvent[],
  eventsB: readonly DistributedEvent[],
): NormalizedGlobalInput {
  const events = mergeDeterministicUnion(eventsA, eventsB);
  const normalized: NormalizedGlobalInput = Object.freeze({
    nodeConfigs: Object.freeze([]),
    adminInputs: Object.freeze([]),
    events: Object.freeze(events),
  });
  validateNormalizedGlobalInput(normalized);
  return normalized;
}
