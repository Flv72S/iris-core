/**
 * Microstep 14M — Covenant Runtime & Event Engine. Append-only result store.
 */

import type { CovenantEvaluationReport } from '../covenants/index.js';

export interface StoredCovenantReport {
  readonly id: string;
  readonly timestamp: number;
  readonly report: CovenantEvaluationReport;
}

export class CovenantRuntimeStore {
  private readonly reports: StoredCovenantReport[] = [];

  append(stored: StoredCovenantReport): void {
    this.reports.push(stored);
  }

  getAll(): StoredCovenantReport[] {
    return [...this.reports];
  }
}
