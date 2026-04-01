/**
 * Microstep 14Q — Identity & Governance Layer. Audit metadata enforcement.
 */

import type { Actor } from './governance_types.js';
import type { GovernanceAction } from './governance_types.js';

export interface EnrichedMetadata {
  readonly actor_id: string;
  readonly action: GovernanceAction;
  readonly timestamp: number;
  readonly source?: string;
  readonly note?: string;
}

/**
 * Enrich metadata with actor_id, action, and timestamp. Caller-supplied metadata is merged.
 */
export function enrichMetadata(
  metadata: Readonly<Record<string, unknown>> | undefined,
  actor: Actor,
  action: GovernanceAction,
): EnrichedMetadata {
  const base: EnrichedMetadata = Object.freeze({
    actor_id: actor.actor_id,
    action,
    timestamp: Date.now(),
  });
  if (metadata == null || Object.keys(metadata).length === 0) {
    return base;
  }
  const source = (metadata as { source?: string }).source;
  const note = (metadata as { note?: string }).note;
  return Object.freeze({
    ...base,
    ...(source != null ? { source } : {}),
    ...(note != null ? { note } : {}),
  });
}
