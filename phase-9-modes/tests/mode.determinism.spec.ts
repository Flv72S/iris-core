/**
 * Phase 9.1 — Mode determinism tests
 */

import { describe, it, expect } from 'vitest';
import { computeModeHash } from '../definition/mode.hash';
import { MODE_CONTRACT } from '../definition/mode.contract';
import { MODE_CATALOG } from '../definition/mode.catalog';
import type { ModeDefinition } from '../definition/mode.types';

describe('Mode determinism', () => {
  it('hash is stable for same input', () => {
    const mode = MODE_CONTRACT.DEFAULT;
    const payload = {
      id: mode.id,
      description: mode.description,
      affects: mode.affects,
      forbids: mode.forbids,
    };
    const h1 = computeModeHash(payload);
    const h2 = computeModeHash(payload);
    expect(h1).toBe(h2);
  });

  it('catalog is immutable', () => {
    expect(Object.isFrozen(MODE_CATALOG)).toBe(true);
    expect(MODE_CATALOG.length).toBe(3);
    MODE_CATALOG.forEach((m) => expect(Object.isFrozen(m)).toBe(true));
  });

  it('same input produces same output', () => {
    const a = MODE_CONTRACT.FOCUS;
    const b = MODE_CONTRACT.FOCUS;
    expect(a).toEqual(b);
    expect(a.deterministicHash).toBe(b.deterministicHash);
  });

  it('hash matches stored deterministicHash for each mode', () => {
    for (const mode of MODE_CATALOG) {
      const payload: Omit<ModeDefinition, 'deterministicHash'> = {
        id: mode.id,
        description: mode.description,
        affects: mode.affects,
        forbids: mode.forbids,
      };
      expect(computeModeHash(payload)).toBe(mode.deterministicHash);
    }
  });
});
