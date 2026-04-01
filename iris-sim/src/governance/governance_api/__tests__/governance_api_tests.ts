/**
 * Step 8A — Governance Public API tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { request as httpRequest } from 'node:http';
import { generateKeyPairSync } from 'node:crypto';
import { DefaultGovernanceStateProvider } from '../services/governance_state_provider.js';
import { GovernanceQueryService } from '../services/governance_query_service.js';
import { GovernanceController } from '../controllers/governance_controller.js';
import { createGovernanceHttpServer } from '../server/governance_server.js';
import { clearAuditLog } from '../middleware/audit_logger.js';
import { generateTierSnapshot } from '../../tiering/snapshot.js';
import { generateGovernanceCertification } from '../../certification/certification.js';
import type { GovernanceSnapshotForTiering } from '../../tiering/hardCaps.js';
import type { TierState } from '../../tiering/hysteresis.js';

const TEST_API_KEY = 'test-key-12345';

function getTestKeyPair(): { privateKey: Uint8Array; publicKey: Uint8Array } {
  const { privateKey: privObj, publicKey: pubObj } = generateKeyPairSync('ed25519');
  const pkcs8 = Uint8Array.from(privObj.export({ type: 'pkcs8', format: 'der' }) as Buffer);
  const spki = Uint8Array.from(pubObj.export({ type: 'spki', format: 'der' }) as Buffer);
  return { privateKey: pkcs8, publicKey: spki };
}

function makeTierSnapshot(overrides: Partial<GovernanceSnapshotForTiering> = {}): ReturnType<typeof generateTierSnapshot> {
  const base: GovernanceSnapshotForTiering = Object.freeze({
    mode: 'NORMAL',
    budgetMultiplier: 0.95,
    commitRateMultiplier: 0.95,
    adaptationDampening: 0.1,
    confidence: 0.95,
    flipRate: 0.05,
    entropyIndex: 0.1,
    invariantViolationCount: 0,
    ...overrides,
  });
  const state: TierState = { currentTier: 'TIER_3_STABLE', lastUpgradeAt: null, lastDowngradeAt: null };
  return generateTierSnapshot(base, state);
}

function httpPost(port: number, path: string, apiKey: string): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        host: 'localhost',
        port,
        path,
        method: 'POST',
        headers: { 'x-iris-api-key': apiKey, 'Content-Type': 'application/json' },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          resolve({ status: res.statusCode ?? 0, body });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

describe('Governance API', () => {
  clearAuditLog();

  it('Tier endpoint returns valid data', () => {
    const provider = new DefaultGovernanceStateProvider();
    const tierSnap = makeTierSnapshot();
    provider.setCurrentTierSnapshot(tierSnap);
    const service = new GovernanceQueryService(provider);
    const controller = new GovernanceController(service);

    const result = controller.getTier();
    assert.strictEqual(result.status, 200);
    const body = result.body as {
      tier: string;
      score: number;
      tier_range: string;
      governance_hash: string;
      snapshot_id: string;
      timestamp: string;
      response_hash: string;
    };
    assert.ok(body.tier);
    assert.ok(typeof body.score === 'number');
    assert.ok(body.tier_range);
    assert.ok(body.governance_hash);
    assert.ok(body.snapshot_id);
    assert.ok(body.timestamp);
    assert.ok(body.response_hash);
  });

  it('Certificate endpoint produces stable hash', () => {
    const provider = new DefaultGovernanceStateProvider();
    const tierSnap = makeTierSnapshot();
    const keys = getTestKeyPair();
    const cert = generateGovernanceCertification(tierSnap, keys.privateKey, keys.publicKey);
    provider.setCurrentTierSnapshot(tierSnap);
    provider.setCurrentCert(cert);
    const service = new GovernanceQueryService(provider);
    const controller = new GovernanceController(service);

    const a = controller.getCertificate();
    const b = controller.getCertificate();
    assert.strictEqual(a.status, 200);
    assert.strictEqual(b.status, 200);
    const hashA = (a.body as { response_hash: string }).response_hash;
    const hashB = (b.body as { response_hash: string }).response_hash;
    assert.strictEqual(hashA, hashB);
  });

  it('Snapshot integrity verified', () => {
    const provider = new DefaultGovernanceStateProvider();
    const tierSnap = makeTierSnapshot();
    provider.setCurrentTierSnapshot(tierSnap);
    const service = new GovernanceQueryService(provider);
    const controller = new GovernanceController(service);

    const result = controller.getSnapshot();
    assert.strictEqual(result.status, 200);
    const body = result.body as { integrity_verified: boolean; snapshot_id: string; governance_hash: string };
    assert.strictEqual(body.integrity_verified, true);
    assert.ok(body.snapshot_id);
    assert.ok(body.governance_hash);
  });

  it('History query limit works', () => {
    const provider = new DefaultGovernanceStateProvider();
    provider.appendHistory({
      snapshot_id: 's1',
      tier: 'T3',
      sla_profile: 'SLA-STANDARD',
      governance_hash: 'h1',
      timestamp: 1000,
    });
    provider.appendHistory({
      snapshot_id: 's2',
      tier: 'T3',
      sla_profile: 'SLA-STANDARD',
      governance_hash: 'h2',
      timestamp: 2000,
    });
    const service = new GovernanceQueryService(provider);
    const controller = new GovernanceController(service);

    const result = controller.getHistory({ limit: 1 });
    assert.strictEqual(result.status, 200);
    const body = result.body as { entries: unknown[] };
    assert.strictEqual(body.entries.length, 1);
  });

  it('API read-only enforcement: POST fails', () => {
    const provider = new DefaultGovernanceStateProvider();
    provider.setCurrentTierSnapshot(makeTierSnapshot());
    const service = new GovernanceQueryService(provider);
    const controller = new GovernanceController(service);
    const server = createGovernanceHttpServer({ controller });
    return new Promise<void>((resolve, reject) => {
      server.listen(0, () => {
        const port = (server.address() as { port: number }).port;
        httpPost(port, '/governance/tier', TEST_API_KEY)
          .then((res) => {
            assert.strictEqual(res.status, 405);
            server.close(() => resolve());
          })
          .catch((err) => {
            server.close(() => reject(err));
          });
      });
    });
  });
});
