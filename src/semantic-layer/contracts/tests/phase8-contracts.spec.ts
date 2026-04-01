/**
 * Phase 8 Architectural Contracts — structural tests
 * Microsteps 8.1.0 + 8.1.1
 *
 * Verifies: overlay is reversible, kill-switch registry behaves, neutral overlay equals base-only.
 */

import { describe, it, expect } from 'vitest';
import {
  createSemanticOverlay,
  neutralOverlay,
  PHASE7_READONLY_CONTRACT,
  KILL_SWITCH_REQUIRED,
  FALLBACK_CONTRACT,
} from '../index';
import { Phase8KillSwitchRegistryImpl } from '../../kill-switch/Phase8KillSwitchRegistryImpl';

describe('Phase 8 Contracts', () => {
  describe('SemanticOverlay', () => {
    it('neutralOverlay exposes only base, overlay is null', () => {
      const base = Object.freeze({ id: '1', title: 'x' });
      const view = neutralOverlay(base);
      expect(view.base).toBe(base);
      expect(view.overlay).toBeNull();
      expect(view.fallbackToNeutrality).toBe(true);
    });

    it('createSemanticOverlay with overlay preserves base and duration', () => {
      const base = Object.freeze({ id: '2' });
      const overlay = { rank: 1 };
      const view = createSemanticOverlay(base, overlay, { kind: 'ttl', ttlMs: 1000 });
      expect(view.base).toBe(base);
      expect(view.overlay).toEqual(overlay);
      expect(view.duration).toEqual({ kind: 'ttl', ttlMs: 1000 });
    });
  });

  describe('Phase8KillSwitchRegistryImpl', () => {
    it('component disabled by default', () => {
      const reg = new Phase8KillSwitchRegistryImpl();
      expect(reg.isEnabled('any')).toBe(false);
    });

    it('setEnabled enables component', () => {
      const reg = new Phase8KillSwitchRegistryImpl();
      reg.setEnabled('semantic.ranking', true);
      expect(reg.isEnabled('semantic.ranking')).toBe(true);
    });

    it('disableAll clears all', () => {
      const reg = new Phase8KillSwitchRegistryImpl(['a', 'b']);
      reg.disableAll();
      expect(reg.isEnabled('a')).toBe(false);
      expect(reg.isEnabled('b')).toBe(false);
    });
  });

  describe('Contract constants (documentation)', () => {
    it('Phase 7 read-only contract is non-empty', () => {
      expect(PHASE7_READONLY_CONTRACT.length).toBeGreaterThan(0);
      expect(PHASE7_READONLY_CONTRACT).toContain('Phase 8');
    });
    it('Kill-switch required is non-empty', () => {
      expect(KILL_SWITCH_REQUIRED.length).toBeGreaterThan(0);
    });
    it('Fallback contract is non-empty', () => {
      expect(FALLBACK_CONTRACT.length).toBeGreaterThan(0);
    });
  });
});
