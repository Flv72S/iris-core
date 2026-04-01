/**
 * ProductModeKillSwitch — C.9
 * OFF → comportamento DEFAULT (stesso output che con mode DEFAULT).
 */

export const PRODUCT_MODE_COMPONENT_ID = 'product-modes';

export type ProductModeRegistry = Record<string, boolean>;

export function isProductModeEnabled(registry: ProductModeRegistry): boolean {
  return registry[PRODUCT_MODE_COMPONENT_ID] === true;
}
