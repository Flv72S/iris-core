/**
 * FeatureType — C.7 (Demo-Oriented)
 * Tipi di feature visibili in demo. Estensibili solo in C.7+.
 */

export const FEATURE_TYPES = [
  'SMART_INBOX',
  'FOCUS_GUARD',
  'WELLBEING_GATE',
] as const;

export type FeatureType = (typeof FEATURE_TYPES)[number];
