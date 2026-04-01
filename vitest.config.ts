import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vitest Configuration — Test Runner Vincolante
 * 
 * STEP 5.0 §3.1 — Setup Vitest
 * 
 * Riferimenti vincolanti:
 * - IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md
 * - STEP 5.0 §3.1 (Test Runner Vincolante)
 */

export default defineConfig({
  plugins: [react()],
  test: {
    // Test unitari (core + runtime + api + ui)
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/*.spec.ts',
      'scripts/**/*.spec.ts',
      'tests/**/*.spec.ts',
      'tests/**/*.test.ts',
      'phase-8-feedback/**/*.spec.ts',
      'phase-9-modes/**/*.spec.ts',
      'phase-10-explainability/**/*.spec.ts',
      'phase-10-explainability/**/*.spec.tsx',
    ],
    
    // Ambiente di default: Node (UI forza jsdom)
    environment: 'node',
    environmentMatchGlobs: [
      ['src/ui/tests/**/*.test.ts', 'jsdom'],
      ['src/ui/tests/**/*.test.tsx', 'jsdom'],
      ['phase-10-explainability/**/*.spec.tsx', 'jsdom'],
    ],
    
    // Coverage minimo obbligatorio
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/ui/tests/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts'
      ],
      // Coverage minimo per UI: 80%
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    },
    
    // Timeout per test bloccanti
    testTimeout: 5000,
    
    // Fail fast su errori critici
    bail: 1,
    
    // Globals
    globals: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/ui': path.resolve(__dirname, './src/ui'),
      '@/core': path.resolve(__dirname, './src/core'),
      '@/core/types': path.resolve(__dirname, './src/core/types')
    }
  }
});
