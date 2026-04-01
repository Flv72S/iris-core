/**
 * Step 8A — Run Governance Public API server (read-only).
 * Requires X-IRIS-API-KEY header. Rate limit: IRIS_PUBLIC_API_RATE_LIMIT (default 100/min).
 */
import { createGovernanceHttpServer } from './server/governance_server.js';
import { DefaultGovernanceStateProvider } from './services/governance_state_provider.js';
import { GovernanceQueryService } from './services/governance_query_service.js';
import { GovernanceController } from './controllers/governance_controller.js';
import { generateTierSnapshot } from '../tiering/snapshot.js';
import { generateGovernanceCertification } from '../certification/certification.js';
import { generateKeyPairSync } from 'node:crypto';
import type { GovernanceSnapshotForTiering } from '../tiering/hardCaps.js';
import type { TierState } from '../tiering/hysteresis.js';

const PORT = Number(process.env.PORT) || 3000;

function getKeyPair(): { privateKey: Uint8Array; publicKey: Uint8Array } {
  const { privateKey: p, publicKey: pub } = generateKeyPairSync('ed25519');
  return {
    privateKey: Uint8Array.from((p.export({ type: 'pkcs8', format: 'der' }) as Buffer)),
    publicKey: Uint8Array.from((pub.export({ type: 'spki', format: 'der' }) as Buffer)),
  };
}

const baseSnapshot: GovernanceSnapshotForTiering = Object.freeze({
  mode: 'NORMAL',
  budgetMultiplier: 0.95,
  commitRateMultiplier: 0.95,
  adaptationDampening: 0.1,
  confidence: 0.95,
  flipRate: 0.05,
  entropyIndex: 0.1,
  invariantViolationCount: 0,
});
const state: TierState = { currentTier: 'TIER_3_STABLE', lastUpgradeAt: null, lastDowngradeAt: null };
const tierSnap = generateTierSnapshot(baseSnapshot, state);
const keys = getKeyPair();
const cert = generateGovernanceCertification(tierSnap, keys.privateKey, keys.publicKey);

const provider = new DefaultGovernanceStateProvider();
provider.setCurrentTierSnapshot(tierSnap);
provider.setCurrentCert(cert);
provider.appendHistory({
  snapshot_id: tierSnap.computedAt.toString(16),
  tier: 'T3',
  sla_profile: 'SLA-STANDARD',
  governance_hash: cert.payloadHash,
  timestamp: tierSnap.computedAt,
});

const service = new GovernanceQueryService(provider);
const controller = new GovernanceController(service);
const server = createGovernanceHttpServer({ controller });

server.listen(PORT, () => {
  console.log(`Governance Public API (read-only) listening on http://localhost:${PORT}`);
  console.log('Endpoints: GET /governance/tier, /governance/certificate, /governance/sla, /governance/snapshot, /governance/history');
  console.log('Header required: X-IRIS-API-KEY');
});
