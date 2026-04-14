/**
 * Core API Export
 * 
 * Export centralizzato per il Core API del Messaging IRIS.
 * 
 * Riferimenti vincolanti:
 * - IRIS_API_Contracts_Freeze_STEP5.3_v1.0.md
 * - IRIS_API_Invariants_and_Failure_Modes.md
 */

// Types
export * from './types';

// Invariants
export * from './invariants';

// Message Append (canonical repository surface types)
export * from './messageAppend';

// Thread State — functions only (repository types duplicate messageAppend / syncDelivery)
export { getThreadState, transitionThreadState } from './threadState';

// Sync / Delivery — functions + sync-only repository types
export type { SyncStatusRepository } from './syncDelivery';
export {
  getMessageDelivery,
  retryMessage,
  getSyncStatus,
  calculateRetryDelay,
} from './syncDelivery';
