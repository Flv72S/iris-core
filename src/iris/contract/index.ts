/**
 * IRIS 11.C — Messaging System Contract
 * IRIS 12.2 — Messaging Contract (Action Intent → contratti dichiarativi)
 */

export type { IrisDecisionContract } from './IrisDecisionContract';
export type { IrisDecisionContractSnapshot } from './IrisDecisionContractSnapshot';
export type { IrisMessagingContract } from './IrisMessagingContract';
export type { IrisMessagingContractSnapshot } from './IrisMessagingContractSnapshot';
export type { IrisExecutionCapability } from './IrisExecutionCapability';
export type { IrisCompatibilityNote, IrisContractCompatibilitySnapshot } from './IrisContractCompatibilitySnapshot';
export type { IrisMessagingContractProvider } from './IrisMessagingContractProvider';
export {
  IRIS_MESSAGING_CONTRACT_COMPONENT_ID,
  isMessagingContractEnabled,
  type MessagingContractRegistry,
} from './IrisMessagingContractKillSwitch';
export { IrisMessagingContractEngine } from './IrisMessagingContractEngine';
