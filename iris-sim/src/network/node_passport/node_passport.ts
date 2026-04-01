/**
 * Phase 13XX-C — Node Passport System. Core record.
 */

import type { NodePassport, GovernanceFlag } from './node_passport_types.js';
import { isValidScore } from './node_passport_types.js';
import { NodePassportError, NodePassportErrorCode } from './node_passport_errors.js';

/** Mutable passport shape for in-place updates; clone when exposing if needed. */
export interface MutableNodePassport {
  node_id: string;
  identity: NodePassport['identity'];
  registration: NodePassport['registration'];
  trust_score: number;
  reputation_score: number;
  anomaly_count: number;
  last_anomaly_timestamp?: number | undefined;
  governance_flags: GovernanceFlag[];
  created_at: number;
  updated_at: number;
}

function clonePassport(p: MutableNodePassport): NodePassport {
  return Object.freeze({
    ...p,
    governance_flags: Object.freeze([...p.governance_flags]),
  });
}

/**
 * Core passport record. All updates modify updated_at and validate scores to [0, 1].
 */
export class NodePassportRecord {
  private _passport: MutableNodePassport;

  constructor(passport: NodePassport | MutableNodePassport) {
    this._passport = {
      node_id: passport.node_id,
      identity: passport.identity,
      registration: passport.registration,
      trust_score: passport.trust_score,
      reputation_score: passport.reputation_score,
      anomaly_count: passport.anomaly_count,
      last_anomaly_timestamp: passport.last_anomaly_timestamp,
      governance_flags: [...passport.governance_flags],
      created_at: passport.created_at,
      updated_at: passport.updated_at,
    };
  }

  get passport(): NodePassport {
    return clonePassport(this._passport);
  }

  updateTrust(score: number, updated_at: number): void {
    if (!isValidScore(score)) {
      throw new NodePassportError(
        `Trust score must be in [0, 1], got ${score}`,
        NodePassportErrorCode.INVALID_TRUST_SCORE
      );
    }
    this._passport.trust_score = score;
    this._passport.updated_at = updated_at;
  }

  updateReputation(score: number, updated_at: number): void {
    if (!isValidScore(score)) {
      throw new NodePassportError(
        `Reputation score must be in [0, 1], got ${score}`,
        NodePassportErrorCode.INVALID_REPUTATION_SCORE
      );
    }
    this._passport.reputation_score = score;
    this._passport.updated_at = updated_at;
  }

  recordAnomaly(timestamp: number, updated_at: number): void {
    this._passport.anomaly_count += 1;
    this._passport.last_anomaly_timestamp = timestamp;
    this._passport.updated_at = updated_at;
  }

  addGovernanceFlag(flag: GovernanceFlag, updated_at: number): void {
    if (!this._passport.governance_flags.includes(flag)) {
      this._passport.governance_flags.push(flag);
    }
    this._passport.updated_at = updated_at;
  }

  removeGovernanceFlag(flag: GovernanceFlag, updated_at: number): void {
    this._passport.governance_flags = this._passport.governance_flags.filter((f) => f !== flag);
    this._passport.updated_at = updated_at;
  }
}
