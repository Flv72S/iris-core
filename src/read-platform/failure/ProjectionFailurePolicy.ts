/**
 * Projection Failure Policy - gestione errori senza bloccare il sistema
 * Microstep 5.2.1 - Retry, Dead-Letter, Skip & Alert
 *
 * Stateless. Compatibile con live, replay, migrazione.
 */

/** Contesto minimo per la decisione. */
export interface ProjectionFailureContext {
  readonly event: { readonly id: string; readonly type: string };
  readonly targetVersion: string;
  readonly error: unknown;
  readonly attemptCount: number;
}

/** Azione decisa dalla policy. */
export type FailureResolutionAction = 'RETRY' | 'DEAD_LETTER' | 'SKIP';

export interface FailureResolution {
  readonly action: FailureResolutionAction;
}

/** Fallback quando i retry sono esauriti. */
export type FallbackStrategy = 'DEAD_LETTER' | 'SKIP_AND_ALERT';

export interface ProjectionFailurePolicyConfig {
  readonly maxRetries: number;
  readonly fallbackStrategy: FallbackStrategy;
}

/**
 * Policy centralizzata per gestione fallimenti projection.
 * Restituisce risultato esplicito, nessun side-effect.
 */
export class ProjectionFailurePolicy {
  constructor(private readonly config: ProjectionFailurePolicyConfig) {}

  /**
   * Decide la strategia da applicare.
   * @returns FailureResolution esplicito
   */
  handleFailure(context: ProjectionFailureContext): FailureResolution {
    if (context.attemptCount < this.config.maxRetries) {
      return { action: 'RETRY' };
    }
    return this.config.fallbackStrategy === 'DEAD_LETTER'
      ? { action: 'DEAD_LETTER' }
      : { action: 'SKIP' };
  }
}
