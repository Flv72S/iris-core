/**
 * Config Schema
 * 
 * Schema esplicito per validazione configurazione.
 * 
 * Responsabilità ESCLUSIVE:
 * - Definire schema di configurazione
 * - Validare range e tipi
 * - Nessuna logica applicativa
 * 
 * Vincoli:
 * - Schema esplicito (no inferenze)
 * - Validazione fail-fast
 * - Errori dichiarativi
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.9B_Runtime_Safety_Map.md
 * - IRIS_STEP5.9_MVP_Hardening_Checklist_and_Results.md (H-05)
 */

import type { AppConfig, PersistenceType } from '../../app/bootstrap/types';

/**
 * Schema di validazione per configurazione
 */
export interface ConfigSchema {
  readonly persistence: {
    readonly type: 'enum';
    readonly values: readonly PersistenceType[];
    readonly required: true;
  };
  readonly httpPort: {
    readonly type: 'number';
    readonly min: number;
    readonly max: number;
    readonly required: true;
  };
  readonly sqliteFilePath: {
    readonly type: 'string';
    readonly required: false; // Richiesto solo se persistence === 'sqlite'
    readonly minLength: number;
  };
}

/**
 * Schema di validazione configurazione
 */
export const CONFIG_SCHEMA: ConfigSchema = {
  persistence: {
    type: 'enum',
    values: ['memory', 'sqlite'] as const,
    required: true,
  },
  httpPort: {
    type: 'number',
    min: 1,
    max: 65535,
    required: true,
  },
  sqliteFilePath: {
    type: 'string',
    required: false,
    minLength: 1,
  },
};

/**
 * Errore di validazione configurazione
 */
export class ConfigValidationError extends Error {
  constructor(
    public readonly field: string,
    public readonly reason: string,
    public readonly value: unknown
  ) {
    super(`Config validation failed: ${field} - ${reason} (value: ${JSON.stringify(value)})`);
    this.name = 'ConfigValidationError';
  }
}
