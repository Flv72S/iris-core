/**
 * Capability Decision - risultato della valutazione capability
 * Microstep 5.4.1
 *
 * Decisioni spiegabili. Oggetti immutabili (frozen).
 */

export type CapabilityDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: string };

export function capabilityAllowed(): CapabilityDecision {
  return Object.freeze({ allowed: true });
}

export function capabilityDenied(reason: string): CapabilityDecision {
  return Object.freeze({ allowed: false, reason });
}

export function isCapabilityAllowed(d: CapabilityDecision): d is { allowed: true } {
  return d.allowed === true;
}
