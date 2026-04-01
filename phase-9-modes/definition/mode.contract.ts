/**
 * Phase 9.1 — Mode contract (what each mode can / cannot influence)
 */

import type { BehaviorMode, ModeDefinition, ModeCapability } from './mode.types';
import { computeModeHash } from './mode.hash';

function buildMode(
  id: BehaviorMode,
  description: string,
  affects: ModeDefinition['affects'],
  forbids: ModeDefinition['forbids']
): ModeDefinition {
  const payload = {
    id,
    description,
    affects: Object.freeze([...affects]) as readonly ModeCapability[],
    forbids: Object.freeze([...forbids]) as readonly ModeCapability[],
  };
  const deterministicHash = computeModeHash(payload);
  return Object.freeze({ ...payload, deterministicHash });
}

export const MODE_CONTRACT: Record<BehaviorMode, ModeDefinition> = Object.freeze({
  DEFAULT: buildMode(
    'DEFAULT',
    'Balanced behavior with neutral safety and execution interpretation',
    ['EXECUTION_CONSTRAINTS', 'SAFETY_INTERPRETATION'],
    []
  ),
  FOCUS: buildMode(
    'FOCUS',
    'Strict behavior minimizing interruptions and actions',
    ['EXECUTION_CONSTRAINTS', 'ESCALATION_SENSITIVITY'],
    ['EXPLAINABILITY_TONE']
  ),
  WELLBEING: buildMode(
    'WELLBEING',
    'Protective behavior prioritizing user wellbeing and safety',
    ['SAFETY_INTERPRETATION', 'ESCALATION_SENSITIVITY'],
    ['EXECUTION_CONSTRAINTS']
  ),
});
