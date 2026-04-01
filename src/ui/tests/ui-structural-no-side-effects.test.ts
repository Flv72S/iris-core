/**
 * Test Bloccante Strutturale — No Side Effects in UI
 * 
 * STEP 5.0 §3.2 — Test bloccante minimo obbligatorio
 * 
 * Questo test verifica che nessun componente UI introduca side effects.
 * 
 * Riferimenti vincolanti:
 * - IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md — Sezione 7 (Test UI Bloccanti)
 * - STEP 5.0 §2.1 (Principio non negoziabile)
 */

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

describe('UI Structural — No Side Effects', () => {
  test('nessun componente UI importa useEffect con dipendenze vuote', async () => {
    const uiFiles = await glob('src/ui/**/*.{ts,tsx}', {
      ignore: ['**/*.test.ts', '**/*.test.tsx', '**/node_modules/**']
    });
    
    for (const file of uiFiles) {
      const content = readFileSync(file, 'utf-8');
      
      // Verifica che non ci sia useEffect con dipendenze vuote
      const useEffectEmptyDeps = /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*\}\s*,\s*\[\s*\]\s*\)/;
      if (useEffectEmptyDeps.test(content)) {
        throw new Error(
          `File ${file} contiene useEffect con dipendenze vuote. ` +
          `UI non può gestire polling o side effects.`
        );
      }
    }
    
    expect(true).toBe(true); // Test passa se nessun file viola
  });
  
  test('nessun componente UI importa fetch, axios, XMLHttpRequest', async () => {
    const uiFiles = await glob('src/ui/**/*.{ts,tsx}', {
      ignore: ['**/*.test.ts', '**/*.test.tsx', '**/node_modules/**']
    });
    
    const forbiddenImports = [
      /import\s+.*\s+from\s+['"]axios['"]/,
      /import\s+.*\s+from\s+['"]node-fetch['"]/,
      /fetch\s*\(/,
      /XMLHttpRequest/,
      /new\s+XMLHttpRequest/
    ];
    
    for (const file of uiFiles) {
      const content = readFileSync(file, 'utf-8');
      
      for (const pattern of forbiddenImports) {
        if (pattern.test(content)) {
          throw new Error(
            `File ${file} contiene import o uso di fetch/axios/XMLHttpRequest. ` +
            `UI non può effettuare fetch. Usa props o hooks.`
          );
        }
      }
    }
    
    expect(true).toBe(true); // Test passa se nessun file viola
  });
  
  test('nessun componente UI usa setTimeout o setInterval', async () => {
    const uiFiles = await glob('src/ui/**/*.{ts,tsx}', {
      ignore: ['**/*.test.ts', '**/*.test.tsx', '**/node_modules/**']
    });
    
    const forbiddenTimers = [
      /setTimeout\s*\(/,
      /setInterval\s*\(/,
      /clearTimeout\s*\(/,
      /clearInterval\s*\(/
    ];
    
    for (const file of uiFiles) {
      const content = readFileSync(file, 'utf-8');
      
      for (const pattern of forbiddenTimers) {
        if (pattern.test(content)) {
          throw new Error(
            `File ${file} contiene setTimeout/setInterval. ` +
            `UI non può gestire timer. Usa callback o props.`
          );
      }
      }
    }
    
    expect(true).toBe(true); // Test passa se nessun file viola
  });
  
  test('nessun componente UI accede a Date.now() diretto', async () => {
    const uiFiles = await glob('src/ui/**/*.{ts,tsx}', {
      ignore: ['**/*.test.ts', '**/*.test.tsx', '**/node_modules/**']
    });
    
    for (const file of uiFiles) {
      const content = readFileSync(file, 'utf-8');
      
      // Verifica che non ci sia Date.now() diretto
      const dateNowPattern = /Date\.now\s*\(/;
      if (dateNowPattern.test(content)) {
        throw new Error(
          `File ${file} contiene Date.now() diretto. ` +
          `UI non può accedere a timestamp raw. Usa timestampBucketizer.`
        );
      }
    }
    
    expect(true).toBe(true); // Test passa se nessun file viola
  });
  
  test('nessun componente UI importa da /core (eccetto /types)', async () => {
    const uiFiles = await glob('src/ui/**/*.{ts,tsx}', {
      ignore: ['**/*.test.ts', '**/*.test.tsx', '**/node_modules/**']
    });
    
    const forbiddenCoreImports = [
      /from\s+['"]@\/core[^/]/,
      /from\s+['"]\.\.\/core[^/]/,
      /from\s+['"]\.\.\/\.\.\/core[^/]/
    ];
    
    for (const file of uiFiles) {
      const content = readFileSync(file, 'utf-8');
      
      for (const pattern of forbiddenCoreImports) {
        if (pattern.test(content)) {
          throw new Error(
            `File ${file} importa da /core (eccetto /types). ` +
            `UI non può importare logica da /core. Solo /core/types è permesso.`
          );
        }
      }
    }
    
    expect(true).toBe(true); // Test passa se nessun file viola
  });
});
