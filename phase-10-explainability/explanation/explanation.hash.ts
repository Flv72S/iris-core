/**
 * Phase 10.2 — Stable hash for Explanation (no timestamp, no randomness)
 */

import type { Explanation, ExplanationSection } from './explanation.types';

const SECTION_KEYS: (keyof ExplanationSection)[] = [
  'sectionType',
  'content',
  'sourceSteps',
];

function hashString(s: string): string {
  if (typeof process !== 'undefined' && process.versions?.node) {
    const crypto = require('node:crypto');
    return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
  }
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function stableStringifySection(section: ExplanationSection): string {
  return SECTION_KEYS.map(
    (k) =>
      JSON.stringify(k) +
      ':' +
      JSON.stringify((section as Record<string, unknown>)[k])
  )
    .sort()
    .join(',');
}

function stableStringifyExplanation(explanation: Explanation): string {
  const parts = [
    JSON.stringify(explanation.explanationId),
    JSON.stringify(explanation.traceId),
    JSON.stringify(explanation.summary),
    explanation.sections.map(stableStringifySection).join('|'),
  ];
  return parts.join('\n');
}

export function computeExplanationHash(
  explanation: Omit<Explanation, 'explanationHash'>
): string {
  return hashString(stableStringifyExplanation(explanation as Explanation));
}
