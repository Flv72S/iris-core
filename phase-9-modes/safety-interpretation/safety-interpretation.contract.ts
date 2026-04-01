/**
 * Phase 9.3 — Verdict × Mode → Interpretation matrix
 */

import type { SafetyVerdict, SafetyInterpretation } from './safety-interpretation.types';
import type { BehaviorMode } from '../definition/mode.types';

type Row = Record<SafetyVerdict, Omit<SafetyInterpretation, 'mode' | 'baseVerdict'>>;

function row(
  safe: Row['SAFE'],
  caution: Row['CAUTION'],
  unsafe: Row['UNSAFE'],
  blocked: Row['BLOCKED']
): Row {
  return Object.freeze({ SAFE: safe, CAUTION: caution, UNSAFE: unsafe, BLOCKED: blocked });
}

export const SAFETY_INTERPRETATION_MATRIX: Record<BehaviorMode, Row> = Object.freeze({
  DEFAULT: row(
    Object.freeze({
      interpretedRiskLevel: 'LOW',
      recommendedAction: 'PROCEED',
      explanation: 'Safety checklist passed with no concerns.',
    }),
    Object.freeze({
      interpretedRiskLevel: 'MEDIUM',
      recommendedAction: 'PROCEED_WITH_LIMITS',
      explanation: 'Minor safety concerns detected.',
    }),
    Object.freeze({
      interpretedRiskLevel: 'HIGH',
      recommendedAction: 'ESCALATE',
      explanation: 'Safety risks require escalation.',
    }),
    Object.freeze({
      interpretedRiskLevel: 'CRITICAL',
      recommendedAction: 'BLOCK_RECOMMENDED',
      explanation: 'Safety rules explicitly block execution.',
    })
  ),
  FOCUS: row(
    Object.freeze({
      interpretedRiskLevel: 'LOW',
      recommendedAction: 'PROCEED_WITH_LIMITS',
      explanation: 'Safe but constrained due to focus mode.',
    }),
    Object.freeze({
      interpretedRiskLevel: 'HIGH',
      recommendedAction: 'ESCALATE',
      explanation: 'Caution elevated in focus mode.',
    }),
    Object.freeze({
      interpretedRiskLevel: 'CRITICAL',
      recommendedAction: 'BLOCK_RECOMMENDED',
      explanation: 'Unsafe actions blocked in focus mode.',
    }),
    Object.freeze({
      interpretedRiskLevel: 'CRITICAL',
      recommendedAction: 'BLOCK_RECOMMENDED',
      explanation: 'Safety rules explicitly block execution.',
    })
  ),
  WELLBEING: row(
    Object.freeze({
      interpretedRiskLevel: 'MEDIUM',
      recommendedAction: 'PROCEED_WITH_LIMITS',
      explanation: 'Safe but monitored for wellbeing.',
    }),
    Object.freeze({
      interpretedRiskLevel: 'HIGH',
      recommendedAction: 'BLOCK_RECOMMENDED',
      explanation: 'Caution escalated to protective block.',
    }),
    Object.freeze({
      interpretedRiskLevel: 'CRITICAL',
      recommendedAction: 'BLOCK_RECOMMENDED',
      explanation: 'Unsafe actions blocked for wellbeing.',
    }),
    Object.freeze({
      interpretedRiskLevel: 'CRITICAL',
      recommendedAction: 'BLOCK_RECOMMENDED',
      explanation: 'Safety rules explicitly block execution.',
    })
  ),
});
