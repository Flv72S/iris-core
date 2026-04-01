/**
 * Core Projections isolation test
 *
 * Verifica che `src/core/projections/**` sia un sottodominio Core isolato:
 * - Import consentiti: solo `src/core/queries/read-models/**` e file interni a projections
 * - Vietati: persistence/api/prisma e repository di dominio (threads/messages)
 */

import { describe, it, expect } from 'vitest';
import { glob } from 'glob';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function listNonTestFiles(): Promise<string[]> {
  return glob('src/core/projections/**/*.ts', {
    ignore: ['**/*.test.ts'],
  });
}

function extractImportPaths(tsSource: string): string[] {
  const paths: string[] = [];
  for (const m of tsSource.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    paths.push(m[1]);
  }
  return paths;
}

describe('Core Projections — isolation', () => {
  it('importa solo projections/** o queries/read-models/**', async () => {
    const files = await listNonTestFiles();
    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const imports = extractImportPaths(content);

      for (const specifier of imports) {
        // No node_modules imports: projection layer must stay pure and internal.
        if (!specifier.startsWith('.')) {
          violations.push(`${file}: import non relativo non permesso: ${specifier}`);
          continue;
        }

        const abs = resolve(dirname(resolve(process.cwd(), file)), specifier);
        const normalized = abs.replace(/\\/g, '/');

        const isAllowed =
          normalized.includes('/src/core/projections/') ||
          normalized.includes('/src/core/queries/read-models/') ||
          normalized.includes('/src/core/read-events');

        if (!isAllowed) {
          violations.push(`${file}: import non permesso: ${specifier}`);
          continue;
        }

        if (normalized.includes('/src/persistence/')) {
          violations.push(`${file}: import da persistence vietato: ${specifier}`);
        }
        if (normalized.includes('/src/api/')) {
          violations.push(`${file}: import da api vietato: ${specifier}`);
        }
        if (normalized.includes('/src/core/threads/')) {
          violations.push(`${file}: import da core/threads vietato: ${specifier}`);
        }
        if (normalized.includes('/src/core/messages/')) {
          violations.push(`${file}: import da core/messages vietato: ${specifier}`);
        }
        if (normalized.includes('prisma')) {
          violations.push(`${file}: import prisma vietato: ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

