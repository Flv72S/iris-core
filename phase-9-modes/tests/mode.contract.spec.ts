import { describe, it, expect } from 'vitest';
import { MODE_CONTRACT } from '../definition/mode.contract';
import type { BehaviorMode, ModeCapability } from '../definition/mode.types';

const ALL_CAPABILITIES: ModeCapability[] = [
  'EXECUTION_CONSTRAINTS',
  'SAFETY_INTERPRETATION',
  'ESCALATION_SENSITIVITY',
  'EXPLAINABILITY_TONE',
];

const MODES: BehaviorMode[] = ['DEFAULT', 'FOCUS', 'WELLBEING'];

describe('Mode contract', () => {
  it('every mode has coherent affects', () => {
    for (const id of MODES) {
      const mode = MODE_CONTRACT[id];
      expect(Array.isArray(mode.affects)).toBe(true);
      mode.affects.forEach((c) => expect(ALL_CAPABILITIES).toContain(c));
    }
  });

  it('every mode has coherent forbids', () => {
    for (const id of MODES) {
      const mode = MODE_CONTRACT[id];
      expect(Array.isArray(mode.forbids)).toBe(true);
      mode.forbids.forEach((c) => expect(ALL_CAPABILITIES).toContain(c));
    }
  });

  it('no capability in both affects and forbids', () => {
    for (const id of MODES) {
      const mode = MODE_CONTRACT[id];
      const forbidsSet = new Set(mode.forbids);
      mode.affects.forEach((c) => expect(forbidsSet.has(c)).toBe(false));
    }
  });

  it('no mode violates architectural constraints', () => {
    for (const id of MODES) {
      const mode = MODE_CONTRACT[id];
      expect(mode.id).toBe(id);
      expect(typeof mode.description).toBe('string');
      expect(mode.deterministicHash).toBeDefined();
    }
  });
});
