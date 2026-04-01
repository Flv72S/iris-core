/**
 * CI Architecture Gate — Microstep 5.5.2
 *
 * Costruisce l'ImportGraph reale da src/, applica le regole CQRS e Layering,
 * blocca il build in caso di violazioni. Eseguibile in CI e localmente.
 *
 * Nessuna modifica alle regole (5.5.1 è source of truth).
 * Nessuna logica architetturale duplicata.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as ts from 'typescript';
import type { ImportGraph, ImportEdge, Violation } from '../src/architecture/rules/types';
import { checkCqrsRules, checkLayeringRules, normalizePath } from '../src/architecture/rules/index';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// —— Costruzione Import Graph ——

/** Estrae i path degli import statici da un file TypeScript (AST). */
function extractStaticImports(filePath: string, content: string): string[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );
  const imports: string[] = [];
  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) {
      const specifier = node.moduleSpecifier;
      if (ts.isStringLiteral(specifier)) {
        imports.push(specifier.text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return imports;
}

/** Restituisce true se il path è un import interno (relativo o sotto src/). */
function isInternalImport(specifier: string): boolean {
  return specifier.startsWith('.') || specifier.startsWith('/');
}

/**
 * Risolve un path di import relativo rispetto alla directory del file che importa.
 * Restituisce path normalizzato (forward slash) relativo a rootDir, o null se fuori da src/.
 */
function resolveImport(
  fromPath: string,
  specifier: string,
  rootDir: string,
  srcDir: string,
  fileSet: Set<string>
): string | null {
  if (!isInternalImport(specifier)) return null;
  const fromDir = path.dirname(fromPath);
  const resolved = path.resolve(rootDir, fromDir, specifier);
  let normalized = path.relative(rootDir, resolved).replace(/\\/g, '/');
  if (!normalized.startsWith('src/')) return null;
  if (!path.extname(normalized)) {
    const withTs = normalized + '.ts';
    const withTsx = normalized + '.tsx';
    if (fileSet.has(withTs)) normalized = withTs;
    else if (fileSet.has(withTsx)) normalized = withTsx;
    else normalized = withTs;
  }
  return normalized;
}

/** Raccoglie ricorsivamente i file .ts e .tsx sotto una directory (path relativi a rootDir). */
function listTsFiles(dir: string, rootDir: string, acc: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(rootDir, full).replace(/\\/g, '/');
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name !== '.git') {
        listTsFiles(full, rootDir, acc);
      }
    } else if (e.isFile() && /\.(ts|tsx)$/.test(e.name)) {
      acc.push(rel);
    }
  }
  return acc;
}

/**
 * Costruisce l'ImportGraph a partire dal filesystem (o da funzioni iniettate per test).
 */
export function buildImportGraph(options: {
  rootDir: string;
  srcDir: string;
  listFiles?: (dir: string) => string[];
  readFile?: (filePath: string) => string;
}): ImportGraph {
  const rootDir = path.resolve(options.rootDir);
  const srcDir = path.resolve(options.rootDir, options.srcDir.replace(/^src\/?$/, 'src'));
  const listFiles = options.listFiles ?? ((dir: string) => listTsFiles(dir, rootDir));
  const readFile = options.readFile ?? ((filePath: string) => fs.readFileSync(filePath, 'utf-8'));

  const allFiles = listFiles(srcDir).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
  const fileSet = new Set(allFiles);
  const edges: ImportEdge[] = [];

  for (const fromPath of allFiles) {
    const absPath = path.join(rootDir, fromPath);
    let content: string;
    try {
      content = readFile(absPath);
    } catch {
      continue;
    }
    const specifiers = extractStaticImports(fromPath, content);
    for (const spec of specifiers) {
      const toPath = resolveImport(fromPath, spec, rootDir, srcDir, fileSet);
      if (toPath != null) {
        edges.push({
          from: normalizePath(fromPath),
          to: normalizePath(toPath),
        });
      }
    }
  }

  return { edges };
}

// —— Applicazione regole e report ——

/** Applica tutte le regole architetturali e restituisce violazioni ordinate. */
export function runArchitectureCheck(graph: ImportGraph): {
  violations: Violation[];
  exitCode: 0 | 1;
} {
  const cqrs = checkCqrsRules(graph);
  const layering = checkLayeringRules(graph);
  const violations = [...cqrs, ...layering].sort((a, b) => {
    const id = (a.ruleId ?? '').localeCompare(b.ruleId ?? '');
    if (id !== 0) return id;
    const from = (a.from ?? '').localeCompare(b.from ?? '');
    if (from !== 0) return from;
    return (a.to ?? '').localeCompare(b.to ?? '');
  });
  return {
    violations,
    exitCode: violations.length > 0 ? 1 : 0,
  };
}

/** Stampa il report delle violazioni in console. */
export function printReport(violations: Violation[]): void {
  if (violations.length === 0) {
    console.log('✅ Architecture check passed (0 violations)');
    return;
  }
  for (const v of violations) {
    console.error('');
    console.error(`❌ Architecture violation [${v.ruleId}]`);
    console.error(`   ${v.message}`);
    if (v.from != null) console.error(`   from: ${v.from}`);
    if (v.to != null) console.error(`   to:   ${v.to}`);
  }
  console.error('');
  console.error(`Total: ${violations.length} violation(s)`);
}

// —— Entry point (solo quando lo script è eseguito direttamente) ——

async function main(): Promise<void> {
  const rootDir = process.cwd();
  const srcDir = path.join(rootDir, 'src');
  if (!fs.existsSync(srcDir)) {
    console.error('src/ directory not found. Run from project root.');
    process.exit(1);
  }
  const graph = buildImportGraph({
    rootDir,
    srcDir: 'src',
    listFiles: (dir) => listTsFiles(dir, rootDir),
  });
  const { violations, exitCode } = runArchitectureCheck(graph);
  printReport(violations);
  process.exit(exitCode);
}

const isMainModule =
  process.argv[1] != null &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
