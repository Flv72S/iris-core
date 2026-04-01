/**
 * IrisAuditSnapshot — IRIS 10.0.2
 * Fotografia immutabile dello stato IRIS. Serializzabile, firmabile. Object.freeze.
 */

import type { IrisAuditEntry } from './IrisAuditEntry';

export interface IrisAuditSnapshot {
  readonly entries: readonly IrisAuditEntry[];
  readonly governanceVersion?: string;
  readonly derivedAt: string;
  readonly snapshotHash?: string;
}
