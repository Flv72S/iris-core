/**
 * Phase 13XX-A — Node Identity & Registration Layer. Registry.
 * O(1) lookup; deterministic ordering for listing.
 */

import type { NodeIdentity, NodeRegistration, NodeRegistrationStatus, NodeType } from './node_identity_types.js';
import { NodeIdentityError, NodeIdentityErrorCode } from './node_identity_errors.js';

export class NodeIdentityRegistry {
  private readonly byId = new Map<string, NodeRegistration>();

  registerNode(identity: NodeIdentity): void {
    if (this.byId.has(identity.node_id)) {
      throw new NodeIdentityError(
        `Node already registered: ${identity.node_id}`,
        NodeIdentityErrorCode.NODE_ALREADY_REGISTERED
      );
    }
    const registration: NodeRegistration = Object.freeze({
      identity: Object.freeze({ ...identity }),
      registered_at: 0,
      status: 'ACTIVE',
    });
    this.byId.set(identity.node_id, registration);
  }

  /** Store a full registration (used by onboarding with timestamp). */
  setRegistration(registration: NodeRegistration): void {
    this.byId.set(registration.identity.node_id, Object.freeze(registration));
  }

  getRegistration(node_id: string): NodeRegistration | undefined {
    return this.byId.get(node_id);
  }

  isActive(node_id: string): boolean {
    const r = this.byId.get(node_id);
    return r !== undefined && r.status === 'ACTIVE';
  }

  /** Deterministic order: by node_id. */
  listNodes(): NodeRegistration[] {
    const ids = [...this.byId.keys()].sort((a, b) => a.localeCompare(b));
    return ids.map((id) => this.byId.get(id)!);
  }

  getNodesByType(type: NodeType): NodeRegistration[] {
    return this.listNodes().filter((r) => r.identity.node_type === type);
  }

  suspendNode(node_id: string): void {
    const r = this.byId.get(node_id);
    if (r === undefined) {
      throw new NodeIdentityError(`Node not found: ${node_id}`, NodeIdentityErrorCode.NODE_NOT_FOUND);
    }
    this.byId.set(node_id, Object.freeze({ ...r, status: 'SUSPENDED' as NodeRegistrationStatus }));
  }

  revokeNode(node_id: string): void {
    const r = this.byId.get(node_id);
    if (r === undefined) {
      throw new NodeIdentityError(`Node not found: ${node_id}`, NodeIdentityErrorCode.NODE_NOT_FOUND);
    }
    this.byId.set(node_id, Object.freeze({ ...r, status: 'REVOKED' as NodeRegistrationStatus }));
  }

  size(): number {
    return this.byId.size;
  }
}
