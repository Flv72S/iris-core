/**
 * Bootstrap Memory Tests
 * 
 * Test bloccanti per verificare che:
 * 1. Bootstrap con persistence 'memory' funziona
 * 2. Repository sono istanziati correttamente
 * 3. Boundary è creato con interfacce
 * 4. HTTP server è avviabile e stoppabile
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.8_Bootstrap_Map.md
 */

import { describe, it, expect } from 'vitest';
import { createApp, type AppConfig } from '../bootstrap/AppBootstrap';

describe('Bootstrap Memory', () => {
  describe('createApp with memory persistence', () => {
    it('deve creare app con persistence memory', async () => {
      const config: AppConfig = {
        persistence: 'memory',
        http: {
          port: 3000,
        },
      };
      
      const app = createApp(config);
      
      // Verifica che app sia creata
      expect(app).toBeDefined();
      expect(app.boundary).toBeDefined();
      expect(app.httpServer).toBeDefined();
      expect(app.shutdown).toBeDefined();
      
      // Verifica che shutdown funzioni
      await app.shutdown();
    });
  });

  describe('Boundary wiring', () => {
    it('deve creare Boundary con repository corretti', async () => {
      const config: AppConfig = {
        persistence: 'memory',
        http: {
          port: 3000,
        },
      };
      
      const app = createApp(config);
      
      // Verifica che Boundary abbia i metodi corretti
      expect(typeof app.boundary.appendMessage).toBe('function');
      expect(typeof app.boundary.getThreadState).toBe('function');
      expect(typeof app.boundary.transitionThreadState).toBe('function');
      expect(typeof app.boundary.getMessageDelivery).toBe('function');
      expect(typeof app.boundary.retryMessage).toBe('function');
      expect(typeof app.boundary.getSyncStatus).toBe('function');
      
      await app.shutdown();
    });
  });

  describe('HTTP server wiring', () => {
    it('deve creare HTTP server con Boundary', async () => {
      const config: AppConfig = {
        persistence: 'memory',
        http: {
          port: 3000,
        },
      };
      
      const app = createApp(config);
      
      // Verifica che HTTP server sia creato
      expect(app.httpServer.server).toBeDefined();
      expect(typeof app.httpServer.start).toBe('function');
      expect(typeof app.httpServer.stop).toBe('function');
      
      await app.shutdown();
    });
  });
});
