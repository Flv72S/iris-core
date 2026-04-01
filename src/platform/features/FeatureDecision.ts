/**
 * Feature Decision - risultato della valutazione
 * Microstep 5.3.4
 *
 * Per: explainability, audit, test.
 */

export type FeatureDecision =
  | { readonly enabled: true }
  | { readonly enabled: false; readonly reason: string };

export function featureEnabled(): FeatureDecision {
  return Object.freeze({ enabled: true });
}

export function featureDisabled(reason: string): FeatureDecision {
  return Object.freeze({ enabled: false, reason });
}

export function isFeatureEnabled(d: FeatureDecision): d is { enabled: true } {
  return d.enabled === true;
}
