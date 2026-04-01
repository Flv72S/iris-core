/**
 * Phase 14A — State Model Definition. Versioning and metadata.
 */

export type StateVersion = number;

/** Vector clock: node_id -> logical version. Enables detection of concurrent updates. */
export interface StateVectorClock {
  [node_id: string]: number;
}

export interface StateMetadata {
  readonly version: StateVersion;
  readonly vector_clock: StateVectorClock;
  readonly timestamp: number;
  readonly author_node: string;
}
