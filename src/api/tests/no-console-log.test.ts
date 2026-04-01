/**
 * No Console Log Tests
 * 
 * Test bloccanti per verificare che:
 * 1. Nessun console.log diretto (eccetto structured logger)
 * 2. Nessun console.error diretto (eccetto structured logger)
 * 3. Tutti i log usano structured logger
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.9A_Observability_Map.md
 * - IRIS_STEP5.9_MVP_Hardening_Checklist_and_Results.md (H-20)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { glob } from 'glob';

describe('No Console Log', () => {
  describe('No console.log outside structured logger', () => {
    it('deve fallire se console.log è usato fuori da structured logger', async () => {
      const sourceFiles = await glob('src/**/*.ts', {
        ignore: ['**/*.test.ts', '**/node_modules/**', '**/observability/logger.ts'],
      });

      const violations: string[] = [];

      for (const file of sourceFiles) {
        const content = readFileSync(file, 'utf-8');
        
        // Verifica console.log (escludi logger.ts e main.ts fallback strutturato)
        const consoleLogPattern = /console\.log\(/;
        if (consoleLogPattern.test(content)) {
          // Verifica che non sia nel logger.ts o in un fallback strutturato
          if (!file.includes('observability/logger.ts')) {
            // Verifica che non sia JSON.stringify (output strutturato)
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (consoleLogPattern.test(line)) {
                // Verifica che non sia JSON.stringify (output strutturato)
                // main.ts ha un fallback strutturato con JSON.stringify
                if (!line.includes('JSON.stringify')) {
                  violations.push(`${file}:${i + 1}: console.log diretto (non strutturato)`);
                }
              }
            }
          }
        }
      }

      if (violations.length > 0) {
        console.error('Violazioni trovate:', violations);
      }

      expect(violations.length).toBe(0);
    });
  });

  describe('No console.error outside structured logger', () => {
    it('deve fallire se console.error è usato fuori da structured logger', async () => {
      const sourceFiles = await glob('src/**/*.ts', {
        ignore: ['**/*.test.ts', '**/node_modules/**', '**/observability/logger.ts'],
      });

      const violations: string[] = [];

      for (const file of sourceFiles) {
        const content = readFileSync(file, 'utf-8');
        
        // Verifica console.error (escludi logger.ts e main.ts fallback strutturato)
        const consoleErrorPattern = /console\.error\(/;
        if (consoleErrorPattern.test(content)) {
          // Verifica che non sia nel logger.ts o in un fallback strutturato
          if (!file.includes('observability/logger.ts')) {
            // Verifica che non sia JSON.stringify (output strutturato)
            // main.ts ha un fallback strutturato con JSON.stringify
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (consoleErrorPattern.test(line)) {
                // Verifica che non sia JSON.stringify (output strutturato)
                if (!line.includes('JSON.stringify')) {
                  violations.push(`${file}:${i + 1}: console.error diretto (non strutturato)`);
                }
              }
            }
          }
        }
      }

      if (violations.length > 0) {
        console.error('Violazioni trovate:', violations);
      }

      expect(violations.length).toBe(0);
    });
  });
});
