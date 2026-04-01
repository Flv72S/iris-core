/**
 * Tenant Context - perimetro di isolamento logico
 * Microstep 5.4.2
 *
 * Immutabile. Costruito dal core. I plugin non conoscono il tenant.
 */

export interface TenantContext {
  readonly tenantId: string;
  readonly region: string;
  readonly compliance: readonly string[];
}

/** Crea un contesto tenant immutabile (frozen). */
export function createTenantContext(
  input: Readonly<{
    tenantId: string;
    region: string;
    compliance?: readonly string[];
  }>
): TenantContext {
  return Object.freeze({
    tenantId: input.tenantId,
    region: input.region,
    compliance: Object.freeze([...(input.compliance ?? [])]),
  });
}
