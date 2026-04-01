/**
 * Step 10C — Cross-Node Governance Verification Engine.
 */

export * from './types/cross_node_verification_types.js';
export { verifyCrossNodeCertificate } from './engine/cross_node_verification_engine.js';
export { validateIssuingNodeIdentity } from './validation/node_identity_validation.js';
export {
  storeVerifiedCertificate,
  type StoreVerifiedCertificateOutcome,
} from './integration/registry_integration.js';
