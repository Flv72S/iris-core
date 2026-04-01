/**
 * Phase 16E.X3.FIX / 16E.X3.FIX.2 — Active trace context + scoped isolation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Tracer } from '../tracer.js';
import {
  getActiveTraceContext,
  generateTraceId,
  runWithTraceContext,
} from '../trace_context.js';
import { StructuredIrisLogger } from '../../logger/iris_logger.js';

describe('Observability / Active trace context', () => {
  it('getActiveTraceContext reflects current span while open', () => {
    const tr = new Tracer();
    runWithTraceContext(tr, () => {
      const tid = generateTraceId();
      const s = tr.startSpan('work', { traceId: tid, k: 1 });
      const ctx = getActiveTraceContext();
      assert.ok(ctx);
      assert.strictEqual(ctx?.traceId, tid);
      assert.strictEqual(ctx?.spanId, s.id);
      tr.endSpan(s);
    });
  });

  it('context clears after span end (no current span)', () => {
    const tr = new Tracer();
    runWithTraceContext(tr, () => {
      const s = tr.startSpan('a', {});
      assert.ok(getActiveTraceContext());
      tr.endSpan(s);
      assert.strictEqual(getActiveTraceContext(), undefined);
    });
  });

  it('nested spans: getActiveTraceContext returns innermost span', () => {
    const tr = new Tracer();
    runWithTraceContext(tr, () => {
      const outer = tr.startSpan('outer', { traceId: generateTraceId() });
      const inner = tr.startSpan('inner', { traceId: outer.traceId as string, parentSpanId: outer.id });
      const ctx = getActiveTraceContext();
      assert.strictEqual(ctx?.spanId, inner.id);
      tr.endSpan(inner);
      assert.strictEqual(getActiveTraceContext()?.spanId, outer.id);
      tr.endSpan(outer);
      assert.strictEqual(getActiveTraceContext(), undefined);
    });
  });

  it('endSpan out of order still clears stack entries (no orphan)', () => {
    const tr = new Tracer();
    runWithTraceContext(tr, () => {
      const a = tr.startSpan('a', { traceId: generateTraceId() });
      const b = tr.startSpan('b', { traceId: a.traceId as string, parentSpanId: a.id });
      tr.endSpan(a);
      tr.endSpan(b);
      assert.strictEqual(tr.getOpenSpanCount(), 0);
      assert.strictEqual(getActiveTraceContext(), undefined);
    });
  });

  it('empty tracer stack: getActiveTraceContext is undefined', () => {
    assert.strictEqual(getActiveTraceContext(), undefined);
  });

  it('runWithTraceContext with no open span: getActiveTraceContext is undefined', () => {
    const tr = new Tracer();
    runWithTraceContext(tr, () => {
      assert.strictEqual(getActiveTraceContext(), undefined);
    });
  });

  it('nested runWithTraceContext restores outer tracer after inner completes', () => {
    const trA = new Tracer();
    const trB = new Tracer();
    runWithTraceContext(trA, () => {
      const sa = trA.startSpan('outer', { traceId: generateTraceId() });
      assert.strictEqual(getActiveTraceContext()?.spanId, sa.id);

      runWithTraceContext(trB, () => {
        const sb = trB.startSpan('inner', { traceId: generateTraceId() });
        assert.strictEqual(getActiveTraceContext()?.spanId, sb.id);
        trB.endSpan(sb);
      });

      assert.strictEqual(getActiveTraceContext()?.spanId, sa.id);
      trA.endSpan(sa);
    });
  });

  it('should isolate concurrent contexts (nested tracers)', () => {
    const tracerA = new Tracer();
    const tracerB = new Tracer();
    let ctxA: ReturnType<typeof getActiveTraceContext>;
    let ctxB: ReturnType<typeof getActiveTraceContext>;

    runWithTraceContext(tracerA, () => {
      tracerA.startSpan('A');
      ctxA = getActiveTraceContext();

      runWithTraceContext(tracerB, () => {
        tracerB.startSpan('B');
        ctxB = getActiveTraceContext();
      });
    });

    assert.ok(ctxA && ctxB);
    assert.notStrictEqual(ctxA!.traceId, ctxB!.traceId);
  });

  it('sequential runWithTraceContext calls do not leak context', () => {
    const t1 = new Tracer();
    const t2 = new Tracer();
    runWithTraceContext(t1, () => {
      t1.startSpan('s1', { traceId: generateTraceId() });
      assert.ok(getActiveTraceContext());
      t1.endSpan(t1.getCurrentSpan()!);
    });
    assert.strictEqual(getActiveTraceContext(), undefined);
    runWithTraceContext(t2, () => {
      t2.startSpan('s2', { traceId: generateTraceId() });
      assert.ok(getActiveTraceContext());
      t2.endSpan(t2.getCurrentSpan()!);
    });
    assert.strictEqual(getActiveTraceContext(), undefined);
  });

  it('StructuredIrisLogger fills traceId from active context when omitted', () => {
    const tr = new Tracer();
    runWithTraceContext(tr, () => {
      const tid = generateTraceId();
      const s = tr.startSpan('logged', { traceId: tid });

      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-log-'));
      const logFile = path.join(dir, 'out.log');
      const logger = new StructuredIrisLogger({
        nodeId: 'n-test',
        minLevel: 'info',
        pretty: false,
        logFilePath: logFile,
      });

      logger.info('hello', {});

      const line = fs.readFileSync(logFile, 'utf8').trim();
      const rec = JSON.parse(line) as { traceId: string; spanId?: string };
      assert.strictEqual(rec.traceId, tid);
      assert.strictEqual(rec.spanId, s.id);

      tr.endSpan(s);
      fs.rmSync(dir, { recursive: true, force: true });
    });
  });

  it('StructuredIrisLogger does not override explicit traceId with active context', () => {
    const tr = new Tracer();
    runWithTraceContext(tr, () => {
      const s = tr.startSpan('other', { traceId: generateTraceId() });

      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-log-'));
      const logFile = path.join(dir, 'out2.log');
      const logger = new StructuredIrisLogger({
        nodeId: 'n-test',
        minLevel: 'info',
        pretty: false,
        logFilePath: logFile,
      });

      logger.info('x', { traceId: 'explicit-trace-id' });
      const line = fs.readFileSync(logFile, 'utf8').trim();
      const rec = JSON.parse(line) as { traceId: string };
      assert.strictEqual(rec.traceId, 'explicit-trace-id');

      fs.rmSync(dir, { recursive: true, force: true });
      tr.endSpan(s);
    });
  });
});
