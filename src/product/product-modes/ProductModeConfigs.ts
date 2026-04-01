/**
 * ProductModeConfigs — C.9
 * Configurazioni dichiarative dei 4 mode. Nessuna logica.
 */

import type { ProductMode, ProductModeId } from './ProductMode';

const MODES: Record<ProductModeId, ProductMode> = {
  DEFAULT: Object.freeze({
    id: 'DEFAULT',
    description: 'Bilanciato, informativo, nessuna forzatura.',
    visibilityRules: Object.freeze({}),
    tone: 'neutral',
    constraints: Object.freeze({ maxPrimary: 1, maxSecondary: 2 }),
  }),
  FOCUS: Object.freeze({
    id: 'FOCUS',
    description: 'Riduce rumore, enfatizza Daily Focus.',
    visibilityRules: Object.freeze({
      promoteFeatures: Object.freeze(['daily-focus']),
      hideFeatures: Object.freeze(['smart-summary', 'voice-readiness']),
    }),
    tone: 'minimal',
    constraints: Object.freeze({ maxPrimary: 1, maxSecondary: 0 }),
  }),
  VOICE_FIRST: Object.freeze({
    id: 'VOICE_FIRST',
    description: 'Semplifica output, privilegia feature vocali.',
    visibilityRules: Object.freeze({
      promoteFeatures: Object.freeze(['voice-readiness']),
    }),
    tone: 'directive',
    constraints: Object.freeze({ maxPrimary: 1, maxSecondary: 1 }),
  }),
  WELLBEING: Object.freeze({
    id: 'WELLBEING',
    description: 'Riduce densità, enfatizza stato wellbeing.',
    visibilityRules: Object.freeze({
      promoteFeatures: Object.freeze(['wellbeing']),
    }),
    tone: 'calm',
    constraints: Object.freeze({ maxPrimary: 1, maxSecondary: 0 }),
  }),
};

export function getProductMode(id: ProductModeId): ProductMode {
  return MODES[id];
}

export function getAllProductModeIds(): readonly ProductModeId[] {
  return Object.freeze(['DEFAULT', 'FOCUS', 'VOICE_FIRST', 'WELLBEING']);
}
