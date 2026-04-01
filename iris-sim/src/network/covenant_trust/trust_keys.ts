/**
 * Microstep 14T — Advanced Trust & Federation. Key management types.
 */

export interface NodeKey {
  readonly node_id: string;
  readonly public_key: string;
  readonly key_id: string;
  readonly created_at: number;
  readonly revoked?: boolean;
  /** Optional: when revoked, used to keep historical signatures valid. */
  readonly revoked_at?: number;
}

