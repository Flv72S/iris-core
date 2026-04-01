/**
 * Plugin Decision - risultato della governance
 * Microstep 5.3.3
 *
 * Usato per: logging, audit, explainability, test.
 */

export type PluginDecision =
  | { readonly allow: true }
  | { readonly allow: false; readonly reason: string };

export function allow(): PluginDecision {
  return Object.freeze({ allow: true });
}

export function deny(reason: string): PluginDecision {
  return Object.freeze({ allow: false, reason });
}

export function isAllowed(d: PluginDecision): d is { allow: true } {
  return d.allow === true;
}
