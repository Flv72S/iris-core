/**
 * Microstep 10L — Governance Consensus Preparation Layer. Attestation registry.
 */

import type { GovernanceAttestation } from '../types/consensus_types.js';

/**
 * Append-only registry of governance attestations. No duplicate (node_id, snapshot_hash).
 */
export class AttestationRegistry {
  private attestations: GovernanceAttestation[] = [];
  private seen = new Set<string>();

  private key(snapshot_hash: string, node_id: string): string {
    return `${snapshot_hash}\0${node_id}`;
  }

  addAttestation(att: GovernanceAttestation): void {
    const k = this.key(att.snapshot_hash, att.node_id);
    if (this.seen.has(k)) return;
    this.seen.add(k);
    this.attestations.push(att);
  }

  getAttestations(snapshot_hash: string): GovernanceAttestation[] {
    return this.attestations.filter((a) => a.snapshot_hash === snapshot_hash);
  }

  getAllAttestations(): GovernanceAttestation[] {
    return [...this.attestations];
  }
}
