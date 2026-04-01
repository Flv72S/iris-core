import { after, describe, it } from 'node:test';
import assert from 'node:assert';

import { securityLog, setSecurityLogSink, shutdownSecurityLogger } from '../index.js';

describe('Security logger hardening (16D.X1.HARDENING.V2)', () => {
  after(() => {
    shutdownSecurityLogger();
  });

  it('custom sink is used by securityLog', () => {
    const events: Array<{ event: string; meta: Record<string, unknown> }> = [];
    setSecurityLogSink({
      log(event, meta) {
        events.push({ event, meta });
      },
    });
    securityLog('CUSTOM_SINK_TEST', { a: 1 });
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0]!.event, 'CUSTOM_SINK_TEST');
  });

  it('rate limit drops logs above 100 per event in window', () => {
    let count = 0;
    setSecurityLogSink({
      log() {
        count++;
      },
    });
    const eventName = `RATE_LIMIT_TEST_${Date.now()}`;
    for (let i = 0; i < 200; i++) {
      securityLog(eventName, { i });
    }
    assert.ok(count <= 100);
    assert.ok(count >= 95);
  });

  it('redacts secret-like fields from meta', () => {
    const metas: Record<string, unknown>[] = [];
    setSecurityLogSink({
      log(_event, meta) {
        metas.push(meta);
      },
    });
    securityLog('ROTATION_STARTED', {
      nodeId: 'n1',
      nextSecret: 'super-secret',
      activeSecret: 'another-secret',
      secret: 'plain-secret',
    });
    assert.strictEqual(metas.length, 1);
    assert.strictEqual(metas[0]!.nextSecret, '[REDACTED]');
    assert.strictEqual(metas[0]!.activeSecret, '[REDACTED]');
    assert.strictEqual(metas[0]!.secret, '[REDACTED]');
  });
});
