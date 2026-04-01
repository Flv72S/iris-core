/**
 * Feature Definition - descrizione dichiarativa di una feature
 * Microstep 5.3.4
 *
 * Nessuna logica esecutiva. Solo dichiarazione.
 */

export type FeatureEnvironment = 'dev' | 'staging' | 'prod';

export interface FeatureDefinition {
  readonly key: string;
  readonly description: string;
  readonly defaultEnabled: boolean;
  /** Se presente, la feature è valutata solo in questi ambienti. */
  readonly environments?: readonly FeatureEnvironment[];
  /** Versione API minima richiesta (es. "v2"). */
  readonly minApiVersion?: string;
  /** Percentuale di rollout 0–100. Deterministico per subjectId. */
  readonly rolloutPercentage?: number;
}
