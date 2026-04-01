/**
 * Step 6E — Governance hardening: invariant types and engine.
 */

export type {
  FormalInvariantResult,
  HardeningAuditReport,
  DynamicsSnapshot,
  HardeningInvariantConfig,
} from './invariantTypes.js';
export { DefaultHardeningInvariantConfig } from './invariantTypes.js';
export { HardeningInvariantEngine } from './hardeningInvariantEngine.js';
