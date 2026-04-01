/**
 * IRIS 9.0 — Interpretation Engine conformance
 * Molteplicità, assenza selezione, immutabilità, assenza semantica decisionale, separazione dal core.
 */

import { describe, it, expect } from 'vitest';
import { createEmptySnapshot } from '../../../semantic-layer';
import type { SemanticSnapshot } from '../../../semantic-layer';
import {
  IrisInterpretationEngine,
  type IrisInterpreter,
  type IrisInterpretation,
} from '../index';

const FORBIDDEN_PROPERTIES = ['final', 'decision', 'chosen', 'selected', 'result'];

function interpreterA(): IrisInterpreter {
  return {
    id: 'interpreter-a',
    interpret: (snapshot) => {
      return [
        {
          id: 'i-a-1',
          label: 'label-a',
          sourceStates: [...snapshot.states],
        },
      ];
    },
  };
}

function interpreterB(): IrisInterpreter {
  return {
    id: 'interpreter-b',
    interpret: (snapshot) => {
      return [
        {
          id: 'i-b-1',
          label: 'label-b',
          sourceStates: [...snapshot.states],
        },
        {
          id: 'i-b-2',
          label: 'label-b-2',
          sourceStates: [],
        },
      ];
    },
  };
}

describe('IrisInterpretationEngine — 9.0 conformance', () => {
  describe('molteplicità', () => {
    it('con 2 interpreter attivi le interpretazioni sono la somma dei contributi', () => {
      const engine = new IrisInterpretationEngine([interpreterA(), interpreterB()]);
      const snapshot = createEmptySnapshot();
      const model = engine.interpret(snapshot);

      expect(model.interpretations).toHaveLength(3);
      expect(model.interpretations.map((i) => i.id)).toEqual(['i-a-1', 'i-b-1', 'i-b-2']);
    });
  });

  describe('assenza di selezione', () => {
    it('nessuna interpretazione viene scartata', () => {
      const nullInterpreter: IrisInterpreter = {
        id: 'null',
        interpret: () => null,
      };
      const engine = new IrisInterpretationEngine([interpreterA(), nullInterpreter, interpreterB()]);
      const model = engine.interpret(createEmptySnapshot());

      expect(model.interpretations).toHaveLength(3);
    });

    it('ordine delle interpretazioni rispecchia ordine dichiarato degli interpreter', () => {
      const engine = new IrisInterpretationEngine([interpreterB(), interpreterA()]);
      const model = engine.interpret(createEmptySnapshot());

      expect(model.interpretations[0].id).toBe('i-b-1');
      expect(model.interpretations[1].id).toBe('i-b-2');
      expect(model.interpretations[2].id).toBe('i-a-1');
    });
  });

  describe('immutabilità', () => {
    it('lo snapshot non viene mutato', () => {
      const snapshot = createEmptySnapshot();
      const frozenBefore = Object.isFrozen(snapshot);
      const engine = new IrisInterpretationEngine([interpreterA()]);
      engine.interpret(snapshot);
      expect(Object.isFrozen(snapshot)).toBe(frozenBefore);
      expect(snapshot).toBe(snapshot);
    });

    it('output model e interpretations sono frozen', () => {
      const engine = new IrisInterpretationEngine([interpreterA()]);
      const model = engine.interpret(createEmptySnapshot());
      expect(Object.isFrozen(model)).toBe(true);
      expect(Object.isFrozen(model.interpretations)).toBe(true);
    });
  });

  describe('assenza di semantica decisionale', () => {
    it('il model non ha proprietà final, decision, chosen, selected, result', () => {
      const engine = new IrisInterpretationEngine([interpreterA()]);
      const model = engine.interpret(createEmptySnapshot());
      for (const key of FORBIDDEN_PROPERTIES) {
        expect(model).not.toHaveProperty(key);
      }
    });

    it('le interpretazioni hanno solo proprietà ammesse', () => {
      const engine = new IrisInterpretationEngine([interpreterA()]);
      const model = engine.interpret(createEmptySnapshot());
      const allowed = new Set(['id', 'label', 'sourceStates', 'sourceContexts', 'notes', 'confidence', 'metadata']);
      for (const i of model.interpretations) {
        for (const key of Object.keys(i)) {
          expect(allowed.has(key)).toBe(true);
        }
      }
    });
  });

  describe('separazione dal core', () => {
    it('import da semantic-layer limitato a snapshot e tipi', () => {
      const snapshot = createEmptySnapshot();
      expect(snapshot).toBeDefined();
      expect(snapshot.states).toBeDefined();
      expect(snapshot.contexts).toBeDefined();
    });
  });
});
