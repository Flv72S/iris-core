/**
 * Phase 10.2 — Build human-readable explanation from DecisionTrace only
 */

import type { DecisionTrace, DecisionTracePhase } from '../trace/decision-trace.types';
import type { Explanation, ExplanationSection } from './explanation.types';
import {
  getExecutionTemplate,
  getWhyTemplate,
  getWhyNotTemplate,
  getModeTemplate,
  getSafetyTemplate,
  getOutcomeTemplate,
} from './explanation.templates';
import { computeExplanationHash } from './explanation.hash';

function stepIndicesByPhase(trace: DecisionTrace, phases: DecisionTracePhase[]): number[] {
  const set = new Set(phases);
  return trace.steps
    .map((s, i) => (set.has(s.phase) ? i : -1))
    .filter((i) => i >= 0);
}

export function buildExplanation(trace: DecisionTrace): Explanation {
  const whatContent = getExecutionTemplate(trace.executionSummary, trace.resolutionSummary);
  const whyContent = getWhyTemplate(trace.resolutionSummary);
  const whyNotContent = getWhyNotTemplate(trace.resolutionSummary);
  const modeContent = getModeTemplate(trace.mode);
  const safetyContent = getSafetyTemplate();
  const outcomeContent = getOutcomeTemplate();

  const whatSteps = stepIndicesByPhase(trace, ['RESOLUTION', 'EXECUTION']);
  const whySteps = stepIndicesByPhase(trace, ['STATE', 'RESOLUTION']);
  const whyNotSteps = stepIndicesByPhase(trace, ['RESOLUTION']);
  const modeSteps = stepIndicesByPhase(trace, ['MODE']);
  const outcomeSteps = stepIndicesByPhase(trace, ['OUTCOME']);

  const sections: ExplanationSection[] = [
    Object.freeze({ sectionType: 'WHAT', content: whatContent, sourceSteps: whatSteps }),
    Object.freeze({ sectionType: 'WHY', content: whyContent, sourceSteps: whySteps }),
    Object.freeze({ sectionType: 'WHY_NOT', content: whyNotContent, sourceSteps: whyNotSteps }),
    Object.freeze({ sectionType: 'MODE', content: modeContent, sourceSteps: modeSteps }),
    Object.freeze({ sectionType: 'SAFETY', content: safetyContent, sourceSteps: outcomeSteps }),
    Object.freeze({ sectionType: 'OUTCOME', content: outcomeContent, sourceSteps: outcomeSteps }),
  ];

  const summary = `Trace ${trace.traceId}: ${trace.resolutionSummary}. ${trace.executionSummary}. Mode: ${trace.mode}.`;

  const explanationId = `${trace.traceId}-explanation`;

  const withoutHash: Omit<Explanation, 'explanationHash'> = {
    explanationId,
    traceId: trace.traceId,
    summary,
    sections: Object.freeze(sections) as readonly ExplanationSection[],
  };

  const explanationHash = computeExplanationHash({ ...withoutHash, explanationHash: '' });

  return Object.freeze({
    ...withoutHash,
    explanationHash,
  });
}
