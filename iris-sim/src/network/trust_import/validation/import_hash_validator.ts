/**
 * Microstep 10J — Governance Trust Import & Validation Engine. Hash validation.
 */

import type { GovernanceTrustExportPackage } from '../../trust_export/types/trust_export_types.js';
import { validateExportPackage } from '../../trust_export/validation/export_validation_engine.js';

/**
 * Validate package export hash (recompute and compare).
 */
export function validateExportHash(pkg: GovernanceTrustExportPackage): boolean {
  const result = validateExportPackage(pkg);
  return result.valid;
}
