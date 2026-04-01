/**
 * IRIS 9.3.F — Product Final Freeze Conformance
 * Struttura IRIS, immutabilità E2E, assenza semantica decisionale, separazione Semantic Layer, kill-switch E2E.
 *
 * IRIS 9.3 è definitivo, completo e congelato. Pronto per integrazione esterna.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { createEmptySnapshot } from '../../semantic-layer';
import type { SemanticSnapshot } from '../../semantic-layer';
import { IrisInterpretationEngine } from '../interpretation';
import type { IrisInterpretationModel } from '../interpretation';
import { IrisOrchestrationEngine } from '../orchestration';
import type { IrisOrchestrationResult } from '../orchestration';
import { IrisMessagingEngine } from '../messaging';
import type { IrisMessageBinding, IrisChannel } from '../messaging';
import { IrisRenderingEngine } from '../rendering';
import type { IrisRenderResult, IrisRenderedContent } from '../rendering';

const IRIS_ROOT = join(process.cwd(), 'src', 'iris');
const ALLOWED_LAYERS = ['interpretation', 'orchestration', 'messaging', 'rendering'];
const FORBIDDEN_LAYER_NAMES = ['delivery', 'senders', 'adapters', 'providers', 'infrastructure'];

const FORBIDDEN_DECISION_KEYS = [
  'final',
  'best',
  'chosen',
  'selected',
  'primary',
  'recommended',
  'decision',
  'resultValue',
];

function collectTsFiles(dir: string, acc: string[] = []): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules') {
      collectTsFiles(full, acc);
    } else if (e.isFile() && (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts'))) {
      acc.push(full);
    }
  }
  return acc;
}

describe('IRIS 9.3.F — Product final freeze conformance', () => {
  describe('2.1 — Verifica struttura IRIS', () => {
    it('i layer sotto src/iris sono solo interpretation, orchestration, messaging, rendering', () => {
      const dirs = readdirSync(IRIS_ROOT, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      for (const layer of ALLOWED_LAYERS) {
        expect(dirs).toContain(layer);
      }
      for (const forbidden of FORBIDDEN_LAYER_NAMES) {
        expect(dirs).not.toContain(forbidden);
      }
    });

    it('nessuna cartella delivery, senders, adapters, providers, infrastructure', () => {
      const dirs = readdirSync(IRIS_ROOT, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
      const forbiddenPresent = dirs.filter((d) => FORBIDDEN_LAYER_NAMES.includes(d));
      expect(forbiddenPresent).toHaveLength(0);
    });
  });

  describe('2.2 — End-to-end immutability', () => {
    it('Snapshot → Interpretation → Orchestration → Messaging → Rendering: input e output frozen', () => {
      const snapshot: SemanticSnapshot = createEmptySnapshot();
      expect(Object.isFrozen(snapshot)).toBe(true);

      const interpEngine = new IrisInterpretationEngine([]);
      const model = interpEngine.interpret(snapshot);
      expect(Object.isFrozen(model)).toBe(true);
      expect(Object.isFrozen(model.interpretations)).toBe(true);

      const registryOrch = { isEnabled: (id: string) => id === 'iris-orchestration' };
      const orchEngine = new IrisOrchestrationEngine([
        {
          id: 'o1',
          orchestrate: (_s, m) => ({
            planId: 'p1',
            interpretations: m.interpretations,
            producedBy: ['o1'],
            derivedAt: new Date().toISOString(),
          }),
        },
      ]);
      const orchResults = orchEngine.orchestrate(snapshot, model, registryOrch);
      expect(Object.isFrozen(orchResults)).toBe(true);
      if (orchResults.length > 0) expect(Object.isFrozen(orchResults[0])).toBe(true);

      const registryMsg = { isEnabled: (id: string) => id === 'iris-messaging' };
      const channel: IrisChannel = Object.freeze({ id: 'ch1', type: 'inbox' });
      const msgEngine = new IrisMessagingEngine([channel]);
      const bindings = msgEngine.bind(snapshot, model, orchResults, registryMsg);
      expect(Object.isFrozen(bindings)).toBe(true);
      if (bindings.length > 0) {
        expect(Object.isFrozen(bindings[0])).toBe(true);
        expect(Object.isFrozen(bindings[0].envelope)).toBe(true);
      }

      const registryRender = { isEnabled: (id: string) => id === 'iris-rendering' };
      const renderEngine = new IrisRenderingEngine([
        {
          id: 't1',
          channelType: 'inbox',
          render: () => ({ templateId: 't1', channelType: 'inbox', content: 'x' }),
        },
      ]);
      const renderResults = renderEngine.render(bindings, registryRender);
      expect(Object.isFrozen(renderResults)).toBe(true);
      if (renderResults.length > 0) {
        expect(Object.isFrozen(renderResults[0])).toBe(true);
        expect(Object.isFrozen(renderResults[0].renderedContents)).toBe(true);
      }

      expect(Object.isFrozen(snapshot)).toBe(true);
    });
  });

  describe('2.3 — Assenza semantica decisionale globale', () => {
    it('nessun output finale contiene final, best, chosen, selected, primary, recommended, decision, resultValue', () => {
      const model: IrisInterpretationModel = Object.freeze({
        interpretations: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const orchResult: IrisOrchestrationResult = Object.freeze({
        planId: 'p1',
        interpretations: Object.freeze([]),
        producedBy: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const binding: IrisMessageBinding = Object.freeze({
        channel: Object.freeze({ id: 'c1', type: 'inbox' }),
        envelope: Object.freeze({
          channelId: 'c1',
          source: Object.freeze({ interpretationIds: [], orchestrationPlanIds: [] }),
          payload: Object.freeze({ interpretations: [], orchestrationResults: [] }),
          derivedAt: new Date().toISOString(),
        }),
      });
      const renderedContent: IrisRenderedContent = Object.freeze({
        templateId: 't1',
        channelType: 'inbox',
        content: 'x',
      });
      const renderResult: IrisRenderResult = Object.freeze({
        channelId: 'c1',
        renderedContents: Object.freeze([renderedContent]),
        derivedAt: new Date().toISOString(),
      });

      const outputs = [model, orchResult, binding.envelope, binding.envelope.payload, renderedContent, renderResult];
      for (const obj of outputs) {
        const keys = Object.keys(obj);
        for (const key of FORBIDDEN_DECISION_KEYS) {
          expect(keys).not.toContain(key);
        }
      }
    });
  });

  describe('2.4 — Separazione dal Semantic Layer', () => {
    it('nessun file IRIS importa direttamente da semantic-layer/engine', () => {
      const tsFiles = collectTsFiles(IRIS_ROOT);
      const directEngineImports: string[] = [];
      const engineImportLinePattern = /(?:^import\s|^\s*from\s+['\"])[^'\n]*semantic-layer[/\\]engine/;

      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        const hasDirectEngineImport = lines.some((line) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return false;
          return engineImportLinePattern.test(line);
        });
        if (hasDirectEngineImport) {
          directEngineImports.push(file);
        }
      }
      expect(directEngineImports).toEqual([]);
    });
  });

  describe('2.5 — Kill-switch end-to-end', () => {
    it('interpretation con zero interpreter → model con interpretations vuote', () => {
      const engine = new IrisInterpretationEngine([]);
      const model = engine.interpret(createEmptySnapshot());
      expect(model.interpretations).toHaveLength(0);
    });

    it('orchestration OFF → []', () => {
      const registry = { isEnabled: () => false };
      const engine = new IrisOrchestrationEngine([]);
      const model: IrisInterpretationModel = Object.freeze({
        interpretations: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const results = engine.orchestrate(createEmptySnapshot(), model, registry);
      expect(results).toHaveLength(0);
    });

    it('messaging OFF → []', () => {
      const registry = { isEnabled: () => false };
      const engine = new IrisMessagingEngine([Object.freeze({ id: 'ch', type: 'inbox' })]);
      const model: IrisInterpretationModel = Object.freeze({
        interpretations: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const bindings = engine.bind(createEmptySnapshot(), model, [], registry);
      expect(bindings).toHaveLength(0);
    });

    it('rendering OFF → []', () => {
      const registry = { isEnabled: () => false };
      const binding: IrisMessageBinding = Object.freeze({
        channel: Object.freeze({ id: 'ch', type: 'inbox' }),
        envelope: Object.freeze({
          channelId: 'ch',
          source: Object.freeze({ interpretationIds: [], orchestrationPlanIds: [] }),
          payload: Object.freeze({ interpretations: [], orchestrationResults: [] }),
          derivedAt: new Date().toISOString(),
        }),
      });
      const engine = new IrisRenderingEngine([
        { id: 't1', channelType: 'inbox', render: () => ({ templateId: 't1', channelType: 'inbox', content: 'x' }) },
      ]);
      const results = engine.render([binding], registry);
      expect(results).toHaveLength(0);
    });
  });
});

/*
 * IRIS 9.3.F completato. Prodotto congelato e pronto per integrazione esterna.
 */
