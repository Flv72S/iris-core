/**
 * Microstep 10I — Governance Trust Export Engine. Export validation.
 */

import type {
  GovernanceTrustExportPackage,
  ExportValidationResult,
} from '../types/trust_export_types.js';
import { computeExportHash } from '../hashing/export_hash_engine.js';

/**
 * Validate package by recomputing export hash and comparing with package.export_hash.
 */
export function validateExportPackage(
  pkg: GovernanceTrustExportPackage
): ExportValidationResult {
  const recomputed_hash = computeExportHash(
    pkg.node_id,
    pkg.snapshot,
    pkg.trust_graph,
    pkg.policies,
    pkg.decisions,
    pkg.metadata,
    pkg.export_timestamp
  );
  const valid = recomputed_hash === pkg.export_hash;
  return Object.freeze({
    valid,
    recomputed_hash,
  });
}
