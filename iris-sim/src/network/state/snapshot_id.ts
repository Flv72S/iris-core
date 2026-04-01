/**
 * Phase 14B — Snapshot Engine. Deterministic snapshot ID.
 */

import { createHash } from 'node:crypto';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

export class SnapshotID {
  /** Deterministic: SHA256(state_hash + ":" + author_node + ":" + timestamp). */
  static generate(state_hash: string, author_node: string, timestamp: number): string {
    const payload = state_hash + ':' + author_node + ':' + String(timestamp);
    return sha256Hex(payload);
  }
}
