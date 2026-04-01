/**
 * Plugin Context - sandbox logico per plugin
 * Microstep 5.3.1
 *
 * Espone solo API consentite. Nessun accesso a DB, FS, HTTP.
 */

export interface PluginLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface PluginContext {
  readonly logger: PluginLogger;
  readonly clock: { now(): number };
  readonly pluginId: string;
  readonly pluginVersion: string;
}
