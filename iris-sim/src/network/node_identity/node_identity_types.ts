/**
 * Phase 13XX-A — Node Identity & Registration Layer. Types.
 */

export type NodeType =
  | 'HUMAN'
  | 'INTERNAL_SERVICE'
  | 'MICROSERVICE'
  | 'THIRD_PARTY_AI'
  | 'IOT_DEVICE'
  | 'AUTONOMOUS_AGENT';

export type IdentityTrustLevel = 'LOW' | 'MEDIUM' | 'HIGH';

const NODE_TYPES: readonly NodeType[] = [
  'HUMAN',
  'INTERNAL_SERVICE',
  'MICROSERVICE',
  'THIRD_PARTY_AI',
  'IOT_DEVICE',
  'AUTONOMOUS_AGENT',
];

export function isValidNodeType(value: string): value is NodeType {
  return NODE_TYPES.includes(value as NodeType);
}

/**
 * Identity represents what the node is. Immutable after creation.
 * node_id must be globally unique. No timestamps in identity.
 */
export interface NodeIdentity {
  readonly node_id: string;
  readonly node_type: NodeType;
  readonly provider: string;
  readonly public_key?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export type NodeRegistrationStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED';

/**
 * Registration represents participation state. ACTIVE = allowed in trust pipeline;
 * SUSPENDED = temporarily blocked; REVOKED = permanently blocked.
 */
export interface NodeRegistration {
  readonly identity: NodeIdentity;
  readonly registered_at: number;
  readonly status: NodeRegistrationStatus;
}
