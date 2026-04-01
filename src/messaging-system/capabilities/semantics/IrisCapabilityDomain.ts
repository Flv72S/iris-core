/**
 * IrisCapabilityDomain — C.1.6
 * Dominio cognitivo/operativo della capability. Puramente dichiarativo.
 */

export const IRIS_CAPABILITY_DOMAINS = [
  'cognitive',
  'wellbeing',
  'assistance',
  'memory',
  'social',
  'delivery-support',
] as const;

export type IrisCapabilityDomain = (typeof IRIS_CAPABILITY_DOMAINS)[number];
