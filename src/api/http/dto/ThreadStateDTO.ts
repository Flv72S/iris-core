/**
 * Thread State DTO
 * 
 * DTO per HTTP layer - struttura esterna, separata da Core Types.
 * 
 * Vincoli:
 * - DTO ≠ Core Types
 * - DTO ≠ Repository Types
 * - DTO = struttura esterna validabile
 * - Nessun campo opzionale ambiguo
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.6_HTTP_Adapter_Map.md
 */

/**
 * Thread State enum (per DTO)
 */
export type ThreadStateDTO = 'OPEN' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';

/**
 * Response DTO per stato thread
 */
export interface ThreadStateResponseDTO {
  readonly threadId: string;
  readonly state: ThreadStateDTO;
  readonly lastStateChangeAt: number;
  readonly canAcceptMessages: boolean;
}

/**
 * Request DTO per transizione stato thread
 */
export interface ThreadStateTransitionRequestDTO {
  readonly threadId: string;
  readonly targetState: 'PAUSED' | 'CLOSED' | 'ARCHIVED';
  readonly reason?: string;
}

/**
 * Response DTO per transizione stato thread
 */
export interface ThreadStateTransitionResponseDTO {
  readonly threadId: string;
  readonly previousState: 'OPEN' | 'PAUSED' | 'CLOSED';
  readonly newState: 'OPEN' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';
  readonly transitionedAt: number;
}

/**
 * Error DTO per thread state
 */
export interface ThreadStateErrorDTO {
  readonly code: string;
  readonly message: string;
  readonly threadId?: string;
  readonly currentState?: ThreadStateDTO;
  readonly requestedState?: 'OPEN' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';
}
