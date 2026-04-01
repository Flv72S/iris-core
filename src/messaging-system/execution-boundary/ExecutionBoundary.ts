/**
 * ExecutionBoundary — C.3
 * Interfaccia del confine di esecuzione. Solo contratto; nessuna implementazione concreta.
 */

import type { ExecutionRequest } from './ExecutionRequest';
import type { ExecutionResult } from './ExecutionResult';

/**
 * Confine tra dominio dichiarativo e dominio esecutivo.
 * L'implementazione concreta è esterna (Execution Engine).
 */
export interface ExecutionBoundary {
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
}
