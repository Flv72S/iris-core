import type { SafetyChecklistVerdict } from '../../safety/checklist/safety-checklist.types';
import type { BoundaryEscalationEvent, BoundaryEscalationLevel } from './boundary-escalation.types';

const STATUS_TO_LEVEL: Record<SafetyChecklistVerdict['status'], BoundaryEscalationLevel> = {
  SAFE: 'NONE',
  WARNING: 'OBSERVE',
  UNSAFE: 'BLOCK_RECOMMENDED',
};

function hashString(s: string): string {
  if (typeof process !== 'undefined' && process.versions?.node) {
    const crypto = require('node:crypto');
    return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
  }
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

function stableStringifyEscalation(payload: Omit<BoundaryEscalationEvent, 'deterministicHash'>): string {
  const parts = [
    JSON.stringify(payload.level),
    JSON.stringify(payload.checklistStatus),
    JSON.stringify([...payload.violatedRules].sort()),
    JSON.stringify(payload.explanation),
  ];
  return parts.join('\n');
}

export function createBoundaryEscalationEvent(verdict: SafetyChecklistVerdict): BoundaryEscalationEvent {
  const level = STATUS_TO_LEVEL[verdict.status];
  const violatedRules = Object.freeze([...verdict.violatedRules]) as readonly string[];
  const payload = {
    level,
    checklistStatus: verdict.status,
    violatedRules,
    explanation: verdict.explanation,
  };
  const deterministicHash = hashString(stableStringifyEscalation(payload));
  return Object.freeze({ ...payload, deterministicHash });
}
