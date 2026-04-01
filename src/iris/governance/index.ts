/**
 * IRIS 10.0 — Governance & Control Plane
 * Configurazione runtime, registry, snapshot. Non decisionale; read-only osservabile.
 */

export type { IrisGovernanceModel, IrisGovernanceComponentState } from './IrisGovernanceModel';
export type { IrisGovernanceRegistry } from './IrisGovernanceRegistry';
export type { IrisGovernanceSnapshot } from './IrisGovernanceSnapshot';
export { IrisGovernanceEngine } from './IrisGovernanceEngine';

export type { IrisKillSwitchBinding, IrisKillSwitchSnapshot, IrisKillSwitchSnapshotEntry } from './binding';
export { IrisKillSwitchBinder } from './binding';

export type { IrisAuditEntry, IrisAuditEntryType, IrisAuditSnapshot, IrisAuditCollectorInput, IrisAuditCollectorOptions } from './audit';
export { IrisAuditCollector } from './audit';
