import crypto from 'node:crypto';

import { canonicalSerialize } from './deterministic_utils';
import type { StoredDecision } from '../persistence/file_store';

export type AuditProof = {
  canonicalEventHash: string;
  decisionSequenceHash: string;
  replayStateHash: string;
};

function sha256Hex(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

export function buildAuditProof(
  orderedJournal: readonly StoredDecision[],
  replayState: unknown,
): AuditProof {
  const orderedEvents = orderedJournal.map((x) => x.decision);
  const orderedIds = orderedJournal.map((x) => x.decisionId);
  return Object.freeze({
    canonicalEventHash: sha256Hex(canonicalSerialize(orderedEvents)),
    decisionSequenceHash: sha256Hex(canonicalSerialize(orderedIds)),
    replayStateHash: sha256Hex(canonicalSerialize(replayState)),
  });
}
