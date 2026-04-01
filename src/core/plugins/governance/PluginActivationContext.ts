/**
 * Plugin Activation Context - contesto in cui un plugin potrebbe essere eseguito
 * Microstep 5.3.3 / 5.4.2 (tenant)
 *
 * Immutabile. Costruito dal core, non dal plugin.
 */

import type { TenantContext } from '../tenant/TenantContext';

export type Environment = 'dev' | 'staging' | 'prod';

export interface PluginActivationContext {
  readonly apiVersion: string;
  readonly environment: Environment;
  readonly features: readonly string[];
  readonly timestamp: number;
  /** Opzionale: multi-tenant. Se assente → single-tenant legacy. */
  readonly tenant?: TenantContext;
}

/** Crea un contesto immutabile (frozen). */
export function createActivationContext(
  input: Readonly<{
    apiVersion: string;
    environment: Environment;
    features?: readonly string[];
    timestamp?: number;
    tenant?: TenantContext;
  }>
): PluginActivationContext {
  return Object.freeze({
    apiVersion: input.apiVersion,
    environment: input.environment,
    features: Object.freeze([...(input.features ?? [])]),
    timestamp: input.timestamp ?? Date.now(),
    tenant: input.tenant,
  });
}
