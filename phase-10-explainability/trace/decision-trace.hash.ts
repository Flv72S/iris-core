import type { DecisionTrace, DecisionTraceStep } from './decision-trace.types';

const TRACE_KEYS: (keyof DecisionTrace)[] = ['traceId', 'timestamp', 'mode', 'resolutionSummary', 'executionSummary', 'outcomeSummary', 'steps'];
const STEP_KEYS: (keyof DecisionTraceStep)[] = ['stepIndex', 'phase', 'inputSnapshotHash', 'appliedRuleOrPolicy', 'result', 'notes'];

function hashString(s: string): string {
  if (typeof process !== 'undefined' && process.versions?.node) {
    const crypto = require('node:crypto');
    return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
  }
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function stableStringifyStep(step: DecisionTraceStep): string {
  return STEP_KEYS.filter((k) => (step as Record<string, unknown>)[k] !== undefined)
    .map((k) => JSON.stringify(k) + ':' + JSON.stringify((step as Record<string, unknown>)[k]))
    .sort()
    .join(',');
}

function stableStringifyTrace(trace: Omit<DecisionTrace, 'traceHash'>): string {
  const parts: string[] = [];
  for (const k of TRACE_KEYS) {
    if (k === 'steps') parts.push(trace.steps.map(stableStringifyStep).join('|'));
    else parts.push(JSON.stringify((trace as Record<string, unknown>)[k]));
  }
  return parts.join('\n');
}

export function computeDecisionTraceHash(trace: Omit<DecisionTrace, 'traceHash'>): string {
  return hashString(stableStringifyTrace(trace));
}
