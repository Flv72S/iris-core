/**
 * Write Plugin - contratto puro per Write Side
 * Microstep 5.3.1
 *
 * Nessun side-effect implicito. Hook espliciti e opzionali.
 */

import type { PluginMetadata } from './PluginMetadata';
import type { PluginContext } from './PluginContext';

/** Command osservabile (read-only). */
export interface ObservedCommand {
  readonly type: string;
  readonly payload: unknown;
}

/** Risultato command osservabile. */
export interface ObservedCommandResult {
  readonly success: boolean;
  readonly data?: unknown;
}

export interface WritePlugin {
  readonly metadata: PluginMetadata;

  /** Lifecycle: opzionali */
  onRegister?(context: PluginContext): void | Promise<void>;
  onStart?(context: PluginContext): void | Promise<void>;
  onStop?(context: PluginContext): void | Promise<void>;
  onError?(error: unknown, context: PluginContext): void | Promise<void>;

  /** Write-specific */
  beforeCommand?(
    command: ObservedCommand,
    context: PluginContext
  ): void | Promise<void>;
  afterCommand?(
    command: ObservedCommand,
    result: ObservedCommandResult,
    context: PluginContext
  ): void | Promise<void>;
  onCommandError?(
    command: ObservedCommand,
    error: unknown,
    context: PluginContext
  ): void | Promise<void>;
}
