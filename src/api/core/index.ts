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

// Message Append
export * from './messageAppend';

// Thread State
export * from './threadState';

// Sync / Delivery
export * from './syncDelivery';
