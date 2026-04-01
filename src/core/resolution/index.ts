/**
 * Resolution — Authority hierarchy (6.5.1) and Resolution Engine (6.5.2).
 */

export {
  AUTHORITY_SOURCE_ORDER,
  AUTHORITY_SOURCE_COUNT,
  getAuthorityPrecedence,
  isAuthoritySourceId,
  getAuthoritySourceOrder,
  type AuthoritySourceId,
} from './authority-sources';

export type {
  ResolutionContext,
  ResolutionResult,
  ResolutionStatus,
  AuthorityDecision,
  AuthorityDecisionSnapshot,
  ResolutionAuditEntry,
  ProductMode,
  AuthorityStatus,
  ResolutionSnapshotInputs,
} from './resolution-context';

export {
  hashResolutionContext,
  hashAuditPayload,
  buildAuditPayload,
} from './resolution-context';

export { resolve } from './resolution-engine';

export {
  getWinningDecision,
  getConflictRuleId,
  orderDecisionsByPrecedence,
  CONFLICT_RULES_VERSION,
  RULE_WELLBEING_OVER_USER_ALLOW,
  RULE_USER_HARD_BLOCK_ABSOLUTE,
  RULE_FOCUS_BLOCKS_DISTRACTIONS,
  RULE_FEATURE_POLICY_RESTRICTS,
  RULE_ALL_ALLOWED,
  CONFLICT_RULE_IDS,
} from './conflict-rules';

export type { AuthorityTraceStep } from './resolution-audit';
export {
  hashShaLike,
  hashAuditEntryPayload,
  serializeAuditEntry,
  deserializeAuditEntry,
  serializeTraceStep,
  appendResolutionAudit,
  readResolutionAudit,
  _resetResolutionAuditForTest,
} from './resolution-audit';

export type { ResolutionKillSwitchState, PreResolutionCheckResult } from './resolution-killswitch';
export {
  checkPreResolution,
  buildKillSwitchAuditEntry,
  defaultKillSwitchState,
  isGlobalKillActive,
  isFeatureKilled,
  isAuthorityKilled,
  RESOLUTION_KILL_SWITCH_RULE_ID,
} from './resolution-killswitch';
