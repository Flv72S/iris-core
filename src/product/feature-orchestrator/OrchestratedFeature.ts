/**
 * OrchestratedFeature — C.8
 * Feature con ordine e visibilità. MUST NOT: action, command, trigger, execution intent, side-effect.
 */

export type FeatureVisibility = 'primary' | 'secondary' | 'hidden';

export interface OrchestratedFeature<Output = unknown> {
  readonly featureId: string;
  readonly output: Output;
  readonly order: number;
  readonly visibility: FeatureVisibility;
}
