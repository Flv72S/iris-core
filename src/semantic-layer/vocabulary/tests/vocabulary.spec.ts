/**
 * Semantic Vocabulary — 8.1.2
 * Verifica: vocabolario chiuso, termini vietati, contratti.
 */

import { describe, it, expect } from 'vitest';
import {
  FORBIDDEN_SEMANTIC_TERMS,
  isForbiddenTerm,
  type SemanticStateId,
  type SemanticState,
  type SemanticRanking,
  type SemanticExplanation,
  type SemanticPolicy,
  type Disableable,
} from '../index';

describe('8.1.2 Semantic Vocabulary', () => {
  describe('SemanticStateId — closed set', () => {
    const allowed: SemanticStateId[] = ['active', 'inactive', 'at_risk', 'eligible', 'recommended'];

    it('allowed values are exactly five', () => {
      expect(allowed).toHaveLength(5);
    });

    it('SemanticState shape has killSwitchable true', () => {
      const s: SemanticState = {
        id: 'active',
        scope: 'session',
        validity: { validFrom: 0, validUntil: 100 },
        killSwitchable: true,
      };
      expect(s.killSwitchable).toBe(true);
      expect(s.id).toBe('active');
    });
  });

  describe('Forbidden terms — §4', () => {
    it('FORBIDDEN_SEMANTIC_TERMS includes all §4 types and forbidden state ids', () => {
      expect(FORBIDDEN_SEMANTIC_TERMS).toContain('SemanticTruth');
      expect(FORBIDDEN_SEMANTIC_TERMS).toContain('OptimalDecision');
      expect(FORBIDDEN_SEMANTIC_TERMS).toContain('CorrectAction');
      expect(FORBIDDEN_SEMANTIC_TERMS).toContain('correct');
      expect(FORBIDDEN_SEMANTIC_TERMS).toContain('optimal');
      expect(FORBIDDEN_SEMANTIC_TERMS).toContain('best_choice');
    });

    it('isForbiddenTerm returns true for forbidden terms', () => {
      expect(isForbiddenTerm('optimal')).toBe(true);
      expect(isForbiddenTerm('UserScore')).toBe(true);
    });

    it('isForbiddenTerm returns false for allowed state ids', () => {
      expect(isForbiddenTerm('active')).toBe(false);
      expect(isForbiddenTerm('recommended')).toBe(false);
    });
  });

  describe('Contract shapes', () => {
    it('SemanticRanking has reversible true', () => {
      const r: SemanticRanking = {
        criteria: 'recency',
        direction: 'Desc',
        reversible: true,
      };
      expect(r.reversible).toBe(true);
    });

    it('SemanticExplanation has optional true', () => {
      const e: SemanticExplanation = {
        message: 'key',
        optional: true,
      };
      expect(e.optional).toBe(true);
    });

    it('SemanticPolicy has appliesIf and fallback', () => {
      const p: SemanticPolicy = {
        appliesIf: 'condition',
        fallback: '7.6.limit',
      };
      expect(p.fallback).toBe('7.6.limit');
    });

    it('Disableable has disable()', () => {
      const d: Disableable = {
        disable() {},
      };
      expect(typeof d.disable).toBe('function');
    });
  });
});
