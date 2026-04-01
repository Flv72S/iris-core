/**
 * Microstep 10J — Governance Trust Import & Validation Engine. Types.
 */

import type { GovernanceTrustExportPackage } from '../../trust_export/types/trust_export_types.js';

export interface GovernanceTrustImportResult {
  readonly package_id: string;
  readonly valid: boolean;
  readonly validation_errors: readonly string[];
}

export interface ImportWorkspaceEntry {
  readonly package_id: string;
  readonly pkg: GovernanceTrustExportPackage;
  readonly validated: boolean;
  readonly timestamp: number;
}

export interface ImportWorkspace {
  readonly entries: readonly ImportWorkspaceEntry[];
}
