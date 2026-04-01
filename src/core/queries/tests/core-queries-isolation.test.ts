/**
 * Core Queries isolation test
 *
 * Verifica che `src/core/queries/**` sia un sottodominio Core isolato:
 * - Solo import relativi interni al sottodominio
 * - Nessun import da altri layer/sottodomini (threads/messages/runtime/api/persistence)
 */

import { describe, it, expect } from 'vitest';
import { glob } from 'glob';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function listNonTestFiles(): Promise<string[]> {
  return glob('src/core/queries/**/*.ts', {
    ignore: ['**/*.test.ts', '**/*.spec.ts'],
  });
}

function extractImportPaths(tsSource: string): string[] {
  const paths: string[] = [];
  for (const m of tsSource.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    paths.push(m[1]);
  }
  return paths;
}

describe('Core Queries — isolation', () => {
  it('non importa moduli fuori da src/core/queries', async () => {
    const files = await listNonTestFiles();
    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const imports = extractImportPaths(content);

      for (const specifier of imports) {
        // No node_modules imports: Query layer must stay pure and internal.
        if (!specifier.startsWith('.')) {
          violations.push(`${file}: import non relativo non permesso: ${specifier}`);
          continue;
        }

        // Resolve relative import and ensure it stays inside src/core/queries
        const abs = resolve(dirname(resolve(process.cwd(), file)), specifier);
        const normalized = abs.replace(/\\/g, '/');
        if (!normalized.includes('/src/core/queries/')) {
          violations.push(`${file}: import esce dal sottodominio: ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

