/**
 * IrisDeliveryKillSwitch — IRIS 10.1
 * Kill-switch per il layer Delivery. Se OFF, deliver() restituisce risultato con results [].
 */

export const IRIS_DELIVERY_COMPONENT_ID = 'iris-delivery';

export interface DeliveryRegistry {
  isEnabled(componentId: string): boolean;
}

export function isDeliveryEnabled(registry: DeliveryRegistry): boolean {
  return registry.isEnabled(IRIS_DELIVERY_COMPONENT_ID);
}
