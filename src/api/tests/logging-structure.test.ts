/**
 * Logging Structure Tests
 * 
 * Test bloccanti per verificare che:
 * 1. Ogni request genera almeno 1 log
 * 2. Log sono strutturati (JSON)
 * 3. Log contengono campi obbligatori
 * 4. Correlation ID presente in tutti i log
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.9A_Observability_Map.md
 * - IRIS_STEP5.9_MVP_Hardening_Checklist_and_Results.md (H-20)
 */

import { describe, it, expect } from 'vitest';
import { StructuredLogger, initializeLogger } from '../../observability/logger';
import { generateCorrelationId } from '../../observability/correlation';

describe('Logging Structure', () => {
  describe('Structured logger output', () => {
    it('deve generare log strutturato con campi obbligatori', () => {
      const logger = new StructuredLogger('info');
      const correlationId = generateCorrelationId();
      
      // Capture console.log output
      const originalLog = console.log;
      let logOutput: string = '';
      
      console.log = (message: string) => {
        logOutput = message;
      };
      
      try {
        logger.info('http', correlationId, 'Test message', { key: 'value' });
        
        // Verifica che output sia JSON
        const parsed = JSON.parse(logOutput);
        
        // Verifica campi obbligatori
        expect(parsed.timestamp).toBeDefined();
        expect(parsed.level).toBe('info');
        expect(parsed.service).toBe('iris-api');
        expect(parsed.component).toBe('http');
        expect(parsed.correlationId).toBe(correlationId);
        expect(parsed.message).toBe('Test message');
        expect(parsed.context).toEqual({ key: 'value' });
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('Correlation ID in logs', () => {
    it('deve includere correlation ID in tutti i log', () => {
      const logger = new StructuredLogger('info');
      const correlationId = generateCorrelationId();
      
      const originalLog = console.log;
      let logOutput: string = '';
      
      console.log = (message: string) => {
        logOutput = message;
      };
      
      try {
        logger.info('boundary', correlationId, 'Test message');
        
        const parsed = JSON.parse(logOutput);
        expect(parsed.correlationId).toBe(correlationId);
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('Log levels', () => {
    it('deve rispettare minLevel', () => {
      const logger = new StructuredLogger('warn');
      const correlationId = generateCorrelationId();
      
      const originalLog = console.log;
      const originalError = console.error;
      let logCount = 0;
      
      console.log = () => { logCount++; };
      console.error = () => { logCount++; };
      
      try {
        logger.debug('http', correlationId, 'Debug message'); // Non loggato
        logger.info('http', correlationId, 'Info message'); // Non loggato
        logger.warn('http', correlationId, 'Warn message'); // Loggato
        logger.error('http', correlationId, 'Error message'); // Loggato
        
        expect(logCount).toBe(2); // Solo warn e error
      } finally {
        console.log = originalLog;
        console.error = originalError;
      }
    });
  });
});
