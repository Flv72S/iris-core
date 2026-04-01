/**
 * Tenant Decision - risultato della valutazione tenant
 * Microstep 5.4.2
 *
 * Decisioni spiegabili. Oggetti immutabili (frozen).
 */

export type TenantDecision =
  | { readonly allow: true }
  | { readonly allow: false; readonly reason: string };

export function tenantAllowed(): TenantDecision {
  return Object.freeze({ allow: true });
}

export function tenantDenied(reason: string): TenantDecision {
  return Object.freeze({ allow: false, reason });
}

export function isTenantAllowed(d: TenantDecision): d is { allow: true } {
  return d.allow === true;
}
