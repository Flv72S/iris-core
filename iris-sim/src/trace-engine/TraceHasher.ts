/**
 * S-0 — Deterministic SHA-256 over ordered trace entries.
 */

import { createHash } from 'crypto';
import type { TraceEntry } from './TraceTypes.js';

const SEP = '\n';

function canonicalLine(entry: TraceEntry): string {
  return [
    entry.tick,
    entry.eventId,
    String(entry.executionOrderIndex),
    entry.rngStateHash,
    entry.clockSnapshotHash,
  ].join('\t');
}

export class TraceHasher {
  static hashEntries(entries: readonly TraceEntry[]): string {
    const lines = entries.map(canonicalLine).join(SEP);
    return createHash('sha256').update(lines, 'utf8').digest('hex');
  }
}
