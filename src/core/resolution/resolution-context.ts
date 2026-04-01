/**
 * Resolution Context — Microstep 6.5.2
 *
 * Definizione immutabile dell'input al Resolution Engine.
 * Snapshot inputs opzionali per hashing e replay; nessuna dipendenza da clock runtime.
 */

import type { AuthoritySourceId } from './authority-sources';

/** Product mode; valore esplicito nel contesto (no default implicito). */
export type ProductMode = 'DEFAULT' | 'FOCUS' | 'WELLBEING';

/** Status emesso da una singola authority. */
export type AuthorityStatus = 'ALLOWED' | 'BLOCKED' | 'FORCED' | 'SUSPENDED';

/** Status finale di risoluzione (Fase 7: solo ALLOWED/FORCED abilitano execution). */
export type ResolutionStatus = 'ALLOWED' | 'BLOCKED' | 'FORCED' | 'SUSPENDED';

/** Decisione singola da una authority. Immutabile; ruleId/reason obbligatori se status !== ALLOWED. */
export type AuthorityDecision = {
  readonly authorityId: AuthoritySourceId;
  readonly status: AuthorityStatus;
  readonly ruleId: string | null;
  readonly reason: string | null;
};

/** Snapshot di una decisione per audit (replay). */
export type AuthorityDecisionSnapshot = {
  readonly authorityId: AuthoritySourceId;
  readonly status: AuthorityStatus;
  readonly ruleId: string | null;
  readonly reason: string | null;
};

/**
 * Input snapshot opzionali: riferimenti immutabili per serializzazione/hashing.
 * Il motore non interpreta i contenuti; il caller garantisce immutabilità.
 */
export type ResolutionSnapshotInputs = {
  readonly derivedState?: unknown;
  readonly uxExperience?: unknown;
};

/**
 * Contesto di risoluzione. Tutti i campi read-only.
 * authorityDecisions deve essere ordinato secondo AUTHORITY_SOURCE_ORDER.
 */
export type ResolutionContext = {
  readonly resolutionId: string;
  readonly featureId: string;
  readonly productMode: ProductMode;
  readonly now: number;
  readonly authorityDecisions: readonly AuthorityDecision[];
  readonly executionRequestId?: string;
  readonly snapshotInputs?: ResolutionSnapshotInputs;
};

/** Entry audit append-only. payloadHash = hash deterministico del payload (canonical JSON). */
export type ResolutionAuditEntry = {
  readonly resolutionId: string;
  readonly featureId: string;
  readonly executionRequestId: string | null;
  readonly status: ResolutionStatus;
  readonly winningAuthorityId: AuthoritySourceId | null;
  readonly winningRuleId: string | null;
  readonly reason: string | null;
  readonly resolvedAt: number;
  readonly decisionsSnapshot: readonly AuthorityDecisionSnapshot[];
  readonly payloadHash: string;
};

/** Risultato della risoluzione. Un solo status; una sola winning authority se non-ALLOWED. */
export type ResolutionResult = {
  readonly resolutionId: string;
  readonly status: ResolutionStatus;
  readonly winningAuthorityId: AuthoritySourceId | null;
  readonly winningRuleId: string | null;
  readonly reason: string | null;
  readonly resolvedAt: number;
  readonly auditEntry: ResolutionAuditEntry;
};

/** Chiavi in ordine canonico per serializzazione deterministica (hashing, replay Fase 13). */
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

const CONTEXT_HASH_KEYS: (keyof ResolutionContext)[] = [
  'resolutionId',
  'featureId',
  'productMode',
  'now',
  'executionRequestId',
  'authorityDecisions',
  'snapshotInputs',
];

/** Serializzazione canonica: chiavi ordinate, valori stabili. */
function canonicalStringify(obj: unknown): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map((v) => canonicalStringify(v)).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ':' + canonicalStringify((obj as Record<string, unknown>)[k]));
  return '{' + parts.join(',') + '}';
}

/** Hash deterministico (djb2). Stesso input → stesso output. No crypto runtime. */
function deterministicHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

/**
 * Costruisce l'oggetto audit entry senza payloadHash (per calcolo hash).
 */
export function buildAuditPayload(
  resolutionId: string,
  featureId: string,
  executionRequestId: string | null,
  status: ResolutionStatus,
  winningAuthorityId: AuthoritySourceId | null,
  winningRuleId: string | null,
  reason: string | null,
  resolvedAt: number,
  decisionsSnapshot: readonly AuthorityDecisionSnapshot[]
): Omit<ResolutionAuditEntry, 'payloadHash'> {
  return Object.freeze({
    resolutionId,
    featureId,
    executionRequestId,
    status,
    winningAuthorityId,
    winningRuleId,
    reason,
    resolvedAt,
    decisionsSnapshot,
  });
}

/**
 * Calcola hash deterministico di una ResolutionAuditEntry (senza payloadHash).
 * Usato per generare payloadHash e per replay/verifica Fase 13.
 */
export function hashAuditPayload(
  entry: Omit<ResolutionAuditEntry, 'payloadHash'>
): string {
  const ordered: Record<string, unknown> = {};
  for (const k of AUDIT_ENTRY_KEYS) {
    if (k === 'payloadHash') continue;
    ordered[k] = entry[k as keyof typeof entry];
  }
  return deterministicHash(canonicalStringify(ordered));
}

/**
 * Hash deterministico del contesto (subset serializzabile).
 * Stesso context → stesso hash. Per replay e certificazione.
 */
export function hashResolutionContext(context: ResolutionContext): string {
  const ordered: Record<string, unknown> = {};
  for (const k of CONTEXT_HASH_KEYS) {
    ordered[k] = context[k as keyof ResolutionContext];
  }
  return deterministicHash(canonicalStringify(ordered));
}
