/**
 * Phase 14D — Conflict Resolution Engine.
 */

export type { StateConflict, ConflictResolutionResult, ConflictEntityType } from './conflict_types.js';
export { ConflictDetector } from './conflict_detector.js';
export { ConflictPolicy } from './conflict_policy.js';
export { ConflictResolver } from './conflict_resolver.js';
export { ConflictValidator } from './conflict_validator.js';
export { ConflictError, ConflictErrorCode } from './conflict_errors.js';
