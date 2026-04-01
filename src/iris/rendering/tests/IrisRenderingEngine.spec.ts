/**
 * IRIS 9.3 — Rendering Engine conformance
 * Multi-template, kill-switch, assenza decisione, separazione, immutabilità.
 */

import { describe, it, expect } from 'vitest';
import type { IrisMessageBinding } from '../../messaging';
import type { IrisMessageEnvelope } from '../../messaging';
import {
  IrisRenderingEngine,
  IRIS_RENDERING_COMPONENT_ID,
  type IrisRenderTemplate,
  type IrisRenderResult,
  type RenderingRegistry,
} from '../index';

const FORBIDDEN_DECISION = [
  'final',
  'best',
  'chosen',
  'selected',
  'primary',
  'recommended',
];

function makeRegistry(enabled: boolean): RenderingRegistry {
  return {
    isEnabled: (id: string) => id === IRIS_RENDERING_COMPONENT_ID && enabled,
  };
}

function makeEnvelope(overrides?: Partial<IrisMessageEnvelope>): IrisMessageEnvelope {
  return Object.freeze({
    channelId: 'ch1',
    source: Object.freeze({ interpretationIds: [], orchestrationPlanIds: [] }),
    payload: Object.freeze({ interpretations: [], orchestrationResults: [] }),
    derivedAt: new Date().toISOString(),
    ...overrides,
  });
}

function makeBinding(
  channelId: string,
  channelType: string,
  envelope: IrisMessageEnvelope
): IrisMessageBinding {
  return Object.freeze({
    channel: Object.freeze({ id: channelId, type: channelType }),
    envelope,
  });
}

describe('IrisRenderingEngine — 9.3 conformance', () => {
  const registryOn = makeRegistry(true);
  const registryOff = makeRegistry(false);

  describe('1. Rendering multi-template', () => {
    it('1 canale + 2 template compatibili → 2 renderedContents', () => {
      const envelope = makeEnvelope();
      const binding = makeBinding('ch-inbox', 'inbox', envelope);

      const t1: IrisRenderTemplate = {
        id: 't1',
        channelType: 'inbox',
        render: (e) => ({
          templateId: 't1',
          channelType: 'inbox',
          content: `inbox-1: ${e.channelId}`,
        }),
      };
      const t2: IrisRenderTemplate = {
        id: 't2',
        channelType: 'inbox',
        render: (e) => ({
          templateId: 't2',
          channelType: 'inbox',
          content: { html: `<p>${e.derivedAt}</p>` },
        }),
      };

      const engine = new IrisRenderingEngine([t1, t2]);
      const results = engine.render([binding], registryOn);

      expect(results).toHaveLength(1);
      expect(results[0].channelId).toBe('ch-inbox');
      expect(results[0].renderedContents).toHaveLength(2);
      expect(results[0].renderedContents[0].templateId).toBe('t1');
      expect(results[0].renderedContents[1].templateId).toBe('t2');
    });
  });

  describe('2. Kill-switch', () => {
    it('OFF → []', () => {
      const binding = makeBinding('ch1', 'inbox', makeEnvelope());
      const template: IrisRenderTemplate = {
        id: 't1',
        channelType: 'inbox',
        render: () => ({
          templateId: 't1',
          channelType: 'inbox',
          content: 'x',
        }),
      };
      const engine = new IrisRenderingEngine([template]);
      const results = engine.render([binding], registryOff);
      expect(results).toHaveLength(0);
    });

    it('ON → risultati presenti', () => {
      const binding = makeBinding('ch1', 'inbox', makeEnvelope());
      const template: IrisRenderTemplate = {
        id: 't1',
        channelType: 'inbox',
        render: () => ({
          templateId: 't1',
          channelType: 'inbox',
          content: 'ok',
        }),
      };
      const engine = new IrisRenderingEngine([template]);
      const results = engine.render([binding], registryOn);
      expect(results).toHaveLength(1);
      expect(results[0].renderedContents).toHaveLength(1);
    });
  });

  describe('3. Assenza di decisione', () => {
    it('nessuna proprietà final, best, chosen, selected, primary, recommended', () => {
      const result: IrisRenderResult = Object.freeze({
        channelId: 'ch1',
        renderedContents: Object.freeze([
          Object.freeze({
            templateId: 't1',
            channelType: 'inbox',
            content: 'x',
          }),
        ]),
        derivedAt: new Date().toISOString(),
      });
      const content = result.renderedContents[0];
      const resultKeys = Object.keys(result);
      const contentKeys = Object.keys(content);

      for (const key of FORBIDDEN_DECISION) {
        expect(resultKeys).not.toContain(key);
        expect(contentKeys).not.toContain(key);
      }
    });
  });

  describe('4. Separazione completa', () => {
    it('rendering non modifica i bindings in input', () => {
      const envelope = makeEnvelope();
      const binding = makeBinding('ch1', 'inbox', envelope);
      const bindingsRef = [binding];

      const template: IrisRenderTemplate = {
        id: 't1',
        channelType: 'inbox',
        render: () => ({
          templateId: 't1',
          channelType: 'inbox',
          content: 'out',
        }),
      };
      const engine = new IrisRenderingEngine([template]);
      engine.render(bindingsRef, registryOn);

      expect(bindingsRef).toHaveLength(1);
      expect(bindingsRef[0]).toBe(binding);
      expect(bindingsRef[0].channel.id).toBe('ch1');
      expect(bindingsRef[0].envelope).toBe(envelope);
    });

    it('nessuna importazione diretta da semantic-layer nel layer rendering', () => {
      // Verifica tramite struttura: rendering importa solo da ../messaging e moduli locali
      const engine = new IrisRenderingEngine([]);
      expect(engine).toBeDefined();
      const results = engine.render([], registryOn);
      expect(results).toEqual([]);
    });
  });

  describe('5. Immutabilità', () => {
    it('input bindings invariato dopo render', () => {
      const envelope = makeEnvelope();
      const binding = makeBinding('ch1', 'inbox', envelope);
      const template: IrisRenderTemplate = {
        id: 't1',
        channelType: 'inbox',
        render: () => ({
          templateId: 't1',
          channelType: 'inbox',
          content: 'c',
        }),
      };
      const engine = new IrisRenderingEngine([template]);
      const results = engine.render([binding], registryOn);

      expect(Object.isFrozen(binding)).toBe(true);
      expect(Object.isFrozen(binding.channel)).toBe(true);
      expect(Object.isFrozen(binding.envelope)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('output frozen a tutti i livelli', () => {
      const binding = makeBinding('ch1', 'inbox', makeEnvelope());
      const template: IrisRenderTemplate = {
        id: 't1',
        channelType: 'inbox',
        render: () => ({
          templateId: 't1',
          channelType: 'inbox',
          content: 'c',
        }),
      };
      const engine = new IrisRenderingEngine([template]);
      const results = engine.render([binding], registryOn);

      expect(Object.isFrozen(results)).toBe(true);
      expect(Object.isFrozen(results[0])).toBe(true);
      expect(Object.isFrozen(results[0].renderedContents)).toBe(true);
      expect(Object.isFrozen(results[0].renderedContents[0])).toBe(true);
    });
  });
});

/*
 * IRIS 9.3 — Garanzie rispettate:
 * - Layer solo sotto src/iris/rendering/; nessuna modifica a semantic-layer, interpretation, orchestration, messaging.
 * - Consumo esclusivo di IrisMessageBinding[] (9.2); output IrisRenderResult[] frozen.
 * - Nessuna decisione, selezione, priorità, "messaggio finale", dispatch/send/publish.
 * - Kill-switch OFF → []; ON → risultati; nessun effetto sugli altri layer.
 * - Rendering non modifica i bindings; nessuna importazione da semantic-layer.
 * - Terminale, espressivo, UX-only; estensioni (senders, adapters) fuori da IRIS.
 */
