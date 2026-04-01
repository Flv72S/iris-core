/**
 * Static Architecture Rules — tipi condivisi
 * Microstep 5.5.1
 *
 * Grafo delle dipendenze astratto. Nessuna lettura filesystem.
 */

/** Arco del grafo: da → a (filePath che importa filePath). */
export interface ImportEdge {
  readonly from: string;
  readonly to: string;
}

/** Grafo delle import: elenco di archi. I nodi sono deducibili dagli archi. */
export interface ImportGraph {
  readonly edges: readonly ImportEdge[];
}

/** Violazione di una regola architetturale. */
export interface Violation {
  readonly ruleId: string;
  readonly message: string;
  readonly from?: string;
  readonly to?: string;
}

/** Regola architetturale: id, descrizione, check sul grafo. */
export interface ArchitectureRule {
  readonly id: string;
  readonly description: string;
  check(graph: ImportGraph): readonly Violation[];
}

/** Restituisce i nodi unici del grafo (from e to di ogni arco). */
export function getNodes(graph: ImportGraph): string[] {
  const set = new Set<string>();
  for (const e of graph.edges) {
    set.add(normalizePath(e.from));
    set.add(normalizePath(e.to));
  }
  return [...set];
}

/** Restituisce i path importati da un dato path. */
export function getImportsFrom(graph: ImportGraph, fromPath: string): string[] {
  const norm = normalizePath(fromPath);
  return graph.edges
    .filter((e) => normalizePath(e.from) === norm)
    .map((e) => normalizePath(e.to));
}

/** Normalizza path (slash unificato, nessun . o ..). */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+/g, '/');
}
