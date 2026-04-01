/**
 * SignalQuality — Marcatura meccanica, senza interpretazione.
 * MUST NOT: priority, score, severity, interpretation, recommendation.
 */

export type SignalQuality =
  | 'RAW'
  | 'STABLE'
  | 'DUPLICATE'
  | 'NOISY'
  | 'IGNORED';
