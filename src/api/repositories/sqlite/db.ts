/**
 * SQLite Database Connection
 * 
 * Gestione connessione SQLite con better-sqlite3.
 * 
 * Vincoli:
 * - Nessuna logica di dominio
 * - Nessuna semantica
 * - Solo gestione connessione e migrazioni
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.7_Persistence_Map.md
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Crea e inizializza database SQLite
 * 
 * @param dbPath Path al file database (default: :memory: per test)
 * @returns Database instance inizializzato
 */
export function createDatabase(dbPath: string = ':memory:'): Database.Database {
  const db = new Database(dbPath);
  
  // Abilita foreign keys
  db.pragma('foreign_keys = ON');
  
  // Esegue migrazioni
  runMigrations(db);
  
  return db;
}

/**
 * Esegue migrazioni database
 * 
 * @param db Database instance
 */
function runMigrations(db: Database.Database): void {
  // Legge migration 001_initial.sql
  const migrationPath = join(__dirname, 'migrations', '001_initial.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');
  
  // Esegue migration in una transazione
  const transaction = db.transaction(() => {
    db.exec(migrationSQL);
  });
  
  transaction();
}

/**
 * Chiude database
 * 
 * @param db Database instance
 */
export function closeDatabase(db: Database.Database): void {
  db.close();
}
