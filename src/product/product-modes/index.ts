/**
 * Product Modes — C.9
 * Lenti UX: modulano visibilità e ordering senza ricalcolo né decisione.
 */

export type {
  ProductMode,
  ProductModeId,
  ProductModeTone,
} from './ProductMode';
export type { ProductModeInput } from './ProductModeInput';
export type { ProductModeApplier } from './ProductModeApplier';
export {
  PRODUCT_MODE_COMPONENT_ID,
  isProductModeEnabled,
  type ProductModeRegistry,
} from './ProductModeKillSwitch';
export { getProductMode, getAllProductModeIds } from './ProductModeConfigs';
export {
  DefaultProductModeApplier,
  applyProductMode,
} from './DefaultProductModeApplier';
