import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { glob } from 'glob';

describe('UI Components — No Side Effects', () => {
  test('nessun componente importa funzioni vietate', async () => {
    const componentFiles = await glob('src/ui/components/**/*.{ts,tsx}', {
      ignore: ['**/*.test.ts', '**/*.test.tsx', '**/node_modules/**']
    });
    
    const forbiddenImports = [
      /import\s+.*\s+from\s+['"]axios['"]/,
      /import\s+.*\s+from\s+['"]node-fetch['"]/,
      /fetch\s*\(/,
      /XMLHttpRequest/,
      /new\s+XMLHttpRequest/
    ];
    
    for (const file of componentFiles) {
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
    
    expect(true).toBe(true);
  });
  
  test('nessun componente usa effetti (useEffect, useLayoutEffect)', async () => {
    const componentFiles = await glob('src/ui/components/**/*.{ts,tsx}', {
      ignore: ['**/*.test.ts', '**/*.test.tsx', '**/node_modules/**']
    });
    
    const forbiddenEffects = [
      /useEffect\s*\(/,
      /useLayoutEffect\s*\(/
    ];
    
    for (const file of componentFiles) {
      const content = readFileSync(file, 'utf-8');
      
      for (const pattern of forbiddenEffects) {
        if (pattern.test(content)) {
          throw new Error(
            `File ${file} contiene useEffect o useLayoutEffect. ` +
            `UI non può gestire effetti. Usa props o callback.`
          );
        }
      }
    }
    
    expect(true).toBe(true);
  });
  
  test('nessun componente usa timer (setTimeout, setInterval)', async () => {
    const componentFiles = await glob('src/ui/components/**/*.{ts,tsx}', {
      ignore: ['**/*.test.ts', '**/*.test.tsx', '**/node_modules/**']
    });
    
    const forbiddenTimers = [
      /setTimeout\s*\(/,
      /setInterval\s*\(/,
      /clearTimeout\s*\(/,
      /clearInterval\s*\(/
    ];
    
    for (const file of componentFiles) {
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
    
    expect(true).toBe(true);
  });
  
  test('nessun componente accede a Date.now() diretto', async () => {
    const componentFiles = await glob('src/ui/components/**/*.{ts,tsx}', {
      ignore: ['**/*.test.ts', '**/*.test.tsx', '**/node_modules/**']
    });
    
    for (const file of componentFiles) {
      const content = readFileSync(file, 'utf-8');
      
      const dateNowPattern = /Date\.now\s*\(/;
      if (dateNowPattern.test(content)) {
        throw new Error(
          `File ${file} contiene Date.now() diretto. ` +
          `UI non può accedere a timestamp raw. Usa timestampBucketizer.`
        );
      }
    }
    
    expect(true).toBe(true);
  });
});
