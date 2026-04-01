/**
 * Phase 13XX-A — Node Identity & Registration Layer. Onboarding.
 */

import type { NodeIdentity, NodeRegistration, IdentityTrustLevel } from './node_identity_types.js';
import { NodeIdentityRegistry } from './node_identity_registry.js';
import { NodeIdentityVerifier } from './node_identity_verifier.js';
import { NodeIdentityError, NodeIdentityErrorCode } from './node_identity_errors.js';

export type NodeIdentityEventKind = 'ONBOARDING' | 'SUSPENSION' | 'REVOCATION';

export interface NodeIdentityEvent {
  kind: NodeIdentityEventKind;
  registration?: NodeRegistration | undefined;
  node_id: string;
}

export interface NodeOnboardingServiceOptions {
  onEvent?: (event: NodeIdentityEvent) => void;
}

export class NodeOnboardingService {
  constructor(
    private readonly registry: NodeIdentityRegistry,
    private readonly verifier: NodeIdentityVerifier,
    private readonly options: NodeOnboardingServiceOptions = {}
  ) {}

  onboardNode(identity: NodeIdentity, level: IdentityTrustLevel, timestamp: number): void {
    this.verifier.verifyIdentity(identity, level);

    if (this.registry.getRegistration(identity.node_id) !== undefined) {
      throw new NodeIdentityError(
        `Node already registered: ${identity.node_id}`,
        NodeIdentityErrorCode.NODE_ALREADY_REGISTERED
      );
    }

    const registration: NodeRegistration = Object.freeze({
      identity: Object.freeze({ ...identity }),
      registered_at: timestamp,
      status: 'ACTIVE',
    });

    this.registry.setRegistration(registration);
    this.options.onEvent?.({
      kind: 'ONBOARDING',
      registration,
      node_id: identity.node_id,
    });
  }

  /** Convenience: suspend and emit event. */
  suspendNode(node_id: string): void {
    const registration = this.registry.getRegistration(node_id);
    this.registry.suspendNode(node_id);
    this.options.onEvent?.({
      kind: 'SUSPENSION',
      registration,
      node_id,
    });
  }

  /** Convenience: revoke and emit event. */
  revokeNode(node_id: string): void {
    const registration = this.registry.getRegistration(node_id);
    this.registry.revokeNode(node_id);
    this.options.onEvent?.({
      kind: 'REVOCATION',
      registration,
      node_id,
    });
  }
}
