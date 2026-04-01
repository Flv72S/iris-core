/**
 * SemanticInput — 8.2.0
 * Input read-only derivato dalla Fase 7. Il Semantic Engine NON modifica mai questo dato.
 */

import type { Phase7ReadOnly } from '../contracts';

/**
 * Input accettato dal SemanticEngine. MUST be read-only data derived from Phase 7.
 * Engine MUST NOT mutate or extend this data.
 */
export type SemanticInput = Phase7ReadOnly<unknown>;
