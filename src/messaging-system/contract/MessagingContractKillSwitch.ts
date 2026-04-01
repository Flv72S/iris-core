/**
 * MessagingContractKillSwitch — Microstep C.1
 * Kill-switch per il Contract Interpreter. Se OFF → snapshot vuoto.
 */

export const MESSAGING_CONTRACT_COMPONENT_ID = 'messaging-system-contract';

export interface MessagingContractRegistry {
  isEnabled(componentId: string): boolean;
}

export function isMessagingContractEnabled(registry: MessagingContractRegistry): boolean {
  return registry.isEnabled(MESSAGING_CONTRACT_COMPONENT_ID);
}
