/**
 * Read Plugin - contratto puro per Read Side
 * Microstep 5.3.1
 *
 * Nessun side-effect implicito. Hook espliciti e opzionali.
 */

import type { PluginMetadata } from './PluginMetadata';
import type { PluginContext } from './PluginContext';

/** Evento osservabile (read-only). */
export interface ObservedEvent {
  readonly id: string;
  readonly type: string;
  readonly payload: unknown;
}

export interface ReadPlugin {
  readonly metadata: PluginMetadata;

  /** Lifecycle: opzionali */
  onRegister?(context: PluginContext): void | Promise<void>;
  onStart?(context: PluginContext): void | Promise<void>;
  onStop?(context: PluginContext): void | Promise<void>;
  onError?(error: unknown, context: PluginContext): void | Promise<void>;

  /** Read-specific: osservare eventi applicati */
  onEventApplied?(
    event: ObservedEvent,
    readModelVersion: string,
    context: PluginContext
  ): void | Promise<void>;
  onReplayStart?(context: PluginContext): void | Promise<void>;
  onReplayEnd?(context: PluginContext): void | Promise<void>;
}
