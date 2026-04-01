/**
 * Plugin Registry - elenco plugin registrati con validazione
 * Microstep 5.3.2
 *
 * Registrazione esplicita. Validazione: id univoco, kind coerente, contratto rispettato.
 */

import type { ReadPlugin } from '../ReadPlugin';
import type { WritePlugin } from '../WritePlugin';
import type { PluginKind } from '../PluginMetadata';

export type RegisteredPlugin = ReadPlugin | WritePlugin;

const VALID_KINDS: readonly PluginKind[] = ['read', 'write'];

export class DuplicatePluginIdError extends Error {
  constructor(public readonly pluginId: string) {
    super(`Plugin with id "${pluginId}" is already registered`);
    this.name = 'DuplicatePluginIdError';
  }
}

export class InvalidPluginError extends Error {
  constructor(
    public readonly pluginId: string,
    reason: string
  ) {
    super(`Invalid plugin "${pluginId}": ${reason}`);
    this.name = 'InvalidPluginError';
  }
}

export class PluginRegistry {
  private readonly byId = new Map<string, RegisteredPlugin>();
  private readonly readPlugins: ReadPlugin[] = [];
  private readonly writePlugins: WritePlugin[] = [];

  /**
   * Registra un plugin. Valida id univoco, kind coerente, contratto.
   */
  register(plugin: RegisteredPlugin): void {
    this.validate(plugin);

    const { id, kind } = plugin.metadata;
    if (this.byId.has(id)) {
      throw new DuplicatePluginIdError(id);
    }

    this.byId.set(id, plugin);
    if (kind === 'read') {
      this.readPlugins.push(plugin as ReadPlugin);
    } else {
      this.writePlugins.push(plugin as WritePlugin);
    }
  }

  getReadPlugins(): readonly ReadPlugin[] {
    return [...this.readPlugins];
  }

  getWritePlugins(): readonly WritePlugin[] {
    return [...this.writePlugins];
  }

  getAll(): readonly RegisteredPlugin[] {
    return [...this.byId.values()];
  }

  getById(id: string): RegisteredPlugin | undefined {
    return this.byId.get(id);
  }

  private validate(plugin: RegisteredPlugin): void {
    const meta = plugin.metadata;
    if (!meta || typeof meta !== 'object') {
      throw new InvalidPluginError(
        (meta as { id?: string })?.id ?? '<unknown>',
        'metadata is required'
      );
    }
    if (typeof meta.id !== 'string' || meta.id.trim() === '') {
      throw new InvalidPluginError('<no-id>', 'metadata.id must be a non-empty string');
    }
    if (typeof meta.version !== 'string' || meta.version.trim() === '') {
      throw new InvalidPluginError(meta.id, 'metadata.version must be a non-empty string');
    }
    if (!VALID_KINDS.includes(meta.kind)) {
      throw new InvalidPluginError(
        meta.id,
        `metadata.kind must be one of: ${VALID_KINDS.join(', ')}`
      );
    }
  }
}
