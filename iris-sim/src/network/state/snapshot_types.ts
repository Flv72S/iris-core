/**
 * Phase 14B — Snapshot Engine. Snapshot data model.
 */

import type { StateHashRoot } from './state_hash.js';
import type { StateVectorClock } from './state_types.js';

export interface StateSnapshot {
  readonly snapshot_id: string;
  readonly state_hash_root: StateHashRoot;
  readonly vector_clock: StateVectorClock;
  readonly author_node: string;
  readonly created_at: number;
  readonly compressed: boolean;
  readonly payload: string;
  readonly signature?: string | undefined;
}
