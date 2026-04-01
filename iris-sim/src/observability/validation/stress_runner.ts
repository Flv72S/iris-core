import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { IrisNode } from '../../sdk/index.js';

export type StressRunConfig = {
  messages: number;
  concurrency: number;
  mode?: 'burst' | 'sustained';
};

export type StressRunResult = {
  messages: number;
  concurrency: number;
  durationMs: number;
  messagesPerSecond: number;
  memoryBytes: number;
  errorCount: number;
};

export async function runStressTest(config: StressRunConfig): Promise<StressRunResult> {
  const port = 42000 + Math.floor(Math.random() * 1000);
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-obs-stress-'));
  const node = new IrisNode({
    node_id: `stress-${randomUUID()}`,
    transport: { type: 'ws', options: { host: '127.0.0.1', port } },
    observability: { logging: false, metrics: true, tracing: true, cwd },
  });

  let errors = 0;
  node.on('error', () => {
    errors++;
  });

  let started = false;
  const t0 = Date.now();
  try {
    await node.start();
    started = true;
    const mode = config.mode ?? 'burst';
    let sent = 0;
    const worker = async () => {
      while (sent < config.messages) {
        const idx = sent++;
        try {
          await node.send({ type: 'STRESS', payload: { idx, mode } });
        } catch {
          errors++;
        }
        if (mode === 'sustained') await new Promise((r) => setTimeout(r, 1));
      }
    };

    const workers = Array.from({ length: Math.max(1, config.concurrency) }, () => worker());
    await Promise.all(workers);
    const durationMs = Date.now() - t0;
    const mem = process.memoryUsage().heapUsed;
    return {
      messages: config.messages,
      concurrency: config.concurrency,
      durationMs,
      messagesPerSecond: config.messages / Math.max(0.001, durationMs / 1000),
      memoryBytes: mem,
      errorCount: errors,
    };
  } finally {
    if (started) {
      await node.stop().catch(() => {});
    }
  }
}

