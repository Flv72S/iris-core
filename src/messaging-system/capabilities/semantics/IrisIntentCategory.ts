/**
 * IrisIntentCategory — C.1.6
 * Categoria dell'intento della capability. Puramente dichiarativo.
 */

export const IRIS_INTENT_CATEGORIES = [
  'transform',
  'observe',
  'assist',
  'reduce',
  'enhance',
  'defer',
] as const;

export type IrisIntentCategory = (typeof IRIS_INTENT_CATEGORIES)[number];
