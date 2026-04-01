/**
 * Phase 13XX-C — Node Passport System. Updater.
 * Synchronizes passport data with system events; timestamps passed in for determinism.
 */

import type { GovernanceFlag } from './node_passport_types.js';
import type { NodePassportRegistry } from './node_passport_registry.js';
import { NodePassportError, NodePassportErrorCode } from './node_passport_errors.js';

export interface NodePassportUpdaterOptions {
  /** Called after any passport update (observability). */
  onPassportUpdate?: (node_id: string, kind: 'trust' | 'reputation' | 'anomaly' | 'governance') => void;
}

export class NodePassportUpdater {
  constructor(
    private readonly registry: NodePassportRegistry,
    private readonly options: NodePassportUpdaterOptions = {}
  ) {}

  updateTrustScore(node_id: string, score: number, timestamp: number): void {
    const record = this.registry.getPassport(node_id);
    if (record === undefined) {
      throw new NodePassportError(`Passport not found: ${node_id}`, NodePassportErrorCode.PASSPORT_NOT_FOUND);
    }
    record.updateTrust(score, timestamp);
    this.registry.updatePassport(record);
    this.options.onPassportUpdate?.(node_id, 'trust');
  }

  updateReputationScore(node_id: string, score: number, timestamp: number): void {
    const record = this.registry.getPassport(node_id);
    if (record === undefined) {
      throw new NodePassportError(`Passport not found: ${node_id}`, NodePassportErrorCode.PASSPORT_NOT_FOUND);
    }
    record.updateReputation(score, timestamp);
    this.registry.updatePassport(record);
    this.options.onPassportUpdate?.(node_id, 'reputation');
  }

  recordAnomaly(node_id: string, timestamp: number): void {
    const record = this.registry.getPassport(node_id);
    if (record === undefined) {
      throw new NodePassportError(`Passport not found: ${node_id}`, NodePassportErrorCode.PASSPORT_NOT_FOUND);
    }
    record.recordAnomaly(timestamp, timestamp);
    this.registry.updatePassport(record);
    this.options.onPassportUpdate?.(node_id, 'anomaly');
  }

  applyGovernanceFlag(node_id: string, flag: GovernanceFlag, timestamp: number): void {
    const record = this.registry.getPassport(node_id);
    if (record === undefined) {
      throw new NodePassportError(`Passport not found: ${node_id}`, NodePassportErrorCode.PASSPORT_NOT_FOUND);
    }
    record.addGovernanceFlag(flag, timestamp);
    this.registry.updatePassport(record);
    this.options.onPassportUpdate?.(node_id, 'governance');
  }

  removeGovernanceFlag(node_id: string, flag: GovernanceFlag, timestamp: number): void {
    const record = this.registry.getPassport(node_id);
    if (record === undefined) {
      throw new NodePassportError(`Passport not found: ${node_id}`, NodePassportErrorCode.PASSPORT_NOT_FOUND);
    }
    record.removeGovernanceFlag(flag, timestamp);
    this.registry.updatePassport(record);
    this.options.onPassportUpdate?.(node_id, 'governance');
  }
}
