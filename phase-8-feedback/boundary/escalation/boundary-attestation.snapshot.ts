/**
 * Phase 8.3 — Boundary Attestation Snapshot (types only from Phase 7; no runtime)
 */

import type { Phase7BoundaryReport } from '../../safety/checklist/safety-checklist.types';
import type { BoundaryEscalationEvent } from './boundary-escalation.types';

export interface BoundaryAttestationSnapshot {
  readonly escalationEvent: BoundaryEscalationEvent;
  readonly phase7BoundaryReport: Phase7BoundaryReport;
  readonly snapshotHash: string;
}

function hashString(s: string): string {
  if (typeof process !== 'undefined' && process.versions?.node) {
    const crypto = require('node:crypto');
    return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
  }
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

function stableStringifyReport(r: Phase7BoundaryReport): string {
  const keys = ['signalLayerIsolation', 'preferenceImmutability', 'learningInactive', 'phase7FullyCertified'] as const;
  return keys.map((k) => JSON.stringify(r[k])).join('\n');
}

function stableStringifySnapshotPayload(
  event: BoundaryEscalationEvent,
  report: Phase7BoundaryReport
): string {
  return event.deterministicHash + '\n' + stableStringifyReport(report);
}

export function createBoundaryAttestationSnapshot(
  escalationEvent: BoundaryEscalationEvent,
  boundaryReport: Phase7BoundaryReport
): BoundaryAttestationSnapshot {
  const payloadStr = stableStringifySnapshotPayload(escalationEvent, boundaryReport);
  const snapshotHash = hashString(payloadStr);
  return Object.freeze({
    escalationEvent,
    phase7BoundaryReport: boundaryReport,
    snapshotHash,
  });
}
