/**
 * Core Threads Isolation — Architectural Blocking Test
 *
 * Scopo (bloccante):
 * - garantire che il codice "production" in `src/core/threads/**`
 *   non importi moduli esterni al sottodominio Core Threads.
 *
 * Ambito:
 * - questo test può usare Node APIs (fs/path) e `glob` per analisi statica.
 * - NON introduce semantica di dominio e NON modifica comportamento runtime.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve, normalize } from 'node:path';
import { globSync } from 'glob';

const CORE_THREADS_ROOT = normalize(resolve(process.cwd(), 'src/core/threads'));
const CORE_ROOT = normalize(resolve(process.cwd(), 'src/core'));

function isWithinCoreThreads(absPath: string): boolean {
  const normalized = normalize(absPath);
  return normalized === CORE_THREADS_ROOT || normalized.startsWith(CORE_THREADS_ROOT + '\\');
}

/** Consente import da altri moduli core (es. src/core/events) — Blocco 6.1.1. */
function isWithinCore(absPath: string): boolean {
  const normalized = normalize(absPath);
  return normalized === CORE_ROOT || normalized.startsWith(CORE_ROOT + '\\');
}

function extractModuleSpecifiers(source: string): string[] {
  const specifiers: string[] = [];

  // Handles:
  // - import ... from 'x'
  // - export ... from 'x'
  // - import 'x'
  const importFromRe = /\bimport\s+[^;]*?\sfrom\s+['"]([^'"]+)['"]/g;
  const exportFromRe = /\bexport\s+[^;]*?\sfrom\s+['"]([^'"]+)['"]/g;
  const importOnlyRe = /\bimport\s+['"]([^'"]+)['"]/g;

  for (const re of [importFromRe, exportFromRe, importOnlyRe]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) {
      specifiers.push(m[1]);
    }
  }

  return specifiers;
}

describe('Core Threads — Isolation (no forbidden imports)', () => {
  it('i file non-test in src/core/threads/** devono importare solo moduli interni (relative imports)', () => {
    const files = globSync('src/core/threads/**/*.ts', {
      nodir: true,
      windowsPathsNoEscape: true,
      ignore: [
        'src/core/threads/**/__tests__/**',
        'src/core/threads/**/tests/**',
        'src/core/threads/**/*.test.ts',
      ],
    });

    const violations: Array<{ file: string; specifier: string; reason: string }> = [];

    for (const file of files) {
      const absFile = normalize(resolve(process.cwd(), file));
      const src = readFileSync(absFile, 'utf8');
      const specifiers = extractModuleSpecifiers(src);

      for (const specifier of specifiers) {
        // Enforce: Core Threads production files must only use relative imports.
        if (!specifier.startsWith('.')) {
          violations.push({
            file,
            specifier,
            reason: 'non-relative import in Core Threads production code',
          });
          continue;
        }

        const resolved = normalize(resolve(dirname(absFile), specifier));
        if (!isWithinCoreThreads(resolved) && !isWithinCore(resolved)) {
          violations.push({
            file,
            specifier,
            reason: 'relative import escapes src/core',
          });
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

