/**
 * Resolution Audit — Microstep 6.5.4
 *
 * Sistema append-only per audit della risoluzione. Immutabilità, hash deterministico,
 * replay completo, correlazione con Execution ID (Fase 7).
 */

import type { AuthoritySourceId } from './authority-sources';
import type { AuthorityStatus, ResolutionStatus } from './resolution-context';
import type {
  ResolutionAuditEntry,
  AuthorityDecisionSnapshot,
} from './resolution-context';

/** Re-export per uso audit. */
export type { ResolutionAuditEntry } from './resolution-context';

/**
 * Singolo step della trace di valutazione authority (ordine di scansione).
 * terminated = true se la risoluzione è terminata dopo questo step (primo non-ALLOWED).
 */
export type AuthorityTraceStep = {
  readonly stepIndex: number;
  readonly authorityId: AuthoritySourceId;
  readonly status: AuthorityStatus;
  readonly ruleId: string | null;
  readonly reason: string | null;
  readonly terminated: boolean;
};

/** Chiavi in ordine canonico per ResolutionAuditEntry (serializer stabile). */
const AUDIT_ENTRY_KEYS: (keyof ResolutionAuditEntry)[] = [
  'resolutionId',
  'featureId',
  'executionRequestId',
  'status',
  'winningAuthorityId',
  'winningRuleId',
  'reason',
  'resolvedAt',
  'decisionsSnapshot',
  'payloadHash',
];

/** Chiavi in ordine canonico per AuthorityTraceStep. */
const TRACE_STEP_KEYS: (keyof AuthorityTraceStep)[] = [
  'stepIndex',
  'authorityId',
  'status',
  'ruleId',
  'reason',
  'terminated',
];

function canonicalStringify(obj: unknown): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map((v) => canonicalStringify(v)).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const parts = keys.map(
    (k) => JSON.stringify(k) + ':' + canonicalStringify((obj as Record<string, unknown>)[k])
  );
  return '{' + parts.join(',') + '}';
}

/**
 * Hash deterministico SHA-like: 64 caratteri esadecimali.
 * Stesso input → stesso output. Nessuna dipendenza da crypto runtime.
 * Implementazione: 8 word a 32 bit con mixing (FNV-1a style + rotate); output 8*8 hex = 64.
 */
export function hashShaLike(payload: string): string {
  const len = payload.length;
  let h0 = 0x811c9dc5;
  let h1 = 0x01000193;
  let h2 = 0x85ebca6b;
  let h3 = 0xc2b2ae35;
  let h4 = 0x27d4eb2d;
  let h5 = 0x165667b1;
  let h6 = 0x84caa73b;
  let h7 = 0x31c6bf37;

  for (let i = 0; i < len; i++) {
    const c = payload.charCodeAt(i);
    h0 = Math.imul(h0 ^ c, 0x01000193);
    h1 = Math.imul(h1 ^ (c >>> 8), 0x01000193);
    h2 = Math.imul(h2 ^ (c << 1), 0x85ebca6b);
    h3 = Math.imul(h3 ^ (c << 2), 0xc2b2ae35);
    h4 = Math.imul(h4 ^ (c << 3), 0x27d4eb2d);
    h5 = Math.imul(h5 ^ (c >>> 4), 0x165667b1);
    h6 = Math.imul(h6 ^ (c >>> 5), 0x84caa73b);
    h7 = Math.imul(h7 ^ (c >>> 6), 0x31c6bf37);
  }

  const toHex = (n: number) => ((n >>> 0).toString(16)).padStart(8, '0');
  return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + toHex(h5) + toHex(h6) + toHex(h7);
}

/**
 * Calcola payloadHash per una entry (senza il campo payloadHash).
 * Usa hashShaLike su JSON canonico per Fase 13 e compliance.
 */
export function hashAuditEntryPayload(
  entry: Omit<ResolutionAuditEntry, 'payloadHash'>
): string {
  const ordered: Record<string, unknown> = {};
  for (const k of AUDIT_ENTRY_KEYS) {
    if (k === 'payloadHash') continue;
    ordered[k] = entry[k as keyof typeof entry];
  }
  return hashShaLike(canonicalStringify(ordered));
}

/**
 * Serializer stabile: ResolutionAuditEntry → stringa JSON canonica.
 * Ordine chiavi fissato; stesso entry → stessa stringa.
 */
export function serializeAuditEntry(entry: ResolutionAuditEntry): string {
  const ordered: Record<string, unknown> = {};
  for (const k of AUDIT_ENTRY_KEYS) {
    ordered[k] = entry[k as keyof typeof entry];
  }
  return canonicalStringify(ordered);
}

/**
 * Deserializza una stringa JSON (canonical o meno) in ResolutionAuditEntry.
 * Restituisce entry immutabile (Object.freeze). Lancia se formato non valido.
 */
export function deserializeAuditEntry(json: string): ResolutionAuditEntry {
  const raw = JSON.parse(json) as Record<string, unknown>;
  const decisionsSnapshot = (raw.decisionsSnapshot as unknown[])?.map((d) =>
    Object.freeze({
      authorityId: d.authorityId,
      status: d.status,
      ruleId: d.ruleId ?? null,
      reason: d.reason ?? null,
    })
  ) ?? [];
  const entry: ResolutionAuditEntry = Object.freeze({
    resolutionId: String(raw.resolutionId ?? ''),
    featureId: String(raw.featureId ?? ''),
    executionRequestId: raw.executionRequestId != null ? String(raw.executionRequestId) : null,
    status: String(raw.status ?? 'ALLOWED') as ResolutionStatus,
    winningAuthorityId: (raw.winningAuthorityId != null ? String(raw.winningAuthorityId) : null) as AuthoritySourceId | null,
    winningRuleId: raw.winningRuleId != null ? String(raw.winningRuleId) : null,
    reason: raw.reason != null ? String(raw.reason) : null,
    resolvedAt: Number(raw.resolvedAt ?? 0),
    decisionsSnapshot: Object.freeze(decisionsSnapshot) as readonly AuthorityDecisionSnapshot[],
    payloadHash: String(raw.payloadHash ?? ''),
  });
  return entry;
}

/**
 * Serializza un AuthorityTraceStep in forma canonica.
 */
export function serializeTraceStep(step: AuthorityTraceStep): string {
  const ordered: Record<string, unknown> = {};
  for (const k of TRACE_STEP_KEYS) {
    ordered[k] = step[k as keyof AuthorityTraceStep];
  }
  return canonicalStringify(ordered);
}

/** Store append-only in memoria. Reset solo per test. */
let auditStore: readonly ResolutionAuditEntry[] = Object.freeze([]);

/**
 * Append di una entry. Entry viene congelata prima dell'append.
 * Correlazione con Fase 7: executionRequestId nella entry collega a Execution ID.
 */
export function appendResolutionAudit(entry: ResolutionAuditEntry): void {
  auditStore = Object.freeze([...auditStore, Object.freeze(entry)]);
}

/**
 * Lettura completa dello store (solo lettura). Ordine = ordine di append.
 */
export function readResolutionAudit(): readonly ResolutionAuditEntry[] {
  return auditStore;
}

/** Reset solo per test. Non usare in produzione. */
export function _resetResolutionAuditForTest(): void {
  auditStore = Object.freeze([]);
}
