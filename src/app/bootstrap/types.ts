/**
 * Bootstrap Types
 * 
 * Tipi di configurazione per il Composition Root.
 * 
 * Vincoli:
 * - Nessuna logica
 * - Solo tipi
 * - Nessuna semantica
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.8_Bootstrap_Map.md
 */

/**
 * Tipo di persistence supportato
 */
export type PersistenceType = 'memory' | 'sqlite';

/**
 * Configurazione HTTP
 */
export interface HttpConfig {
  readonly port: number;
}

/**
 * Configurazione SQLite (opzionale, richiesta solo se persistence === 'sqlite')
 */
export interface SqliteConfig {
  readonly filePath: string;
}

/**
 * Configurazione applicazione
 * 
 * Vincoli:
 * - persistence determina quale implementazione repository usare
 * - sqlite è opzionale e richiesto solo se persistence === 'sqlite'
 */
export interface AppConfig {
  readonly persistence: PersistenceType;
  readonly http: HttpConfig;
  readonly sqlite?: SqliteConfig;
}
