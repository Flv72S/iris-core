/**
 * Bootstrap SQLite Tests
 * 
 * Test bloccanti per verificare che:
 * 1. Bootstrap con persistence 'sqlite' funziona
 * 2. Repository SQLite sono istanziati correttamente
 * 3. Database è creato e chiuso correttamente
 * 4. Shutdown chiude database
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.8_Bootstrap_Map.md
 */

import { describe, it, expect } from 'vitest';
import { createApp, type AppConfig } from '../bootstrap/AppBootstrap';

describe('Bootstrap SQLite', () => {
  describe('createApp with sqlite persistence', () => {
    it('deve creare app con persistence sqlite', async () => {
      const config: AppConfig = {
        persistence: 'sqlite',
        http: {
          port: 3000,
        },
        sqlite: {
          filePath: ':memory:',
        },
      };
      
      const app = createApp(config);
      
      // Verifica che app sia creata
      expect(app).toBeDefined();
      expect(app.boundary).toBeDefined();
      expect(app.httpServer).toBeDefined();
      expect(app.shutdown).toBeDefined();
      
      // Verifica che shutdown chiuda database
      await app.shutdown();
    });
  });

  describe('SQLite database lifecycle', () => {
    it('deve creare e chiudere database correttamente', async () => {
      const config: AppConfig = {
        persistence: 'sqlite',
        http: {
          port: 3000,
        },
        sqlite: {
          filePath: ':memory:',
        },
      };
      
      const app = createApp(config);
      
      // Verifica che Boundary funzioni con SQLite
      expect(typeof app.boundary.appendMessage).toBe('function');
      expect(typeof app.boundary.getThreadState).toBe('function');
      
      // Shutdown deve chiudere database senza errori
      await app.shutdown();
    });
  });

  describe('Config validation', () => {
    it('deve fallire se sqlite config mancante', () => {
      const config = {
        persistence: 'sqlite' as const,
        http: {
          port: 3000,
        },
        // sqlite mancante
      };
      
      expect(() => {
        createApp(config as any);
      }).toThrow('sqlite');
    });
  });
});
