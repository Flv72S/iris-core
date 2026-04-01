/**
 * Config Validation Tests
 * 
 * Test bloccanti per validazione configurazione fail-fast.
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.9B_Runtime_Safety_Map.md
 * - IRIS_STEP5.9_MVP_Hardening_Checklist_and_Results.md (H-05)
 */

import { describe, it, expect } from 'vitest';
import { validateConfig, ConfigValidationError } from '../config/validateConfig';
import type { AppConfig } from '../../app/bootstrap/types';

describe('Config Validation', () => {
  describe('Valid config', () => {
    it('deve passare con config valida (memory)', () => {
      const config: AppConfig = {
        persistence: 'memory',
        http: {
          port: 3000,
        },
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it('deve passare con config valida (sqlite)', () => {
      const config: AppConfig = {
        persistence: 'sqlite',
        http: {
          port: 3000,
        },
        sqlite: {
          filePath: '/tmp/test.db',
        },
      };

      expect(() => validateConfig(config)).not.toThrow();
    });
  });

  describe('Invalid persistence', () => {
    it('deve fallire con persistence invalida', () => {
      const config = {
        persistence: 'invalid' as any,
        http: {
          port: 3000,
        },
      };

      expect(() => validateConfig(config as AppConfig)).toThrow(ConfigValidationError);
    });
  });

  describe('Invalid HTTP port', () => {
    it('deve fallire con port < 1', () => {
      const config: AppConfig = {
        persistence: 'memory',
        http: {
          port: 0,
        },
      };

      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
    });

    it('deve fallire con port > 65535', () => {
      const config: AppConfig = {
        persistence: 'memory',
        http: {
          port: 65536,
        },
      };

      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
    });

    it('deve fallire con port negativo', () => {
      const config: AppConfig = {
        persistence: 'memory',
        http: {
          port: -1,
        },
      };

      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
    });
  });

  describe('Invalid SQLite config', () => {
    it('deve fallire se sqlite config mancante quando persistence === sqlite', () => {
      const config: AppConfig = {
        persistence: 'sqlite',
        http: {
          port: 3000,
        },
        // sqlite mancante
      };

      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
    });

    it('deve fallire se sqlite.filePath vuoto', () => {
      const config: AppConfig = {
        persistence: 'sqlite',
        http: {
          port: 3000,
        },
        sqlite: {
          filePath: '',
        },
      };

      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
    });
  });
});
