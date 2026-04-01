/**
 * Error Logging Tests
 * 
 * Test bloccanti per verificare che:
 * 1. Ogni errore genera log strutturato
 * 2. Errori hanno correlation ID
 * 3. Errori hanno errorCode, source, visibility
 * 4. Errori INTERNAL non espongono dettagli al client
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.9A_Observability_Map.md
 * - IRIS_STEP5.9A_Error_Visibility_Policy.md
 * - IRIS_STEP5.9_MVP_Hardening_Checklist_and_Results.md (H-20)
 */

import { describe, it, expect } from 'vitest';
import { handleError, handleHttpError, type StructuredError } from '../../observability/errorHandler';
import { generateCorrelationId } from '../../observability/correlation';
import { initializeLogger } from '../../observability/logger';

describe('Error Logging', () => {
  beforeEach(() => {
    initializeLogger('info');
  });

  describe('Error handling logs structured error', () => {
    it('deve loggare errore strutturato con campi obbligatori', () => {
      const correlationId = generateCorrelationId();
      const error = new Error('Test error');
      
      const originalError = console.error;
      let logOutput: string = '';
      
      console.error = (message: string) => {
        logOutput = message;
      };
      
      try {
        const structuredError = handleError(error, correlationId, 'http', 'http', { key: 'value' });
        
        // Verifica che errore sia loggato
        expect(logOutput).toBeDefined();
        const parsed = JSON.parse(logOutput);
        
        // Verifica campi obbligatori
        expect(parsed.correlationId).toBe(correlationId);
        expect(parsed.component).toBe('http');
        expect(parsed.level).toBe('error');
        expect(parsed.context?.errorCode).toBeDefined();
        expect(parsed.context?.source).toBe('http');
        expect(parsed.context?.visibility).toBe('INTERNAL');
        
        // Verifica structured error
        expect(structuredError.errorCode).toBeDefined();
        expect(structuredError.correlationId).toBe(correlationId);
        expect(structuredError.source).toBe('http');
        expect(structuredError.visibility).toBe('INTERNAL');
      } finally {
        console.error = originalError;
      }
    });
  });

  describe('HTTP error handling', () => {
    it('deve mappare errore a risposta HTTP con visibility policy', () => {
      const correlationId = generateCorrelationId();
      const error = new TypeError('Test runtime error');
      
      const { statusCode, response } = handleHttpError(error, correlationId, 'http', 'http');
      
      // Verifica che errore INTERNAL non esponga dettagli
      expect(response.code).toBe('INTERNAL_ERROR');
      expect(response.message).toBe('An internal error occurred');
      expect(response.correlationId).toBe(correlationId);
      expect(statusCode).toBe(500);
    });
  });

  describe('Error visibility policy', () => {
    it('deve applicare visibility policy correttamente', () => {
      const correlationId = generateCorrelationId();
      
      // Errore runtime → INTERNAL
      const runtimeError = new TypeError('Runtime error');
      const structuredError = handleError(runtimeError, correlationId, 'http', 'http');
      
      expect(structuredError.visibility).toBe('INTERNAL');
      expect(structuredError.source).toBe('http');
      
      // Verifica che INTERNAL non esponga dettagli al client
      const { response } = handleHttpError(runtimeError, correlationId, 'http', 'http');
      expect(response.code).toBe('INTERNAL_ERROR');
      expect(response.message).toBe('An internal error occurred');
      expect(response.message).not.toContain('Runtime error');
    });
  });
});
