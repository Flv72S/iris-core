import { describe, expect, it } from 'vitest';

import { validateLogEntry } from '../../src/logging/validator';

function createBaseLog() {
  return {
    timestamp: '2026-03-27T14:30:00.000Z',
    runtimeId: 'runtime-001',
    correlationId: 'corr-001',
    level: 'INFO',
    phase: 'RUNTIME',
    message: 'runtime healthy',
    audit: {
      compliant: true,
    },
  };
}

describe('logging schema validator', () => {
  describe('valid cases', () => {
    it('passes minimal valid log', () => {
      const result = validateLogEntry(createBaseLog());
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('passes log with invariantId', () => {
      const log = {
        ...createBaseLog(),
        invariantId: 'INV-012',
      };
      const result = validateLogEntry(log);
      expect(result.valid).toBe(true);
    });

    it('passes log with non-deterministic marker', () => {
      const log = {
        ...createBaseLog(),
        nondeterministicMarker: 'ND-004',
      };
      const result = validateLogEntry(log);
      expect(result.valid).toBe(true);
    });

    it('passes log with compliant=false and onFailure policy', () => {
      const log = {
        ...createBaseLog(),
        level: 'ERROR',
        audit: {
          compliant: false,
          onFailure: 'FAIL_FAST',
        },
      };
      const result = validateLogEntry(log);
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid cases', () => {
    it('fails when required field is missing', () => {
      const log = createBaseLog() as Record<string, unknown>;
      delete log.runtimeId;
      const result = validateLogEntry(log);
      expect(result.valid).toBe(false);
      expect(result.errors?.join(' ')).toContain('runtimeId');
    });

    it('fails on invalid enum value', () => {
      const log = {
        ...createBaseLog(),
        level: 'TRACE',
      };
      const result = validateLogEntry(log);
      expect(result.valid).toBe(false);
      expect(result.errors?.join(' ')).toContain('/level');
    });

    it('fails on invalid timestamp format', () => {
      const log = {
        ...createBaseLog(),
        timestamp: '2026-03-27 14:30:00',
      };
      const result = validateLogEntry(log);
      expect(result.valid).toBe(false);
      expect(result.errors?.join(' ')).toContain('/timestamp');
    });

    it('fails when audit.compliant=false without onFailure', () => {
      const log = {
        ...createBaseLog(),
        audit: {
          compliant: false,
        },
      };
      const result = validateLogEntry(log);
      expect(result.valid).toBe(false);
      expect(result.errors?.join(' ')).toContain('/audit');
    });

    it('fails on unknown additional property', () => {
      const log = {
        ...createBaseLog(),
        unexpected: true,
      };
      const result = validateLogEntry(log);
      expect(result.valid).toBe(false);
      expect(result.errors?.join(' ')).toContain('must NOT have additional properties');
    });

    it('fails on invalid invariantId', () => {
      const log = {
        ...createBaseLog(),
        invariantId: 'INV-999',
      };
      const result = validateLogEntry(log);
      expect(result.valid).toBe(false);
      expect(result.errors?.join(' ')).toContain('/invariantId');
    });

    it('fails on invalid non-deterministic marker', () => {
      const log = {
        ...createBaseLog(),
        nondeterministicMarker: 'ND-999',
      };
      const result = validateLogEntry(log);
      expect(result.valid).toBe(false);
      expect(result.errors?.join(' ')).toContain('/nondeterministicMarker');
    });
  });
});

