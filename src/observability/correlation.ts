/**
 * Correlation ID
 * 
 * Gestione correlation ID per tracciamento end-to-end.
 * 
 * Responsabilità ESCLUSIVE:
 * - Generare correlation ID
 * - Propagare correlation ID (HTTP → Boundary → Repository)
 * - Nessuna logica applicativa
 * - Nessuna semantica
 * 
 * Vincoli:
 * - Correlation ID non persistente
 * - Correlation ID non semantico
 * - Solo tracciamento, nessuna decisione
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.9A_Observability_Map.md
 * - IRIS_STEP5.9_MVP_Hardening_Checklist_and_Results.md (H-11)
 */

/**
 * Genera correlation ID univoco
 */
export function generateCorrelationId(): string {
  return `corr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Estrae correlation ID da header HTTP
 */
export function extractCorrelationId(headers: Record<string, string | undefined>): string {
  return headers['x-correlation-id'] || headers['x-request-id'] || generateCorrelationId();
}

/**
 * Context per propagazione correlation ID
 * 
 * Usato per propagare correlation ID attraverso i layer senza modificare Core/Boundary.
 */
export interface CorrelationContext {
  readonly correlationId: string;
}

/**
 * Crea correlation context
 */
export function createCorrelationContext(correlationId: string): CorrelationContext {
  return { correlationId };
}
