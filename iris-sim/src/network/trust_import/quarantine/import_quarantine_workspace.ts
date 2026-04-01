/**
 * Microstep 10J — Governance Trust Import & Validation Engine. Import quarantine workspace.
 */

import type { ImportWorkspaceEntry, ImportWorkspace } from '../types/trust_import_types.js';

/**
 * Append-only workspace for imported packages. Entries are isolated and not modified after insert.
 */
export class ImportQuarantineWorkspace {
  private entriesList: ImportWorkspaceEntry[] = [];

  addEntry(entry: ImportWorkspaceEntry): void {
    this.entriesList.push(entry);
  }

  getEntries(): ImportWorkspaceEntry[] {
    return [...this.entriesList];
  }

  getEntry(package_id: string): ImportWorkspaceEntry | null {
    const found = this.entriesList.find((e) => e.package_id === package_id);
    return found ?? null;
  }

  /** Get workspace as readonly view. */
  getWorkspace(): ImportWorkspace {
    return Object.freeze({ entries: [...this.entriesList] });
  }
}
