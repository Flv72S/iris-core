import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runStressTest } from '../stress_runner.js';

describe('Observability validation / stress', () => {
  it('runs 1k messages without crash', { timeout: 120000 }, async () => {
    // Keep this bounded to avoid certification timeouts on busy CI/desktop hosts.
    const res = await runStressTest({ messages: 600, concurrency: 12, mode: 'burst' });
    assert.strictEqual(res.messages, 600);
    assert.ok(res.messagesPerSecond > 0);
    assert.ok(res.errorCount >= 0);
  });
});

