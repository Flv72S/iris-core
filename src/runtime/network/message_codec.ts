import { canonicalizeKeysDeep, stableStringify } from '../../logging/audit';
import type { ClusterPhase, ClusterState, NodePhase } from '../../distributed/cluster_lifecycle_engine';
import type {
  ComplianceActionType,
  ComplianceDecision,
  ComplianceSeverity,
} from '../../distributed/cluster_compliance_engine';
import { deriveComplianceDecisionId } from '../../distributed/cluster_compliance_executor';
import type { RuntimeDecision } from '../execution/decision_types';
import type { LogicalClock } from '../ordering/logical_clock';

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export type MessageCodecErrorKind = 'corrupt' | 'invalid';

export class MessageCodecError extends Error {
  constructor(
    message: string,
    readonly kind: MessageCodecErrorKind,
  ) {
    super(message);
    this.name = 'MessageCodecError';
  }
}

/** Parse raw Fastify body (object or JSON string). JSON syntax errors use kind `corrupt`. */
export function parseInboundJson(body: unknown): unknown {
  if (body === undefined || body === null) {
    throw new MessageCodecError('missing body', 'corrupt');
  }
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      throw new MessageCodecError('invalid JSON', 'corrupt');
    }
  }
  return body;
}

const SEVERITIES: ReadonlySet<ComplianceSeverity> = new Set(['INFO', 'WARNING', 'CRITICAL']);
const ACTIONS: ReadonlySet<ComplianceActionType> = new Set([
  'NO_OP',
  'LOG_ONLY',
  'ESCALATE',
  'HALT_CLUSTER',
  'FREEZE_TRANSITIONS',
  'REQUIRE_MANUAL_INTERVENTION',
]);

const CLUSTER_PHASES: ReadonlySet<ClusterPhase> = new Set([
  'INITIALIZING',
  'PARTIAL',
  'SYNCING',
  'READY',
  'RUNNING',
  'DEGRADED',
  'STOPPING',
  'STOPPED',
  'FAILED',
  'HALTED',
]);

const NODE_PHASES: ReadonlySet<NodePhase> = new Set([
  'INIT',
  'BOOTSTRAPPING',
  'SYNCING',
  'READY',
  'RUNNING',
  'DEGRADED',
  'STOPPING',
  'STOPPED',
  'FAILED',
]);

const DECISION_KEYS = new Set([
  'severity',
  'action',
  'reasons',
  'invariantIds',
  'violationCount',
  'timestamp',
]);

function deterministicCounterFromDecisionId(decisionId: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < decisionId.length; i++) {
    h ^= decisionId.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function assertLogicalClock(x: unknown): LogicalClock {
  if (x === null || typeof x !== 'object') throw new Error('logicalClock invalid');
  const o = x as Record<string, unknown>;
  if (typeof o.counter !== 'number' || !Number.isFinite(o.counter) || o.counter < 0) {
    throw new Error('logicalClock.counter invalid');
  }
  if (typeof o.nodeId !== 'string' || o.nodeId.length === 0) throw new Error('logicalClock.nodeId invalid');
  return Object.freeze({ counter: o.counter, nodeId: o.nodeId });
}

function assertStringArray(x: unknown, label: string): readonly string[] {
  if (!Array.isArray(x)) throw new Error(`${label} must be array`);
  for (const item of x) {
    if (typeof item !== 'string') throw new Error(`${label} must be string[]`);
  }
  return Object.freeze([...x]);
}

/**
 * Strict structural validation for inbound decisions. Rejects unknown fields (e.g. fake decisionId).
 */
export function assertComplianceDecisionPayload(raw: unknown): ComplianceDecision {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('decision must be object');
  }
  const o = raw as Record<string, unknown>;
  const keys = Object.keys(o);
  for (const k of keys) {
    if (!DECISION_KEYS.has(k)) throw new Error(`unknown decision field: ${k}`);
  }
  const severity = o.severity;
  const action = o.action;
  if (typeof severity !== 'string' || !SEVERITIES.has(severity as ComplianceSeverity)) {
    throw new Error('invalid severity');
  }
  if (typeof action !== 'string' || !ACTIONS.has(action as ComplianceActionType)) {
    throw new Error('invalid action');
  }
  const reasons = assertStringArray(o.reasons, 'reasons');
  const invariantIds = assertStringArray(o.invariantIds, 'invariantIds');
  const violationCount = o.violationCount;
  const timestamp = o.timestamp;
  if (typeof violationCount !== 'number' || !Number.isFinite(violationCount)) {
    throw new Error('invalid violationCount');
  }
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    throw new Error('invalid timestamp');
  }
  return Object.freeze({
    severity: severity as ComplianceSeverity,
    action: action as ComplianceActionType,
    reasons,
    invariantIds,
    violationCount,
    timestamp,
  });
}

/**
 * Recomputes canonical decision id; detects tampering if caller also sent a mismatched id elsewhere (handled by unknown field rejection).
 */
export function verifyDecisionIdCanonical(decision: ComplianceDecision): string {
  return deriveComplianceDecisionId(decision);
}

export function decodeAndValidateDecision(body: unknown): ComplianceDecision {
  const parsed = parseInboundJson(body);
  try {
    const decision = assertComplianceDecisionPayload(parsed);
    void verifyDecisionIdCanonical(decision);
    return deepClone(canonicalizeKeysDeep(decision)) as ComplianceDecision;
  } catch (e) {
    if (e instanceof MessageCodecError) throw e;
    throw new MessageCodecError((e as Error).message, 'invalid');
  }
}

export function decodeAndValidateRuntimeDecision(body: unknown): RuntimeDecision {
  const parsed = parseInboundJson(body);
  try {
    // Backward compatible format: body is plain ComplianceDecision.
    if (parsed !== null && typeof parsed === 'object' && !('decision' in (parsed as Record<string, unknown>))) {
      const decision = assertComplianceDecisionPayload(parsed);
      const decisionId = deriveComplianceDecisionId(decision);
      return Object.freeze({
        decision: deepClone(canonicalizeKeysDeep(decision)) as ComplianceDecision,
        logicalClock: Object.freeze({
          counter: deterministicCounterFromDecisionId(decisionId),
          nodeId: 'fallback',
        }),
      });
    }
    const o = parsed as Record<string, unknown>;
    const decision = assertComplianceDecisionPayload(o.decision);
    const decisionId = deriveComplianceDecisionId(decision);
    const rawClock = o.logicalClock;
    const logicalClock = rawClock === undefined
      ? Object.freeze({ counter: deterministicCounterFromDecisionId(decisionId), nodeId: 'fallback' })
      : assertLogicalClock(rawClock);
    return Object.freeze({
      decision: deepClone(canonicalizeKeysDeep(decision)) as ComplianceDecision,
      logicalClock,
    });
  } catch (e) {
    if (e instanceof MessageCodecError) throw e;
    throw new MessageCodecError((e as Error).message, 'invalid');
  }
}

export function encodeCanonicalMessage<T>(payload: T): string {
  return stableStringify(canonicalizeKeysDeep(deepClone(payload)));
}

export function decodeCanonicalMessage<T>(body: unknown): T {
  const parsed = typeof body === 'string' ? JSON.parse(body) : body;
  return deepClone(canonicalizeKeysDeep(parsed) as T);
}

function assertLogicalTime(x: unknown): void {
  if (x === null || typeof x !== 'object') throw new Error('logicalTime invalid');
  const o = x as Record<string, unknown>;
  if (typeof o.counter !== 'number' || !Number.isFinite(o.counter)) throw new Error('logicalTime.counter invalid');
  if (typeof o.nodeId !== 'string' || o.nodeId.length === 0) throw new Error('logicalTime.nodeId invalid');
}

function assertNodeState(x: unknown): void {
  if (x === null || typeof x !== 'object') throw new Error('node state invalid');
  const o = x as Record<string, unknown>;
  if (typeof o.nodeId !== 'string') throw new Error('node.nodeId invalid');
  if (typeof o.phase !== 'string' || !NODE_PHASES.has(o.phase as NodePhase)) throw new Error('node.phase invalid');
  assertLogicalTime(o.logicalTime);
  if (typeof o.lastEventId !== 'string') throw new Error('node.lastEventId invalid');
}

export function assertClusterStatePayload(raw: unknown): ClusterState {
  if (raw === null || typeof raw !== 'object') throw new Error('state must be object');
  const o = raw as Record<string, unknown>;
  if (typeof o.globalPhase !== 'string' || !CLUSTER_PHASES.has(o.globalPhase as ClusterPhase)) {
    throw new Error('invalid globalPhase');
  }
  assertLogicalTime(o.logicalTime);
  const nodes = o.nodes;
  if (nodes === null || typeof nodes !== 'object' || Array.isArray(nodes)) throw new Error('nodes invalid');
  const nr = nodes as Record<string, unknown>;
  for (const k of Object.keys(nr)) {
    assertNodeState(nr[k]);
  }
  return deepClone(canonicalizeKeysDeep(raw)) as ClusterState;
}

export function decodeAndValidateStateSync(body: unknown): ClusterState {
  const parsed = parseInboundJson(body);
  try {
    return assertClusterStatePayload(parsed);
  } catch (e) {
    if (e instanceof MessageCodecError) throw e;
    throw new MessageCodecError((e as Error).message, 'invalid');
  }
}
