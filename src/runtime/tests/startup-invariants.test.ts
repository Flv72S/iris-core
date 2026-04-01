/**
 * Startup Invariants Tests
 * 
 * Test bloccanti per startup invariants.
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.9B_Runtime_Safety_Map.md
 * - IRIS_STEP5.9_MVP_Hardening_Checklist_and_Results.md (H-16, H-17)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { verifyStartupInvariants, StartupInvariantViolation } from '../startup/startupInvariants';
import { initializeLogger } from '../../observability/logger';
import type { AppConfig } from '../../app/bootstrap/types';

describe('Startup Invariants', () => {
  beforeEach(() => {
    initializeLogger('info');
  });

  describe('Valid config', () => {
    it('deve passare con config valida', () => {
      const config: AppConfig = {
        persistence: 'memory',
        http: {
          port: 3000,
        },
      };

      expect(() => verifyStartupInvariants(config)).not.toThrow();
    });

    it('deve passare con config SQLite valida', () => {
      const config: AppConfig = {
        persistence: 'sqlite',
        http: {
          port: 3000,
        },
        sqlite: {
          filePath: '/tmp/test.db',
        },
      };

      expect(() => verifyStartupInvariants(config)).not.toThrow();
    });
  });

  describe('Invalid config', () => {
    it('deve fallire se config mancante', () => {
      expect(() => verifyStartupInvariants(null as any)).toThrow(StartupInvariantViolation);
    });

    it('deve fallire se http config mancante', () => {
      const config = {
        persistence: 'memory',
        // http mancante
      } as any;

      expect(() => verifyStartupInvariants(config)).toThrow(StartupInvariantViolation);
    });

    it('deve fallire se sqlite config mancante quando persistence === sqlite', () => {
      const config: AppConfig = {
        persistence: 'sqlite',
        http: {
          port: 3000,
        },
        // sqlite mancante
      };

      expect(() => verifyStartupInvariants(config)).toThrow(StartupInvariantViolation);
    });
  });
});
