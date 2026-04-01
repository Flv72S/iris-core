/**
 * ProductMode — C.9
 * Configurazione UX dichiarativa. MUST NOT: decision, condition evaluation, learning, execution, feature recomputation.
 */

export type ProductModeId = 'DEFAULT' | 'FOCUS' | 'VOICE_FIRST' | 'WELLBEING';

export type ProductModeTone = 'neutral' | 'calm' | 'directive' | 'minimal';

export interface ProductMode {
  readonly id: ProductModeId;
  readonly description: string;
  readonly visibilityRules: {
    readonly hideFeatures?: readonly string[];
    readonly promoteFeatures?: readonly string[];
  };
  readonly orderingOverrides?: readonly {
    readonly featureId: string;
    readonly order: number;
  }[];
  readonly tone: ProductModeTone;
  readonly constraints: {
    readonly maxPrimary: number;
    readonly maxSecondary: number;
  };
}
