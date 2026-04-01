/**
 * Read Trace Context - unit test
 * Verifica: createRoot, createChild, immutabilita, serializzabilita, determinismo strutturale.
 */

import { describe, it, expect } from 'vitest';
import type { ReadTraceContext } from '../ReadTraceContext';
import { DefaultReadTraceProvider } from '../ReadTraceProvider';

describe('ReadTraceContext', () => {
  const provider = new DefaultReadTraceProvider();

  describe('createRoot', () => {
    it('produce un contesto con traceId definito e nessun spanId', () => {
      const ctx = provider.createRoot();
      expect(ctx.traceId).toBeDefined();
      expect(typeof ctx.traceId).toBe('string');
      expect(ctx.traceId.length).toBeGreaterThan(0);
      expect(ctx.spanId).toBeUndefined();
      expect(ctx.parentSpanId).toBeUndefined();
    });
  });

  describe('createChild', () => {
    it('mantiene lo stesso traceId, assegna spanId, valorizza parentSpanId', () => {
      const root = provider.createRoot();
      const child = provider.createChild(root, 'span-1');
      expect(child.traceId).toBe(root.traceId);
      expect(child.spanId).toBe('span-1');
      expect(child.parentSpanId).toBeUndefined();
    });

    it('crea catena: root -> child1 -> child2 con parentSpanId corretto', () => {
      const root = provider.createRoot();
      const child1 = provider.createChild(root, 'span-a');
      const child2 = provider.createChild(child1, 'span-b');
      expect(child1.traceId).toBe(root.traceId);
      expect(child1.spanId).toBe('span-a');
      expect(child1.parentSpanId).toBeUndefined();
      expect(child2.traceId).toBe(root.traceId);
      expect(child2.spanId).toBe('span-b');
      expect(child2.parentSpanId).toBe('span-a');
    });
  });

  describe('immutabilita', () => {
    it('i context sono immutabili: createChild non muta il parent', () => {
      const parent: ReadTraceContext = {
        traceId: 't1',
        spanId: 's1',
      };
      const child = provider.createChild(parent, 's2');
      expect(parent.traceId).toBe('t1');
      expect(parent.spanId).toBe('s1');
      expect(parent.parentSpanId).toBeUndefined();
      expect(child.traceId).toBe('t1');
      expect(child.spanId).toBe('s2');
      expect(child.parentSpanId).toBe('s1');
    });
  });

  describe('serializzabilita', () => {
    it('tutti i campi sono serializzabili', () => {
      const root = provider.createRoot();
      const child = provider.createChild(root, 'sp1');
      const rootJson = JSON.stringify(root);
      const childJson = JSON.stringify(child);
      expect(JSON.parse(rootJson)).toEqual(root);
      expect(JSON.parse(childJson)).toEqual(child);
    });
  });

  describe('determinismo strutturale', () => {
    it('createRoot: campi presenti (traceId)', () => {
      const ctx = provider.createRoot();
      expect(ctx).toHaveProperty('traceId');
      expect(typeof ctx.traceId).toBe('string');
    });

    it('createChild: campi presenti (traceId, spanId, parentSpanId)', () => {
      const parent: ReadTraceContext = { traceId: 't', spanId: 'p' };
      const child = provider.createChild(parent, 'c');
      expect(child).toHaveProperty('traceId');
      expect(child).toHaveProperty('spanId');
      expect(child).toHaveProperty('parentSpanId');
      expect(child.traceId).toBe('t');
      expect(child.spanId).toBe('c');
      expect(child.parentSpanId).toBe('p');
    });
  });
});
