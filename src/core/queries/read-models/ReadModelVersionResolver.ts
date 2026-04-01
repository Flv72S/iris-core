/**
 * Read Model Version Resolver — selezione versione per query
 * Microstep 5.1.2 — Read Model Versioning
 *
 * Il layer query usa la versione (da ApiVersion.id) per selezionare v1 o v2.
 * Nessuna dipendenza da HTTP/API. Nessuna logica nei controller.
 */

export type ReadModelVersionId = 'v1' | 'v2';

const SUPPORTED: ReadModelVersionId[] = ['v1', 'v2'];

/**
 * Risolve la versione del read model da identificatore.
 * @param versionId Es. 'v1', 'v2' (tipicamente da ApiVersion.id)
 * @returns ReadModelVersionId
 */
export function resolveReadModelVersion(versionId: string): ReadModelVersionId {
  const normalized = versionId.trim().toLowerCase();
  if (SUPPORTED.includes(normalized as ReadModelVersionId)) {
    return normalized as ReadModelVersionId;
  }
  return 'v1'; // default backward-compatible
}
