/**
 * Microstep 10I — Governance Trust Export Engine. Export query API.
 */

import type { GovernanceTrustExportPackage, ExportMetadata } from '../types/trust_export_types.js';
import { validateExportPackage } from '../validation/export_validation_engine.js';

/**
 * Get the export hash of the package.
 */
export function getExportHash(pkg: GovernanceTrustExportPackage): string {
  return pkg.export_hash;
}

/**
 * Verify package integrity (recompute hash and compare).
 */
export function verifyExportPackage(pkg: GovernanceTrustExportPackage): boolean {
  const result = validateExportPackage(pkg);
  return result.valid;
}

/**
 * Get package metadata.
 */
export function getExportMetadata(pkg: GovernanceTrustExportPackage): ExportMetadata {
  return pkg.metadata;
}
