/**
 * IrisMessagingKillSwitch — IRIS 9.2
 * Kill-switch locale alla Fase 9. Se OFF, bind() restituisce [].
 */

export const IRIS_MESSAGING_COMPONENT_ID = 'iris-messaging';

export interface MessagingRegistry {
  isEnabled(componentId: string): boolean;
}

export function isMessagingEnabled(registry: MessagingRegistry): boolean {
  return registry.isEnabled(IRIS_MESSAGING_COMPONENT_ID);
}
