import { describe, it } from 'node:test';
import assert from 'node:assert';

import { StructuredIrisLogger } from '../logger/iris_logger.js';
import { formatLogJson } from '../logger/log_formatter.js';
import type { IrisLog } from '../logger/log_types.js';

describe('Observability / Structured logger', () => {
  it('emits JSON shape with ISO timestamp and level', () => {
    const log: IrisLog = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'hello',
      traceId: 'trace-1',
      nodeId: 'n1',
      context: 'node',
    };
    const line = formatLogJson(log);
    const parsed = JSON.parse(line) as IrisLog;
    assert.strictEqual(parsed.level, 'info');
    assert.strictEqual(parsed.message, 'hello');
    assert.ok(parsed.timestamp.length > 10);
  });

  it('filters levels below minLevel', () => {
    let lines = 0;
    const origLog = console.log;
    const origWarn = console.warn;
    const origErr = console.error;
    const bump = () => {
      lines++;
    };
    console.log = bump;
    console.warn = bump;
    console.error = bump;
    try {
      const logger = new StructuredIrisLogger({
        nodeId: 'x',
        minLevel: 'warn',
        pretty: false,
      });
      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');
    } finally {
      console.log = origLog;
      console.warn = origWarn;
      console.error = origErr;
    }
    assert.strictEqual(lines, 2);
  });
});
