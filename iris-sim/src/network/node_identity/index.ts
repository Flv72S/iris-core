/**
 * Phase 13XX-A — Node Identity & Registration Layer.
 */

export type {
  NodeType,
  IdentityTrustLevel,
  NodeIdentity,
  NodeRegistrationStatus,
  NodeRegistration,
} from './node_identity_types.js';
export { isValidNodeType } from './node_identity_types.js';
export { NodeIdentityError, NodeIdentityErrorCode } from './node_identity_errors.js';
export { NodeIdentityRegistry } from './node_identity_registry.js';
export { NodeIdentityVerifier } from './node_identity_verifier.js';
export { NodeOnboardingService } from './node_onboarding_service.js';
export type {
  NodeIdentityEventKind,
  NodeIdentityEvent,
  NodeOnboardingServiceOptions,
} from './node_onboarding_service.js';
