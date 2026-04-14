/**
 * Config Validation
 * 
 * Validazione fail-fast della configurazione.
 * 
 * Responsabilità ESCLUSIVE:
 * - Validare configurazione secondo schema
 * - Fallire immediatamente se invalida
 * - Nessuna logica applicativa
 * 
 * Vincoli:
 * - Validazione eseguita PRIMA del bootstrap
 * - Errori dichiarativi
 * - Nessun default implicito
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.9B_Runtime_Safety_Map.md
 * - IRIS_STEP5.9_MVP_Hardening_Checklist_and_Results.md (H-05)
 */

import type { AppConfig, PersistenceType } from '../../app/bootstrap/types';
import { CONFIG_SCHEMA, ConfigValidationError } from './schema';

/**
 * Valida configurazione secondo schema
 * 
 * @param config Configurazione da validare
 * @throws ConfigValidationError se configurazione invalida
 */
export function validateConfig(config: AppConfig): void {
  // Valida persistence
  if (!config.persistence) {
    throw new ConfigValidationError('persistence', 'required but missing', config.persistence);
  }
  
  if (!CONFIG_SCHEMA.persistence.values.includes(config.persistence)) {
    throw new ConfigValidationError(
      'persistence',
      `must be one of: ${CONFIG_SCHEMA.persistence.values.join(', ')}`,
      config.persistence
    );
  }

  // Valida HTTP port
  if (typeof config.http.port !== 'number') {
    throw new ConfigValidationError('http.port', 'must be a number', config.http.port);
  }

  if (config.http.port < CONFIG_SCHEMA.httpPort.min) {
    throw new ConfigValidationError(
      'http.port',
      `must be >= ${CONFIG_SCHEMA.httpPort.min}`,
      config.http.port
    );
  }

  if (config.http.port > CONFIG_SCHEMA.httpPort.max) {
    throw new ConfigValidationError(
      'http.port',
      `must be <= ${CONFIG_SCHEMA.httpPort.max}`,
      config.http.port
    );
  }

  // Valida SQLite config (se persistence === 'sqlite')
  if (config.persistence === 'sqlite') {
    if (!config.sqlite) {
      throw new ConfigValidationError(
        'sqlite',
        'required when persistence === "sqlite"',
        config.sqlite
      );
    }

    if (typeof config.sqlite.filePath !== 'string') {
      throw new ConfigValidationError(
        'sqlite.filePath',
        'must be a string',
        config.sqlite.filePath
      );
    }

    if (config.sqlite.filePath.length < CONFIG_SCHEMA.sqliteFilePath.minLength) {
      throw new ConfigValidationError(
        'sqlite.filePath',
        `must have length >= ${CONFIG_SCHEMA.sqliteFilePath.minLength}`,
        config.sqlite.filePath
      );
    }
  }
}

/**
 * Valida e normalizza configurazione da env
 * 
 * @param rawConfig Configurazione raw da env
 * @returns Configurazione validata
 * @throws ConfigValidationError se configurazione invalida
 */
export function validateAndNormalizeConfig(rawConfig: {
  persistence?: string;
  httpPort?: number;
  sqliteFilePath?: string;
}): AppConfig {
  // Normalizza persistence
  const persistence = (rawConfig.persistence || 'memory') as PersistenceType;
  
  // Normalizza HTTP port
  const httpPort = rawConfig.httpPort !== undefined 
    ? rawConfig.httpPort 
    : parseInt(process.env.HTTP_PORT || '3000', 10);

  const sqliteFilePath =
    persistence === 'sqlite' ? rawConfig.sqliteFilePath || process.env.SQLITE_FILE_PATH || ':memory:' : undefined;

  const config: AppConfig = {
    persistence,
    http: {
      port: httpPort,
    },
    ...(persistence === 'sqlite' && sqliteFilePath !== undefined
      ? { sqlite: { filePath: sqliteFilePath } }
      : {}),
  };

  // Valida config
  validateConfig(config);

  return config;
}
