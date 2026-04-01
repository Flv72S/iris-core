/**
 * UxContractMeta — Metadati del contratto UX.
 * productMode, generatedAt, contractVersion (major.minor).
 */

import type { ProductMode } from '../orchestration/ProductMode';

export interface UxContractMeta {
  readonly productMode: ProductMode;
  readonly generatedAt: number;
  readonly contractVersion: string;
}
