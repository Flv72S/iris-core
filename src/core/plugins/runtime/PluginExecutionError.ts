/**
 * Plugin Execution Error - errore normalizzato per esecuzione plugin
 * Microstep 5.3.2
 *
 * Usato per: logging, metrics, audit, future DLQ plugin.
 * Nessuna eccezione plugin propagata fuori dal runtime.
 */

export interface PluginExecutionErrorData {
  readonly pluginId: string;
  readonly hook: string;
  readonly originalError: unknown;
  readonly timestamp: number;
}

export class PluginExecutionError extends Error {
  readonly pluginId: string;
  readonly hook: string;
  readonly originalError: unknown;
  readonly timestamp: number;

  constructor(data: PluginExecutionErrorData) {
    const message = `[Plugin ${data.pluginId}] Hook "${data.hook}" failed: ${formatOriginalError(data.originalError)}`;
    super(message);
    this.name = 'PluginExecutionError';
    this.pluginId = data.pluginId;
    this.hook = data.hook;
    this.originalError = data.originalError;
    this.timestamp = data.timestamp;
    Object.setPrototypeOf(this, PluginExecutionError.prototype);
  }

  toJSON(): PluginExecutionErrorData {
    return {
      pluginId: this.pluginId,
      hook: this.hook,
      originalError: this.originalError,
      timestamp: this.timestamp,
    };
  }
}

function formatOriginalError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return String(err);
}
