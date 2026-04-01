/**
 * Structured Logger
 * 
 * Logger strutturato con output JSON.
 * 
 * Responsabilità ESCLUSIVE:
 * - Logging strutturato (JSON)
 * - Campi obbligatori: timestamp, level, service, component, correlationId, message, context
 * - Nessuna logica applicativa
 * - Nessuna semantica
 * 
 * Vincoli:
 * - Output sempre JSON
 * - Nessun console.log diretto
 * - Nessun log testuale non strutturato
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.9A_Observability_Map.md
 * - IRIS_STEP5.9_MVP_Hardening_Checklist_and_Results.md (H-01)
 */

/**
 * Log Level
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Component che genera il log
 */
export type LogComponent = 'http' | 'boundary' | 'repository' | 'bootstrap' | 'observability';

/**
 * Log Entry strutturato
 */
export interface LogEntry {
  readonly timestamp: string; // ISO 8601
  readonly level: LogLevel;
  readonly service: 'iris-api';
  readonly component: LogComponent;
  readonly correlationId: string;
  readonly message: string;
  readonly context?: Record<string, unknown>;
}

/**
 * Structured Logger
 * 
 * Logger che output sempre JSON strutturato.
 */
export class StructuredLogger {
  private service: string = 'iris-api';
  private minLevel: LogLevel = 'info';

  constructor(minLevel: LogLevel = 'info') {
    this.minLevel = minLevel;
  }

  /**
   * Verifica se un livello deve essere loggato
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const minIndex = levels.indexOf(this.minLevel);
    const levelIndex = levels.indexOf(level);
    return levelIndex >= minIndex;
  }

  /**
   * Log entry
   */
  private log(
    level: LogLevel,
    component: LogComponent,
    correlationId: string,
    message: string,
    context?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      component,
      correlationId,
      message,
      context,
    };

    // Output JSON strutturato
    const jsonOutput = JSON.stringify(entry);
    
    // Usa console per output (ma sempre JSON strutturato)
    // In produzione, questo può essere reindirizzato a stdout/stderr
    if (level === 'error') {
      console.error(jsonOutput);
    } else {
      console.log(jsonOutput);
    }
  }

  /**
   * Log debug
   */
  debug(
    component: LogComponent,
    correlationId: string,
    message: string,
    context?: Record<string, unknown>
  ): void {
    this.log('debug', component, correlationId, message, context);
  }

  /**
   * Log info
   */
  info(
    component: LogComponent,
    correlationId: string,
    message: string,
    context?: Record<string, unknown>
  ): void {
    this.log('info', component, correlationId, message, context);
  }

  /**
   * Log warn
   */
  warn(
    component: LogComponent,
    correlationId: string,
    message: string,
    context?: Record<string, unknown>
  ): void {
    this.log('warn', component, correlationId, message, context);
  }

  /**
   * Log error
   */
  error(
    component: LogComponent,
    correlationId: string,
    message: string,
    context?: Record<string, unknown>
  ): void {
    this.log('error', component, correlationId, message, context);
  }
}

/**
 * Logger singleton (per uso globale)
 * 
 * Nota: Singleton minimale, solo per accesso globale al logger.
 * Nessuna logica applicativa.
 */
let globalLogger: StructuredLogger | null = null;

/**
 * Inizializza logger globale
 */
export function initializeLogger(minLevel: LogLevel = 'info'): StructuredLogger {
  globalLogger = new StructuredLogger(minLevel);
  return globalLogger;
}

/**
 * Ottiene logger globale
 */
export function getLogger(): StructuredLogger {
  if (!globalLogger) {
    globalLogger = initializeLogger();
  }
  return globalLogger;
}
