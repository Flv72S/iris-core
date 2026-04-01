/**
 * Step 8F — Attestation serializer. JSON export for storage/transmission.
 */

import type { GovernanceAttestation } from '../types/attestation_types.js';

/**
 * Serialize attestation to JSON string. Enables export, API transmission, archiving.
 */
export function serializeAttestation(attestation: GovernanceAttestation): string {
  return JSON.stringify(attestation);
}
