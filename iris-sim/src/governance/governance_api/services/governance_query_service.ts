/**
 * Step 8A — Governance Query Service. Adapter over existing governance modules (read-only).
 */

import { createHash } from 'node:crypto';
import type { IGovernanceStateProvider } from './governance_state_provider.js';
import { mapTierToSLA } from '../../tiering/slaMapping.js';
import type { GovernanceTier } from '../../tiering/hysteresis.js';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type {
  TierStatusResponse,
  GovernanceCertificateResponse,
  SLAGovernanceResponse,
  GovernanceSnapshotResponse,
  GovernanceHistoryResponse,
} from '../dto/governance_responses.js';

/** Single source of truth for snapshot_id from a tier snapshot (tier + snapshot use same id). */
function snapshotIdFromTierSnapshot(snap: GovernanceTierSnapshot): string {
  return sha256Hex(
    JSON.stringify({ tier: snap.tier, score: snap.score, computedAt: snap.computedAt })
  );
}

const TIER_SCORE_RANGES: Record<GovernanceTier, string> = {
  TIER_0_LOCKED: '0-40',
  TIER_1_RESTRICTED: '40-60',
  TIER_2_CONTROLLED: '60-75',
  TIER_3_STABLE: '75-90',
  TIER_4_ENTERPRISE_READY: '90-100',
};

const TIER_TO_PROFILE_NAME: Record<GovernanceTier, string> = {
  TIER_0_LOCKED: 'SLA-LOCKED',
  TIER_1_RESTRICTED: 'SLA-BASIC',
  TIER_2_CONTROLLED: 'SLA-STANDARD',
  TIER_3_STABLE: 'SLA-STANDARD',
  TIER_4_ENTERPRISE_READY: 'SLA-PRO',
};

function tierToShort(tier: GovernanceTier): string {
  const map: Record<GovernanceTier, string> = {
    TIER_0_LOCKED: 'T0',
    TIER_1_RESTRICTED: 'T1',
    TIER_2_CONTROLLED: 'T2',
    TIER_3_STABLE: 'T3',
    TIER_4_ENTERPRISE_READY: 'T4',
  };
  return map[tier];
}

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function addResponseHash<T extends Record<string, unknown>>(payload: T): T & { response_hash: string } {
  const json = JSON.stringify(payload);
  const response_hash = sha256Hex(json);
  return { ...payload, response_hash };
}

export class GovernanceQueryService {
  constructor(private readonly _provider: IGovernanceStateProvider) {}

  getTierStatus(): TierStatusResponse | null {
    const snap = this._provider.getCurrentTierSnapshot();
    if (!snap) return null;
    const tierShort = tierToShort(snap.tier);
    const tierRange = TIER_SCORE_RANGES[snap.tier];
    const scorePct = Math.round(snap.score * 1000) / 10;
    const governance_hash = snap.computedAt.toString(16) + '-' + sha256Hex(JSON.stringify({ tier: snap.tier, score: snap.score }));
    const snapshot_id = snapshotIdFromTierSnapshot(snap);
    const timestamp = new Date(snap.computedAt).toISOString();
    const payload = {
      tier: tierShort,
      score: scorePct,
      tier_range: tierRange,
      governance_hash,
      snapshot_id,
      timestamp,
    };
    return addResponseHash(payload);
  }

  getCertificate(): GovernanceCertificateResponse | null {
    const cert = this._provider.getCurrentCert();
    const snap = this._provider.getCurrentTierSnapshot();
    if (!cert || !snap) return null;
    const profileName = TIER_TO_PROFILE_NAME[cert.tier];
    const snapshot_id = sha256Hex(JSON.stringify({ tier: cert.tier, computedAt: cert.computedAt }));
    const timestamp = new Date().toISOString();
    const payload = {
      certificate_id: cert.payloadHash,
      governance_state: cert.modelVersion,
      tier: tierToShort(cert.tier),
      sla_profile: profileName,
      hash: cert.payloadHash,
      issued_at: new Date(cert.computedAt).toISOString(),
      valid: true,
      snapshot_id,
      timestamp,
    };
    return addResponseHash(payload);
  }

  getSLA(): SLAGovernanceResponse | null {
    const snap = this._provider.getCurrentTierSnapshot();
    if (!snap) return null;
    const sla = mapTierToSLA(snap.tier);
    const profileName = TIER_TO_PROFILE_NAME[snap.tier];
    const availability_target = sla.maxUptimeCommitment / 100;
    const latency_target_ms = 120;
    const snapshot_id = sha256Hex(JSON.stringify({ tier: snap.tier, computedAt: snap.computedAt }));
    const timestamp = new Date(snap.computedAt).toISOString();
    const payload = {
      profile: profileName,
      availability_target,
      latency_target_ms,
      breach_count_30d: 0,
      snapshot_id,
      timestamp,
    };
    return addResponseHash(payload);
  }

  getSnapshot(): GovernanceSnapshotResponse | null {
    const snap = this._provider.getCurrentTierSnapshot();
    if (!snap) return null;
    const profileName = TIER_TO_PROFILE_NAME[snap.tier];
    const snapshot_id = snapshotIdFromTierSnapshot(snap);
    const governance_hash = snapshot_id;
    const created_at = new Date(snap.computedAt).toISOString();
    const timestamp = new Date().toISOString();
    const payload = {
      snapshot_id,
      tier: tierToShort(snap.tier),
      sla_profile: profileName,
      governance_hash,
      created_at,
      integrity_verified: true,
      timestamp,
    };
    return addResponseHash(payload);
  }

  getHistory(limit: number, fromTimestamp?: number): GovernanceHistoryResponse {
    const entries = this._provider.getHistory(limit, fromTimestamp);
    const list = entries.map((e) => ({
      snapshot_id: e.snapshot_id,
      tier: e.tier,
      sla_profile: e.sla_profile,
      governance_hash: e.governance_hash,
      timestamp: new Date(e.timestamp).toISOString(),
    }));
    const timestamp = new Date().toISOString();
    const payload = { entries: list, timestamp };
    return addResponseHash(payload);
  }
}
