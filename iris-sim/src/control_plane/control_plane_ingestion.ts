/**
 * Microstep 16D — Snapshot ingestion validation (contract-driven).
 */

import { validateObservabilitySnapshot } from '../observability/observability_invariants.js';
import type { IrisObservabilitySnapshot } from '../observability/observability_contract.js';

export type IngestResult = { ok: true } | { ok: false; reason: string };

export function validateIngestPayload(nodeId: string, snapshot: IrisObservabilitySnapshot): IngestResult {
  if (typeof nodeId !== 'string' || nodeId.length === 0) {
    return { ok: false, reason: 'nodeId required' };
  }
  if (snapshot.node.id !== nodeId) {
    return { ok: false, reason: 'snapshot.node.id mismatch' };
  }
  const v = validateObservabilitySnapshot(snapshot);
  if (!v.ok) {
    return { ok: false, reason: v.errors.join('; ') };
  }
  return { ok: true };
}
