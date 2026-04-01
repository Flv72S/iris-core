/**
 * Phase 10.X.1 — Explainability Invariants (fondazionali, deterministici)
 *
 * Hard invariants che garantiscono completezza, determinismo e verificabilità
 * di ogni Explanation. Nessuna logica di execution o learning.
 * Funzioni pure, no side-effects. Per auditing.
 */

import type { Explanation, ExplanationSection, ExplanationSectionType } from '../explanation/explanation.types';
import { computeExplanationHash } from '../explanation/explanation.hash';

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export interface InvariantCheckResult {
  readonly invariantName: string;
  readonly passed: boolean;
  readonly reason?: string;
}

export const EXPLANABILITY_INVARIANT = {
  HAS_ALL_SECTIONS: 'HAS_ALL_SECTIONS',
  NON_EMPTY_SECTIONS: 'NON_EMPTY_SECTIONS',
  SOURCE_STEPS_PRESENT: 'SOURCE_STEPS_PRESENT',
  SECTION_ORDER: 'SECTION_ORDER',
  EXPLANATION_HASH_VALID: 'EXPLANATION_HASH_VALID',
  IMMUTABILITY: 'IMMUTABILITY',
  NO_EXTERNAL_DEPENDENCIES: 'NO_EXTERNAL_DEPENDENCIES',
  FIXED_TEMPLATES_ONLY: 'FIXED_TEMPLATES_ONLY',
  DETERMINISTIC_RENDER_READY: 'DETERMINISTIC_RENDER_READY',
} as const;

export type ExplainabilityInvariant = (typeof EXPLANABILITY_INVARIANT)[keyof typeof EXPLANABILITY_INVARIANT];

const REQUIRED_SECTION_ORDER: ExplanationSectionType[] = [
  'WHAT',
  'WHY',
  'WHY_NOT',
  'MODE',
  'SAFETY',
  'OUTCOME',
];

const EXPECTED_EXPLANATION_KEYS = ['explanationId', 'traceId', 'summary', 'sections', 'explanationHash'] as const;
const EXPECTED_SECTION_KEYS = ['sectionType', 'content', 'sourceSteps'] as const;

/**
 * Insieme chiuso di tutti i contenuti ammessi (template fissi Phase 10.2).
 * Zero creatività: nessun testo fuori da questo set.
 */
const ALLOWED_TEMPLATE_CONTENTS: ReadonlySet<string> = new Set([
  'The action was executed because it was allowed by system policy and not blocked by wellbeing constraints.',
  'The action was not executed because it was blocked by system policy or safety constraints.',
  'The action execution completed with a failure status.',
  'Resolution state allowed the action. Policy and mode did not prohibit execution.',
  'Resolution state or policy blocked the action.',
  'The action was not performed due to policy block or safety constraint.',
  'The action was performed. No block applied.',
  'Active mode is DEFAULT. Balanced behavior with neutral safety interpretation.',
  'Active mode is FOCUS. Strict behavior minimizing interruptions.',
  'Active mode is WELLBEING. Protective behavior prioritizing user wellbeing.',
  'Safety checklist outcome was recorded. No override of safety rules.',
  'Outcome was appended to the certified outcome log.',
]);

// ---------------------------------------------------------------------------
// Controlli singoli (pure, no side-effects)
// ---------------------------------------------------------------------------

function checkHasAllSections(explanation: Explanation): InvariantCheckResult {
  const have = explanation.sections.map((s) => s.sectionType);
  const missing = REQUIRED_SECTION_ORDER.filter((t) => !have.includes(t));
  if (missing.length > 0) {
    return {
      invariantName: EXPLANABILITY_INVARIANT.HAS_ALL_SECTIONS,
      passed: false,
      reason: `Sezioni mancanti: ${missing.join(', ')}. Richieste: WHAT, WHY, WHY_NOT, MODE, SAFETY, OUTCOME.`,
    };
  }
  if (explanation.sections.length !== 6) {
    return {
      invariantName: EXPLANABILITY_INVARIANT.HAS_ALL_SECTIONS,
      passed: false,
      reason: `Numero sezioni errato: ${explanation.sections.length}, attese 6.`,
    };
  }
  return { invariantName: EXPLANABILITY_INVARIANT.HAS_ALL_SECTIONS, passed: true };
}

function checkNonEmptySections(explanation: Explanation): InvariantCheckResult {
  const empty = explanation.sections.filter((s) => typeof s.content !== 'string' || s.content.trim().length < 1);
  if (empty.length > 0) {
    const types = empty.map((s) => s.sectionType).join(', ');
    return {
      invariantName: EXPLANABILITY_INVARIANT.NON_EMPTY_SECTIONS,
      passed: false,
      reason: `Sezioni con contenuto vuoto o assente: ${types}. Ogni sezione deve avere almeno 1 carattere.`,
    };
  }
  return { invariantName: EXPLANABILITY_INVARIANT.NON_EMPTY_SECTIONS, passed: true };
}

function checkSourceStepsPresent(explanation: Explanation): InvariantCheckResult {
  const withoutSteps = explanation.sections.filter(
    (s) => !Array.isArray(s.sourceSteps) || s.sourceSteps.length === 0
  );
  if (withoutSteps.length > 0) {
    const types = withoutSteps.map((s) => s.sectionType).join(', ');
    return {
      invariantName: EXPLANABILITY_INVARIANT.SOURCE_STEPS_PRESENT,
      passed: false,
      reason: `Sezioni con sourceSteps vuoti: ${types}. Ogni sezione deve avere almeno uno step di riferimento.`,
    };
  }
  return { invariantName: EXPLANABILITY_INVARIANT.SOURCE_STEPS_PRESENT, passed: true };
}

function checkSectionOrder(explanation: Explanation): InvariantCheckResult {
  const order = explanation.sections.map((s) => s.sectionType);
  for (let i = 0; i < REQUIRED_SECTION_ORDER.length; i++) {
    if (order[i] !== REQUIRED_SECTION_ORDER[i]) {
      return {
        invariantName: EXPLANABILITY_INVARIANT.SECTION_ORDER,
        passed: false,
        reason: `Ordine errato alla posizione ${i}: atteso ${REQUIRED_SECTION_ORDER[i]}, trovato ${order[i]}. Ordine richiesto: WHAT, WHY, WHY_NOT, MODE, SAFETY, OUTCOME.`,
      };
    }
  }
  return { invariantName: EXPLANABILITY_INVARIANT.SECTION_ORDER, passed: true };
}

function checkExplanationHashValid(explanation: Explanation): InvariantCheckResult {
  const computed = computeExplanationHash({
    explanationId: explanation.explanationId,
    traceId: explanation.traceId,
    summary: explanation.summary,
    sections: explanation.sections,
  });
  if (computed !== explanation.explanationHash) {
    return {
      invariantName: EXPLANABILITY_INVARIANT.EXPLANATION_HASH_VALID,
      passed: false,
      reason: `Hash non corrisponde: memorizzato "${explanation.explanationHash}", calcolato "${computed}".`,
    };
  }
  return { invariantName: EXPLANABILITY_INVARIANT.EXPLANATION_HASH_VALID, passed: true };
}

function checkImmutability(explanation: Explanation): InvariantCheckResult {
  if (!Object.isFrozen(explanation)) {
    return {
      invariantName: EXPLANABILITY_INVARIANT.IMMUTABILITY,
      passed: false,
      reason: 'Explanation non è frozen (Object.freeze). Read-only guarantee richiesta.',
    };
  }
  if (!Object.isFrozen(explanation.sections)) {
    return {
      invariantName: EXPLANABILITY_INVARIANT.IMMUTABILITY,
      passed: false,
      reason: 'explanation.sections non è frozen.',
    };
  }
  for (let i = 0; i < explanation.sections.length; i++) {
    if (!Object.isFrozen(explanation.sections[i])) {
      return {
        invariantName: EXPLANABILITY_INVARIANT.IMMUTABILITY,
        passed: false,
        reason: `Sezione ${i} (${explanation.sections[i].sectionType}) non è frozen.`,
      };
    }
  }
  return { invariantName: EXPLANABILITY_INVARIANT.IMMUTABILITY, passed: true };
}

function checkNoExternalDependencies(explanation: Explanation): InvariantCheckResult {
  const keys = Object.keys(explanation).sort();
  const expected = [...EXPECTED_EXPLANATION_KEYS].sort();
  if (keys.length !== expected.length || keys.some((k, i) => k !== expected[i])) {
    return {
      invariantName: EXPLANABILITY_INVARIANT.NO_EXTERNAL_DEPENDENCIES,
      passed: false,
      reason: `Explanation deve avere esattamente le chiavi: ${expected.join(', ')}. Trovate: ${keys.join(', ')}. Nessun campo da Phase 6-9, Signal Layer, Learning o Preferences.`,
    };
  }
  for (const section of explanation.sections) {
    const sectionKeys = Object.keys(section).sort();
    const expectedSection = [...EXPECTED_SECTION_KEYS].sort();
    if (sectionKeys.length !== expectedSection.length || sectionKeys.some((k, i) => k !== expectedSection[i])) {
      return {
        invariantName: EXPLANABILITY_INVARIANT.NO_EXTERNAL_DEPENDENCIES,
        passed: false,
        reason: `Sezione deve avere esattamente le chiavi: ${expectedSection.join(', ')}. Trovate: ${sectionKeys.join(', ')}.`,
      };
    }
  }
  return { invariantName: EXPLANABILITY_INVARIANT.NO_EXTERNAL_DEPENDENCIES, passed: true };
}

function checkFixedTemplatesOnly(explanation: Explanation): InvariantCheckResult {
  const invalid = explanation.sections.filter((s) => !ALLOWED_TEMPLATE_CONTENTS.has(s.content));
  if (invalid.length > 0) {
    const types = invalid.map((s) => s.sectionType).join(', ');
    return {
      invariantName: EXPLANABILITY_INVARIANT.FIXED_TEMPLATES_ONLY,
      passed: false,
      reason: `Sezioni con contenuto non proveniente da template fissi: ${types}. Zero creatività: solo template predefiniti ammessi.`,
    };
  }
  return { invariantName: EXPLANABILITY_INVARIANT.FIXED_TEMPLATES_ONLY, passed: true };
}

function checkDeterministicRenderReady(explanation: Explanation): InvariantCheckResult {
  const orderOk = checkSectionOrder(explanation).passed;
  const allSectionsOk = checkHasAllSections(explanation).passed;
  const templatesOk = checkFixedTemplatesOnly(explanation).passed;
  if (!orderOk || !allSectionsOk || !templatesOk) {
    return {
      invariantName: EXPLANABILITY_INVARIANT.DETERMINISTIC_RENDER_READY,
      passed: false,
      reason: 'Explanation non pronta per rendering deterministico: richiesti ordine fisso, tutte le sezioni e contenuti da template fissi.',
    };
  }
  return { invariantName: EXPLANABILITY_INVARIANT.DETERMINISTIC_RENDER_READY, passed: true };
}

// ---------------------------------------------------------------------------
// API pubbliche
// ---------------------------------------------------------------------------

const CHECKERS: Array<(explanation: Explanation) => InvariantCheckResult> = [
  checkHasAllSections,
  checkNonEmptySections,
  checkSourceStepsPresent,
  checkSectionOrder,
  checkExplanationHashValid,
  checkImmutability,
  checkNoExternalDependencies,
  checkFixedTemplatesOnly,
  checkDeterministicRenderReady,
];

/**
 * Esegue tutti i controlli invarianti sull'Explanation.
 * Funzione pura, nessun side-effect. Restituisce un array di risultati (frozen).
 */
export function checkExplainabilityInvariants(explanation: Explanation): InvariantCheckResult[] {
  const results = CHECKERS.map((fn) => fn(explanation));
  return Object.freeze(results.map((r) => Object.freeze(r)));
}

/**
 * Verifica tutti gli invarianti; in caso di fallimento lancia con messaggio chiaro.
 * @throws Error se almeno un invariant fallisce (reason nel messaggio)
 */
export function assertAllInvariants(explanation: Explanation): void {
  const results = checkExplainabilityInvariants(explanation);
  const failed = results.filter((r) => !r.passed);
  if (failed.length > 0) {
    const messages = failed.map((r) => `[${r.invariantName}] ${r.reason ?? 'FAIL'}`).join('; ');
    throw new Error(`Explainability invariants FAIL: ${messages}`);
  }
}
