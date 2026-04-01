/**
 * 8.2.3 — Conformità Explanation & Suggestions Contract
 * Test di equivalenza snapshot (explanations ON vs OFF) e assenza proprietà view/projection/final.
 */

import { describe, it, expect } from 'vitest';
import {
  SemanticEngine,
  createEmptySnapshot,
  SEMANTIC_ENGINE_COMPONENT_ID,
  SEMANTIC_EXPLANATIONS_COMPONENT_ID,
} from '../index';
import { Phase8KillSwitchRegistryImpl } from '../../kill-switch/Phase8KillSwitchRegistryImpl';
import { createSemanticOverlay } from '../../contracts';
import type { SemanticModule } from '../SemanticModule';
import type { SemanticSnapshot } from '../SemanticSnapshot';

function moduleWithExplanations(): SemanticModule {
  return {
    evaluate: (input) =>
      createSemanticOverlay(
        input,
        {
          explanations: [
            { message: 'info', reasonCode: 'reason-1', optional: true as const },
          ],
        },
        { kind: 'explicit', invalidateOnlyByCall: true }
      ),
    disable: () => {},
  };
}

describe('8.2.3 — Explanations conformance', () => {
  describe('equivalenza snapshot: explanations ON vs OFF', () => {
    it('con explanations OFF tutti gli altri campi sono identici a ON; explanations vuoto', () => {
      const registryOn = new Phase8KillSwitchRegistryImpl([
        SEMANTIC_ENGINE_COMPONENT_ID,
        SEMANTIC_EXPLANATIONS_COMPONENT_ID,
      ]);
      const registryOff = new Phase8KillSwitchRegistryImpl([
        SEMANTIC_ENGINE_COMPONENT_ID,
      ]);

      const mod = moduleWithExplanations();
      const engineOn = new SemanticEngine(registryOn, [mod]);
      const engineOff = new SemanticEngine(registryOff, [mod]);

      const input = Object.freeze({});
      const snapshotWith = engineOn.evaluate(input);
      const snapshotWithout = engineOff.evaluate(input);

      expect(snapshotWithout.states).toEqual(snapshotWith.states);
      expect(snapshotWithout.contexts).toEqual(snapshotWith.contexts);
      expect(snapshotWithout.rankings).toEqual(snapshotWith.rankings);
      expect(snapshotWithout.policies).toEqual(snapshotWith.policies);
      expect(snapshotWithout.explanations).toEqual([]);
      expect(snapshotWith.explanations.length).toBeGreaterThan(0);
    });
  });

  describe('no view semantics: snapshot non ha view / projection / final', () => {
    it('snapshot non ha proprietà view', () => {
      const snapshot = createEmptySnapshot();
      expect(snapshot).not.toHaveProperty('view');
    });

    it('snapshot non ha proprietà projection', () => {
      const snapshot = createEmptySnapshot();
      expect(snapshot).not.toHaveProperty('projection');
    });

    it('snapshot non ha proprietà final', () => {
      const snapshot = createEmptySnapshot();
      expect(snapshot).not.toHaveProperty('final');
    });

    it('snapshot ha solo le proprietà ammesse (states, contexts, rankings, explanations, policies)', () => {
      const snapshot = createEmptySnapshot();
      const keys = Object.keys(snapshot);
      expect(keys.sort()).toEqual(['contexts', 'explanations', 'policies', 'rankings', 'states']);
    });
  });
});
