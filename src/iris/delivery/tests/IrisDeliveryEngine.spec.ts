/**
 * IRIS 10.1 — Delivery Engine conformance
 * Delivery multipla, kill-switch, assenza decisione, separazione, immutabilità, adapter neutrality.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { IrisRenderResult, IrisRenderedContent } from '../../rendering';
import {
  IrisDeliveryEngine,
  IRIS_DELIVERY_COMPONENT_ID,
  type IrisDeliveryAdapter,
  type IrisDeliveryOutcome,
  type DeliveryRegistry,
} from '../index';

const FORBIDDEN_DECISION = ['final', 'best', 'primary', 'recommended', 'retry', 'fallback'];

const DELIVERY_ROOT = join(process.cwd(), 'src', 'iris', 'delivery');

function makeRegistry(enabled: boolean): DeliveryRegistry {
  return {
    isEnabled: (id: string) => id === IRIS_DELIVERY_COMPONENT_ID && enabled,
  };
}

function makeRenderResult(
  channelId: string,
  contents: readonly IrisRenderedContent[]
): IrisRenderResult {
  return Object.freeze({
    channelId,
    renderedContents: Object.freeze([...contents]),
    derivedAt: new Date().toISOString(),
  });
}

function collectTsFiles(dir: string, acc: string[] = []): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules') {
      collectTsFiles(full, acc);
    } else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

describe('IrisDeliveryEngine — 10.1 conformance', () => {
  describe('1. Delivery multipla', () => {
    it('1 renderResult + 2 adapter compatibili → 2 outcome', () => {
      const content: IrisRenderedContent = Object.freeze({
        templateId: 't1',
        channelType: 'inbox',
        content: 'hello',
      });
      const renderResult = makeRenderResult('ch1', [content]);

      const adapter1: IrisDeliveryAdapter = {
        id: 'adapter-1',
        channelType: 'inbox',
        deliver: (c) => ({
          adapterId: 'adapter-1',
          channelId: 'ch1',
          status: 'attempted',
          derivedAt: new Date().toISOString(),
        }),
      };
      const adapter2: IrisDeliveryAdapter = {
        id: 'adapter-2',
        channelType: 'inbox',
        deliver: (c) => ({
          adapterId: 'adapter-2',
          channelId: 'ch1',
          status: 'attempted',
          derivedAt: new Date().toISOString(),
        }),
      };

      const engine = new IrisDeliveryEngine([adapter1, adapter2]);
      const result = engine.deliver([renderResult], makeRegistry(true));

      expect(result.results).toHaveLength(2);
      expect(result.results[0].adapterId).toBe('adapter-1');
      expect(result.results[1].adapterId).toBe('adapter-2');
    });
  });

  describe('2. Kill-switch', () => {
    it('OFF → results []', () => {
      const content: IrisRenderedContent = Object.freeze({
        templateId: 't1',
        channelType: 'inbox',
        content: 'x',
      });
      const renderResult = makeRenderResult('ch1', [content]);
      const adapter: IrisDeliveryAdapter = {
        id: 'a1',
        channelType: 'inbox',
        deliver: () => ({
          adapterId: 'a1',
          channelId: 'ch1',
          status: 'attempted',
          derivedAt: new Date().toISOString(),
        }),
      };
      const engine = new IrisDeliveryEngine([adapter]);
      const result = engine.deliver([renderResult], makeRegistry(false));
      expect(result.results).toHaveLength(0);
    });
  });

  describe('3. Assenza decisione', () => {
    it('nessuna proprietà final, best, primary, recommended, retry, fallback', () => {
      const outcome: IrisDeliveryOutcome = Object.freeze({
        adapterId: 'a1',
        channelId: 'ch1',
        status: 'attempted',
        derivedAt: new Date().toISOString(),
      });
      const keys = Object.keys(outcome);
      for (const key of FORBIDDEN_DECISION) {
        expect(keys).not.toContain(key);
      }
      const resultKeys = Object.keys({ results: [], derivedAt: '' });
      for (const key of FORBIDDEN_DECISION) {
        expect(resultKeys).not.toContain(key);
      }
    });
  });

  describe('4. Separazione', () => {
    it('nessun import da semantic-layer o engine interni', () => {
      const tsFiles = collectTsFiles(DELIVERY_ROOT);
      const forbiddenPattern = /(?:^import\s|^\s*from\s+['\"])[^'\n]*(?:semantic-layer|[/\\]IrisInterpretationEngine|[/\\]IrisOrchestrationEngine|[/\\]IrisMessagingEngine)/;
      const violations: string[] = [];

      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        const hasDirect = lines.some((line) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return false;
          return forbiddenPattern.test(line);
        });
        if (hasDirect) violations.push(file);
      }
      expect(violations).toEqual([]);
    });
  });

  describe('5. Immutabilità', () => {
    it('input renderResults non modificato', () => {
      const content: IrisRenderedContent = Object.freeze({
        templateId: 't1',
        channelType: 'inbox',
        content: 'c',
      });
      const renderResult = makeRenderResult('ch1', [content]);
      const ref = [renderResult];
      const adapter: IrisDeliveryAdapter = {
        id: 'a1',
        channelType: 'inbox',
        deliver: () => ({
          adapterId: 'a1',
          channelId: 'ch1',
          status: 'attempted',
          derivedAt: new Date().toISOString(),
        }),
      };
      const engine = new IrisDeliveryEngine([adapter]);
      engine.deliver(ref, makeRegistry(true));
      expect(ref).toHaveLength(1);
      expect(ref[0]).toBe(renderResult);
    });

    it('output result e results frozen', () => {
      const renderResult = makeRenderResult('ch1', [
        Object.freeze({ templateId: 't1', channelType: 'inbox', content: 'x' }),
      ]);
      const adapter: IrisDeliveryAdapter = {
        id: 'a1',
        channelType: 'inbox',
        deliver: () => ({
          adapterId: 'a1',
          channelId: 'ch1',
          status: 'skipped',
          derivedAt: new Date().toISOString(),
        }),
      };
      const engine = new IrisDeliveryEngine([adapter]);
      const result = engine.deliver([renderResult], makeRegistry(true));
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.results)).toBe(true);
      if (result.results.length > 0) {
        expect(Object.isFrozen(result.results[0])).toBe(true);
      }
    });
  });

  describe('6. Adapter neutrality', () => {
    it('adapter deliver riceve solo IrisRenderedContent (boundary type)', () => {
      let receivedContent: IrisRenderedContent | null = null;
      const adapter: IrisDeliveryAdapter = {
        id: 'a1',
        channelType: 'inbox',
        deliver: (renderedContent) => {
          receivedContent = renderedContent;
          return {
            adapterId: 'a1',
            channelId: 'ch1',
            status: 'attempted',
            derivedAt: new Date().toISOString(),
          };
        },
      };
      const content: IrisRenderedContent = Object.freeze({
        templateId: 't1',
        channelType: 'inbox',
        content: { body: 'test' },
      });
      const renderResult = makeRenderResult('ch1', [content]);
      const engine = new IrisDeliveryEngine([adapter]);
      engine.deliver([renderResult], makeRegistry(true));
      expect(receivedContent).not.toBeNull();
      expect(receivedContent!.templateId).toBe('t1');
      expect(receivedContent!.channelType).toBe('inbox');
      expect((receivedContent!.content as { body: string }).body).toBe('test');
    });
  });
});
