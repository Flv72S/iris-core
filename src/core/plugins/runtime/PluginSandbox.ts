/**
 * Plugin Sandbox - sandbox logico per esecuzione plugin
 * Microstep 5.3.2
 *
 * Protegge il core da: throw, promise reject, side-effect non dichiarati.
 * Errori normalizzati in PluginExecutionError; nessuna eccezione propagata.
 */

import type { PluginContext } from '../PluginContext';
import type { RegisteredPlugin } from './PluginRegistry';
import { PluginExecutionError } from './PluginExecutionError';

function isPluginContextLike(value: unknown): value is PluginContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    'pluginId' in value &&
    'pluginVersion' in value &&
    'logger' in value &&
    'clock' in value
  );
}

/** Shallow-freeze per impedire al plugin di mutare il context. */
function freezeContext(ctx: PluginContext): PluginContext {
  return Object.freeze({ ...ctx }) as PluginContext;
}

/**
 * Prepara gli args: se l'ultimo arg è un context, lo restituisce frozen.
 */
function prepareArgs(args: unknown[]): unknown[] {
  if (args.length === 0) return args;
  const last = args[args.length - 1];
  if (isPluginContextLike(last)) {
    return [...args.slice(0, -1), freezeContext(last)];
  }
  return args;
}

export class PluginSandbox {
  /**
   * Esegue un hook del plugin in sandbox.
   * Cattura throw e promise reject, normalizza in PluginExecutionError.
   * Non propaga eccezioni; ritorna l'errore normalizzato o null se ok.
   */
  async execute(
    plugin: RegisteredPlugin,
    hookName: string,
    args: unknown[],
    context: PluginContext
  ): Promise<PluginExecutionError | null> {
    const hook = (plugin as Record<string, unknown>)[hookName];
    if (typeof hook !== 'function') {
      return null;
    }

    const safeArgs = prepareArgs([...args, context]);
    const pluginId = plugin.metadata.id;
    const timestamp = Date.now();

    try {
      const result = hook.apply(plugin, safeArgs);
      if (result instanceof Promise) {
        await result;
      }
      return null;
    } catch (originalError: unknown) {
      return new PluginExecutionError({
        pluginId,
        hook: hookName,
        originalError,
        timestamp,
      });
    }
  }
}
