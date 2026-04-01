/**
 * Microstep 16E.FINAL — Single observability snapshot persistence + legacy derivatives.
 */

import fs from 'node:fs';
import path from 'node:path';

import { writeActiveAlertsSnapshot } from './alerting/alert_persist.js';
import type { IrisObservabilitySnapshot } from './observability_contract.js';
import { validateObservabilitySnapshot } from './observability_invariants.js';
import { writeTracerSpansSnapshot } from './tracing/traces_persist.js';

export const OBSERVABILITY_SNAPSHOT_FILENAME = 'observability.snapshot.json';

export function observabilitySnapshotPath(cwd: string): string {
  return path.join(cwd, '.iris', OBSERVABILITY_SNAPSHOT_FILENAME);
}

function sortRecord<T extends Record<string, unknown>>(obj: T): T {
  const keys = Object.keys(obj).sort() as (keyof T)[];
  const out = {} as T;
  for (const k of keys) {
    out[k] = obj[k];
  }
  return out;
}

function sortMetricsRecord(m: Record<string, number>): Record<string, number> {
  const keys = Object.keys(m).sort();
  const out: Record<string, number> = {};
  for (const k of keys) out[k] = m[k]!;
  return out;
}

function sortNumericRecord(m: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of Object.keys(m).sort()) out[k] = m[k]!;
  return out;
}

function sortStrings(items: readonly string[]): string[] {
  return [...items].sort();
}

/**
 * Strip undefined recursively; ensure JSON-serializable plain object.
 */
export function sanitizeSnapshotForJson(s: IrisObservabilitySnapshot): Record<string, unknown> {
  const node = {
    id: s.node.id,
    timestamp: s.node.timestamp,
    uptime_seconds: s.node.uptime_seconds,
  };
  const metrics = {
    metrics: sortMetricsRecord(s.metrics.metrics),
    nodeId: s.metrics.nodeId,
    timestamp: s.metrics.timestamp,
  };
  const base: Record<string, unknown> = {
    node,
    metrics,
  };
  if (s.traces !== undefined) {
    base.traces = { spans: s.traces.spans };
  }
  if (s.alerts !== undefined) {
    base.alerts = { active: s.alerts.active };
  }
  if (s.audit !== undefined) {
    base.audit = {
      totalRecords: s.audit.totalRecords,
      chainValid: s.audit.chainValid,
      lastRecordHash: s.audit.lastRecordHash,
      ...(s.audit.merkleRoot !== undefined ? { merkleRoot: s.audit.merkleRoot } : {}),
    };
  }
  if (s.sync !== undefined) {
    base.sync = { peers: s.sync.peers, divergences: s.sync.divergences };
  }
  if (s.federation !== undefined) {
    base.federation = {
      domainId: s.federation.domainId,
      peersByDomain: sortNumericRecord(s.federation.peersByDomain),
      rejectedByPolicy: s.federation.rejectedByPolicy,
      ...(s.federation.domainsRegistered !== undefined
        ? { domainsRegistered: sortStrings(s.federation.domainsRegistered) }
        : {}),
    };
  }
  if (s.federationSecurity !== undefined) {
    base.federationSecurity = {
      revokedDomainAttempts: s.federationSecurity.revokedDomainAttempts,
      negotiationFailures: s.federationSecurity.negotiationFailures,
      trustLevelEnforcements: s.federationSecurity.trustLevelEnforcements,
      ...(s.federationSecurity.rMp1oViPb3EdvcJ5kxoqe52RuaiK6YiUYo !== undefined
        ? { rMp1oViPb3EdvcJ5kxoqe52RuaiK6YiUYo: s.federationSecurity.rMp1oViPb3EdvcJ5kxoqe52RuaiK6YiUYo }
        : {}),
    };
  }
  if (s.identity !== undefined) {
    base.identity = {
      nodeId: s.identity.nodeId,
      publicKey: s.identity.publicKey,
      keyTypes: [...s.identity.keyTypes],
      publicKeyFingerprint: s.identity.publicKeyFingerprint,
      ...(s.identity.canonicalIdentity !== undefined
        ? { canonicalIdentity: s.identity.canonicalIdentity }
        : {}),
    };
  }
  if (s.runtime !== undefined) {
    base.runtime = {
      state: s.runtime.state,
      ...(s.runtime.bootStartedAt !== undefined ? { bootStartedAt: s.runtime.bootStartedAt } : {}),
      updatedAt: s.runtime.updatedAt,
      errors: s.runtime.errors,
      activeComponents: s.runtime.activeComponents,
      ...(s.runtime.activeComponentsList !== undefined
        ? { activeComponentsList: sortStrings(s.runtime.activeComponentsList) }
        : {}),
      ...(s.runtime.lastInitPhase !== undefined ? { lastInitPhase: s.runtime.lastInitPhase } : {}),
      ...(s.runtime.lastInitPhaseStatus !== undefined
        ? { lastInitPhaseStatus: s.runtime.lastInitPhaseStatus }
        : {}),
      ...(s.runtime.lastInitErrorPhase !== undefined
        ? { lastInitErrorPhase: s.runtime.lastInitErrorPhase }
        : {}),
    };
  }
  return sortRecord(base as Record<string, unknown>);
}

export function isDeterministicSnapshot(snapshot: IrisObservabilitySnapshot): boolean {
  const once = JSON.stringify(sanitizeSnapshotForJson(snapshot));
  const twice = JSON.stringify(sanitizeSnapshotForJson(snapshot));
  return once === twice;
}

export function writeObservabilitySnapshot(s: IrisObservabilitySnapshot, cwd: string): void {
  const v = validateObservabilitySnapshot(s);
  if (!v.ok) {
    throw new Error(`Invalid observability snapshot: ${v.errors.join('; ')}`);
  }
  if (!isDeterministicSnapshot(s)) {
    throw new Error('Invalid observability snapshot: non-deterministic sanitized output');
  }
  const p = observabilitySnapshotPath(cwd);
  const tmp = `${p}.tmp`;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const payload = sanitizeSnapshotForJson(s);
  fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, p);
}

export function readObservabilitySnapshot(cwd: string): IrisObservabilitySnapshot | null {
  const p = observabilitySnapshotPath(cwd);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as IrisObservabilitySnapshot;
    const v = validateObservabilitySnapshot(raw);
    return v.ok ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Backward compatibility (one release): derive legacy files from unified snapshot.
 */
export function writeLegacyDerivedFiles(cwd: string, s: IrisObservabilitySnapshot): void {
  const metricsPath = path.join(cwd, '.iris', 'metrics.json');
  const tmpM = `${metricsPath}.tmp`;
  try {
    fs.mkdirSync(path.dirname(metricsPath), { recursive: true });
    const legacyMetrics = {
      metrics: sortMetricsRecord(s.metrics.metrics),
      nodeId: s.metrics.nodeId,
      timestamp: s.metrics.timestamp,
    };
    fs.writeFileSync(tmpM, JSON.stringify(legacyMetrics, null, 2), 'utf8');
    fs.renameSync(tmpM, metricsPath);
  } catch {
    // ignore
  }

  if (s.traces !== undefined) {
    writeTracerSpansSnapshot(cwd, s.node.id, s.traces.spans);
  }

  if (s.alerts !== undefined) {
    writeActiveAlertsSnapshot(cwd, s.alerts.active);
  }
}
