/**
 * Messaging System — Contract Interpreter (Microstep C.1)
 * Tradurre Action Intent in Messaging Contract, senza eseguire nulla.
 */

export type { MessagingContract } from './MessagingContract';
export type { MessagingContractSnapshot } from './MessagingContractSnapshot';
export {
  MESSAGING_CONTRACT_COMPONENT_ID,
  isMessagingContractEnabled,
  type MessagingContractRegistry,
} from './MessagingContractKillSwitch';
export { MessagingContractEngine } from './MessagingContractEngine';
