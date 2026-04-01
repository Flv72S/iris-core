/**
 * Feature Flag Loader (STEP 6C)
 *
 * Responsabilità ESCLUSIVE:
 * - leggere flag da process.env
 * - validare valore ammesso: "true" | "false"
 * - produrre mappa immutabile { [flagKey]: boolean }
 *
 * Regole:
 * - flag mancante => OFF (fail-closed)
 * - valore invalido => abort startup (throw)
 */

import { FEATURE_FLAG_REGISTRY, type FeatureFlagKey } from './FeatureFlagRegistry';

export type FeatureFlagStateMap = Readonly<Record<FeatureFlagKey, boolean>>;

function parseFlagValue(raw: string | undefined, key: FeatureFlagKey): boolean {
  if (raw === undefined) return false; // missing => OFF
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`Feature flag value invalid: ${key} must be 'true' or 'false' (got: ${raw})`);
}

export function loadFeatureFlagsFromEnv(env: NodeJS.ProcessEnv = process.env): FeatureFlagStateMap {
  const out: Record<FeatureFlagKey, boolean> = {} as any;
  for (const def of FEATURE_FLAG_REGISTRY) {
    out[def.key] = parseFlagValue(env[def.key], def.key);
  }
  return Object.freeze(out);
}

export function getFeatureFlagAudit(flags: FeatureFlagStateMap): Array<{
  key: FeatureFlagKey;
  description: string;
  endpoints: readonly string[];
  state: 'ON' | 'OFF';
}> {
  return FEATURE_FLAG_REGISTRY.map((def) => ({
    key: def.key,
    description: def.description,
    endpoints: def.endpoints,
    state: flags[def.key] ? 'ON' : 'OFF',
  }));
}

