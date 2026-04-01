import { createHash } from 'node:crypto';
import type { ConsensusLogEntry } from './log_entry.js';
import { serializeEntry } from './log_serializer.js';

function computeHash(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Hash format (ready for hash chain):
 * hash = H(id + type + timestamp + payload + previous_hash)
 *
 * We compute the hash over a deterministic JSON representation of:
 * { id, type, timestamp, payload, previous_hash }
 */
export function computeEntryHash(entry: Omit<ConsensusLogEntry, 'hash'>): string {
  // serializeEntry is deterministic (stable ordering, no undefined object fields)
  const canonical = serializeEntry(entry as unknown as ConsensusLogEntry);
  return computeHash(canonical);
}

