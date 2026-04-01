/**
 * Phase 10.X.2 — Serializzazione stabile per Golden Trace.
 *
 * Ordinamento chiavi stabile, nessun timestamp, nessuna variazione ambientale.
 * Output deterministico su qualsiasi macchina e CI.
 */

import type { GoldenTrace } from './golden.dataset';

function stableStringify(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(value).sort();
  const pairs = keys.map((k) => JSON.stringify(k) + ':' + stableStringify((value as Record<string, unknown>)[k]));
  return '{' + pairs.join(',') + '}';
}

/**
 * Serializza una GoldenTrace in stringa stabile.
 * Stesso golden → stesso output, sempre.
 */
export function serializeGoldenTrace(golden: GoldenTrace): string {
  const payload = {
    scenarioId: golden.scenarioId,
    traceId: golden.trace.traceId,
    traceHash: golden.trace.traceHash,
    explanationId: golden.explanation.explanationId,
    explanationHash: golden.explanationHash,
    summary: golden.explanation.summary,
    sectionTypes: golden.explanation.sections.map((s) => s.sectionType),
  };
  return stableStringify(payload);
}
