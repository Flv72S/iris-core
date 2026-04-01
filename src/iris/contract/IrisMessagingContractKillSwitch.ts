/**
 * IrisMessagingContractKillSwitch — IRIS 12.2
 * Kill-switch per il Messaging Contract. Registry read-only.
 */

export const IRIS_MESSAGING_CONTRACT_COMPONENT_ID = 'iris-messaging-contract';

export interface MessagingContractRegistry {
  isEnabled(componentId: string): boolean;
}

export function isMessagingContractEnabled(registry: MessagingContractRegistry): boolean {
  return registry.isEnabled(IRIS_MESSAGING_CONTRACT_COMPONENT_ID);
}
