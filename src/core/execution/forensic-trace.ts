/**
 * Forensic Execution Trace — Fase 7.4a
 *
 * Replay verificabile completo: traccia immutabile con input completo, output e fingerprint
 * per integrità. Append-only; lettura per intent/resolution.
 */

import type { ActionIntent } from './action-intent';
import type { ExecutionResult } from './ExecutionResult';
import type { ResolutionResultSnapshot } from './execution-plan';
import type { LifecycleTrace } from './execution-audit';

/** Snapshot serializzabile del contesto al momento dell'esecuzione (per replay). */
export type ForensicContextSnapshot = {
  readonly now: number;
  readonly registry: Readonly<Record<string, boolean>>;
  readonly wellbeingBlocked: boolean;
};

/** Entry di traccia forense: tutto ciò che serve per replay e verifica. */
export type ForensicTraceEntry = {
  readonly traceId: string;
  /** Intent eseguito (input completo). */
  readonly intent: ActionIntent;
  /** Snapshot resolution da cui proviene l'intent. */
  readonly resolutionSnapshot: ResolutionResultSnapshot;
  /** Contesto al momento dell'esecuzione (per replay deterministico). */
  readonly contextSnapshot: ForensicContextSnapshot;
  /** Trace lifecycle (planned → …) al momento del record. */
  readonly lifecycleTrace?: LifecycleTrace;
  /** Esito esecuzione (output). */
  readonly result: ExecutionResult;
  /** Snapshot prima (opzionale). */
  readonly snapshotBefore?: unknown;
  /** Snapshot dopo (opzionale). */
  readonly snapshotAfter?: unknown;
  readonly recordedAt: number;
  /**
   * Fingerprint per verifica integrità: hash/codice del payload canonico (senza questo campo).
   * Impostato dal chiamante (es. hash di canonicalPayloadForVerification(entry)).
   */
  readonly traceFingerprint?: string;
};

/** Input per creare una trace (fingerprint opzionale, calcolabile dopo). */
export type ForensicTraceEntryInput = {
  readonly traceId: string;
  readonly intent: ActionIntent;
  readonly resolutionSnapshot: ResolutionResultSnapshot;
  readonly contextSnapshot: ForensicContextSnapshot;
  readonly lifecycleTrace?: LifecycleTrace;
  readonly result: ExecutionResult;
  readonly snapshotBefore?: unknown;
  readonly snapshotAfter?: unknown;
  readonly recordedAt?: number;
  readonly traceFingerprint?: string;
};

/**
 * Payload canonico per verifica: oggetto serializzabile senza traceFingerprint.
 * Il chiamante può fare hash(JSON.stringify(canonicalPayloadForVerification(entry)))
 * e confrontare con entry.traceFingerprint.
 */
export function canonicalPayloadForVerification(entry: ForensicTraceEntry): unknown {
  return {
    traceId: entry.traceId,
    intent: entry.intent,
    resolutionSnapshot: entry.resolutionSnapshot,
    contextSnapshot: entry.contextSnapshot,
    lifecycleTrace: entry.lifecycleTrace,
    result: entry.result,
    snapshotBefore: entry.snapshotBefore,
    snapshotAfter: entry.snapshotAfter,
    recordedAt: entry.recordedAt,
  };
}

/**
 * Verifica integrità: ritorna true se entry.traceFingerprint è assente (nessuna verifica)
 * o se il fingerprint fornito coincide con un fingerprint ricomputato dal chiamante.
 * Questo modulo non calcola hash; il chiamante deve passare expectedFingerprint
 * (es. hash(canonicalPayloadForVerification(entry))) e confrontare con entry.traceFingerprint.
 */
export function verifyTraceIntegrity(
  entry: ForensicTraceEntry,
  expectedFingerprint: string
): boolean {
  if (entry.traceFingerprint == null) return true;
  return entry.traceFingerprint === expectedFingerprint;
}

let forensicTraceStore: readonly ForensicTraceEntry[] = Object.freeze([]);

/**
 * Aggiunge una traccia al log. Append-only; la entry viene frozen.
 */
export function appendForensicTrace(entry: ForensicTraceEntryInput): void {
  const now = Date.now();
  const record: ForensicTraceEntry = Object.freeze({
    traceId: entry.traceId,
    intent: entry.intent,
    resolutionSnapshot: entry.resolutionSnapshot,
    contextSnapshot: entry.contextSnapshot,
    lifecycleTrace: entry.lifecycleTrace,
    result: entry.result,
    snapshotBefore: entry.snapshotBefore,
    snapshotAfter: entry.snapshotAfter,
    recordedAt: entry.recordedAt ?? now,
    traceFingerprint: entry.traceFingerprint,
  });
  forensicTraceStore = Object.freeze([...forensicTraceStore, record]);
}

/**
 * Legge l'intero log forense (ordine di append).
 */
export function readForensicTrace(): readonly ForensicTraceEntry[] {
  return forensicTraceStore;
}

/**
 * Restituisce la traccia per un dato intentId (prima match).
 */
export function readForensicTraceByIntentId(
  intentId: string
): ForensicTraceEntry | null {
  return forensicTraceStore.find((t) => t.intent.intentId === intentId) ?? null;
}

/**
 * Restituisce tutte le tracce per una resolution.
 */
export function readForensicTraceByResolutionId(
  resolutionId: string
): readonly ForensicTraceEntry[] {
  return forensicTraceStore.filter(
    (t) => t.resolutionSnapshot.resolutionId === resolutionId
  );
}

/**
 * Restituisce la traccia per traceId.
 */
export function readForensicTraceByTraceId(
  traceId: string
): ForensicTraceEntry | null {
  return forensicTraceStore.find((t) => t.traceId === traceId) ?? null;
}

/** Reset per test. Non esporre in produzione. */
export function _resetForensicTraceForTest(): void {
  forensicTraceStore = Object.freeze([]);
}
