/**
 * Phase 13XX-C — Node Passport System. Registry.
 * O(1) lookup by node_id; deterministic listing.
 */

import type { NodeIdentity, NodeRegistration } from '../node_identity/index.js';
import type { NodePassport } from './node_passport_types.js';
import { NodePassportRecord } from './node_passport.js';

export class NodePassportRegistry {
  private readonly byId = new Map<string, NodePassportRecord>();

  createPassport(
    identity: NodeIdentity,
    registration: NodeRegistration,
    timestamp: number
  ): NodePassportRecord {
    const node_id = identity.node_id;
    if (this.byId.has(node_id)) {
      const existing = this.byId.get(node_id)!;
      return existing;
    }
    const passport: NodePassport = Object.freeze({
      node_id,
      identity: Object.freeze({ ...identity }),
      registration: Object.freeze({ ...registration }),
      trust_score: 0,
      reputation_score: 0,
      anomaly_count: 0,
      governance_flags: Object.freeze([]),
      created_at: timestamp,
      updated_at: timestamp,
    });
    const record = new NodePassportRecord(passport);
    this.byId.set(node_id, record);
    return record;
  }

  getPassport(node_id: string): NodePassportRecord | undefined {
    return this.byId.get(node_id);
  }

  /** Deterministic order: by node_id. */
  listPassports(): NodePassportRecord[] {
    const ids = [...this.byId.keys()].sort((a, b) => a.localeCompare(b));
    return ids.map((id) => this.byId.get(id)!);
  }

  updatePassport(passport: NodePassportRecord): void {
    const node_id = passport.passport.node_id;
    this.byId.set(node_id, passport);
  }

  size(): number {
    return this.byId.size;
  }
}
