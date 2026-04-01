/**
 * Microstep 10J — Governance Trust Import & Validation Engine. Trust import engine.
 */

import type { GovernanceTrustExportPackage } from '../../trust_export/types/trust_export_types.js';
import type { GovernanceTrustImportResult, ImportWorkspaceEntry } from '../types/trust_import_types.js';
import { validateExportHash } from '../validation/import_hash_validator.js';
import { validateSnapshotConsistency } from '../validation/snapshot_validator.js';
import { validatePolicies } from '../validation/policy_validator.js';
import { validateTrustGraph } from '../validation/trust_graph_validator.js';

export interface ImportWorkspaceLike {
  addEntry(entry: ImportWorkspaceEntry): void;
}

/**
 * Import a governance package: run all validations and add to workspace. Does not modify local state.
 */
export function importGovernancePackage(
  pkg: GovernanceTrustExportPackage,
  workspace: ImportWorkspaceLike
): GovernanceTrustImportResult {
  const errors: string[] = [];
  const package_id = pkg.export_hash;

  if (!validateExportHash(pkg)) {
    errors.push('export_hash_invalid');
  }
  if (!validateSnapshotConsistency(pkg.snapshot)) {
    errors.push('snapshot_inconsistent');
  }
  if (!validatePolicies(pkg.policies)) {
    errors.push('policies_invalid');
  }
  if (!validateTrustGraph(pkg.trust_graph)) {
    errors.push('trust_graph_invalid');
  }

  const valid = errors.length === 0;
  const entry: ImportWorkspaceEntry = Object.freeze({
    package_id,
    pkg,
    validated: valid,
    timestamp: Date.now(),
  });

  workspace.addEntry(entry);

  return Object.freeze({
    package_id,
    valid,
    validation_errors: errors,
  });
}
