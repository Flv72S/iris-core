/**
 * Step 8F — Governance Attestation Layer. Verifiable attestation of IRIS decisions.
 * Phase 12E — Execution Result Attestation. Provable execution proofs and signatures.
 */

export type { GovernanceAttestation } from './types/attestation_types.js';
export { buildGovernanceAttestation } from './builder/attestation_builder.js';
export { verifyGovernanceAttestation } from './verifier/attestation_verifier.js';
export { serializeAttestation } from './serializer/attestation_serializer.js';

// Phase 12E — Execution Result Attestation
export type { ExecutionProof, ExecutionAttestation } from './execution_attestation_types.js';
export { computeExecutionResultHash, generateExecutionProof } from './execution_attestation_engine.js';
export {
  signExecutionProof,
  verifyExecutionAttestation,
  createAttestationFromRecord,
} from './execution_signature.js';
