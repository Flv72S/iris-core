/**
 * Feature Flag Registry (STEP 6C)
 *
 * Responsabilità ESCLUSIVE:
 * - definire elenco esplicito flag supportate
 * - associare key, description, endpoints[]
 * - nessuna lettura di env
 * - nessuna mutazione runtime
 *
 * Vincoli:
 * - Core ignaro dei flag
 * - Per-endpoint (prefix match)
 * - Auditabilità via registry centralizzato
 */

export type FeatureFlagKey = 'FEATURE_THREADS_ENABLED' | 'FEATURE_SYNC_ENABLED';

export interface FeatureFlagDefinition {
  readonly key: FeatureFlagKey;
  readonly description: string;
  /**
   * Endpoint protetti (prefix).
   * Esempio: "/threads" protegge "/threads/*"
   */
  readonly endpoints: readonly string[];
}

export const FEATURE_FLAG_REGISTRY: readonly FeatureFlagDefinition[] = [
  {
    key: 'FEATURE_THREADS_ENABLED',
    description: 'Abilita endpoint threads/messages (prefix: /threads).',
    endpoints: ['/threads'],
  },
  {
    key: 'FEATURE_SYNC_ENABLED',
    description: 'Abilita endpoint sync (prefix: /sync).',
    endpoints: ['/sync'],
  },
] as const;

export function matchProtectedFlag(pathname: string): FeatureFlagKey | null {
  for (const def of FEATURE_FLAG_REGISTRY) {
    for (const ep of def.endpoints) {
      if (pathname === ep || pathname.startsWith(`${ep}/`)) {
        return def.key;
      }
    }
  }
  return null;
}

