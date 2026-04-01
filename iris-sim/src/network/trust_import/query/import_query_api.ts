/**
 * Microstep 10J — Governance Trust Import & Validation Engine. Import query API.
 */

import type { ImportWorkspace, ImportWorkspaceEntry } from '../types/trust_import_types.js';

/**
 * Get all imported packages from the workspace.
 */
export function getImportedPackages(workspace: ImportWorkspace): ImportWorkspaceEntry[] {
  return [...workspace.entries];
}

/**
 * Get a specific package by package_id.
 */
export function getImportedPackage(
  workspace: ImportWorkspace,
  package_id: string
): ImportWorkspaceEntry | null {
  const found = workspace.entries.find((e) => e.package_id === package_id);
  return found ?? null;
}

/**
 * Count packages that passed validation.
 */
export function countValidImports(workspace: ImportWorkspace): number {
  return workspace.entries.filter((e) => e.validated).length;
}
