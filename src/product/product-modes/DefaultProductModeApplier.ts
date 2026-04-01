/**
 * DefaultProductModeApplier — C.9
 * Applica hide, promote, ordering, constraints. Non modifica payload feature.
 */

import type { ProductModeInput } from './ProductModeInput';
import type { ProductMode } from './ProductMode';
import type { ProductModeApplier } from './ProductModeApplier';
import type { ProductModeRegistry } from './ProductModeKillSwitch';
import { isProductModeEnabled } from './ProductModeKillSwitch';
import { getProductMode } from './ProductModeConfigs';
import type { OrchestratedFeature } from '../feature-orchestrator/OrchestratedFeature';

function applyMode(
  features: readonly OrchestratedFeature<unknown>[],
  mode: ProductMode
): OrchestratedFeature<unknown>[] {
  const hideSet = new Set(mode.visibilityRules.hideFeatures ?? []);
  let list = features.filter((f) => !hideSet.has(f.featureId));

  const orderOverrides = new Map(
    (mode.orderingOverrides ?? []).map((o) => [o.featureId, o.order])
  );
  const promoteList = mode.visibilityRules.promoteFeatures ?? [];
  const promoteIndex = new Map(promoteList.map((id, i) => [id, i]));

  list = [...list].sort((a, b) => {
    const aPromo = promoteIndex.get(a.featureId) ?? Infinity;
    const bPromo = promoteIndex.get(b.featureId) ?? Infinity;
    if (aPromo !== bPromo) return aPromo - bPromo;
    const aOrder = orderOverrides.get(a.featureId) ?? a.order;
    const bOrder = orderOverrides.get(b.featureId) ?? b.order;
    return aOrder - bOrder;
  });

  const { maxPrimary, maxSecondary } = mode.constraints;
  const result: OrchestratedFeature<unknown>[] = [];
  let primaryCount = 0;
  let secondaryCount = 0;
  for (let i = 0; i < list.length; i++) {
    const f = list[i];
    let visibility: 'primary' | 'secondary' | 'hidden' = 'hidden';
    if (primaryCount < maxPrimary) {
      visibility = 'primary';
      primaryCount++;
    } else if (secondaryCount < maxSecondary) {
      visibility = 'secondary';
      secondaryCount++;
    }
    result.push(
      Object.freeze({
        featureId: f.featureId,
        output: f.output,
        order: i,
        visibility,
      })
    );
  }
  return result;
}

export class DefaultProductModeApplier implements ProductModeApplier {
  constructor(private readonly registry: ProductModeRegistry) {}

  apply(input: ProductModeInput): readonly OrchestratedFeature<unknown>[] {
    const effectiveMode = isProductModeEnabled(this.registry)
      ? input.mode
      : 'DEFAULT';
    const mode = getProductMode(effectiveMode);
    const list = applyMode(input.features, mode);
    return Object.freeze(list.map((o) => Object.freeze(o)));
  }
}

export function applyProductMode(input: ProductModeInput): readonly OrchestratedFeature<unknown>[] {
  const mode = getProductMode(input.mode);
  const list = applyMode(input.features, mode);
  return Object.freeze(list.map((o) => Object.freeze(o)));
}
