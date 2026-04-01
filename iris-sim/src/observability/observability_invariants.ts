/**
 * Microstep 16E.FINAL — Runtime validation for observability snapshots.
 */

import type { IrisObservabilitySnapshot } from './observability_contract.js';

export type SnapshotValidationResult = { ok: true } | { ok: false; errors: string[] };

const RUNTIME_STATE_GAUGE: Record<'INITIALIZING' | 'RUNNING' | 'STOPPING' | 'STOPPED' | 'ERROR', number> = {
  INITIALIZING: 0.5,
  RUNNING: 1,
  STOPPING: 0,
  STOPPED: 0,
  ERROR: 0,
};

export function assertStateConsistency(snapshot: IrisObservabilitySnapshot): boolean {
  if (!snapshot.runtime) return true;
  const gauge = snapshot.metrics?.metrics?.['runtime.state'];
  if (gauge === undefined) return true;
  if (!Number.isFinite(gauge)) return false;
  const expected = RUNTIME_STATE_GAUGE[snapshot.runtime.state];
  return Math.abs(gauge - expected) < 1e-9;
}

export function validateObservabilitySnapshot(s: IrisObservabilitySnapshot): SnapshotValidationResult {
  const errors: string[] = [];

  if (!s.node?.id || typeof s.node.id !== 'string' || s.node.id.length === 0) {
    errors.push('node.id required');
  }
  if (!Number.isFinite(s.node?.timestamp)) {
    errors.push('node.timestamp must be finite');
  }
  if (!Number.isFinite(s.node?.uptime_seconds) || s.node.uptime_seconds < 0) {
    errors.push('node.uptime_seconds invalid');
  }

  if (!s.metrics?.nodeId || typeof s.metrics.nodeId !== 'string') {
    errors.push('metrics.nodeId required');
  }
  if (!s.metrics?.timestamp || typeof s.metrics.timestamp !== 'string') {
    errors.push('metrics.timestamp required');
  }
  if (!s.metrics.metrics || typeof s.metrics.metrics !== 'object') {
    errors.push('metrics.metrics required');
  } else {
    for (const [k, v] of Object.entries(s.metrics.metrics)) {
      if (!Number.isFinite(v) || Number.isNaN(v)) {
        errors.push(`metrics.metrics[${k}] must be finite`);
      }
    }
  }

  if (s.traces?.spans) {
    for (let i = 0; i < s.traces.spans.length; i++) {
      const sp = s.traces.spans[i]!;
      if (!sp.id || typeof sp.id !== 'string') {
        errors.push(`traces.spans[${i}].id invalid`);
      }
      if (!sp.traceId || typeof sp.traceId !== 'string' || sp.traceId.length === 0) {
        errors.push(`traces.spans[${i}].traceId invalid`);
      }
    }
  }

  if (s.audit) {
    if (!Number.isFinite(s.audit.totalRecords) || s.audit.totalRecords < 0) {
      errors.push('audit.totalRecords invalid');
    }
    if (typeof s.audit.chainValid !== 'boolean') {
      errors.push('audit.chainValid must be boolean');
    }
    if (typeof s.audit.lastRecordHash !== 'string') {
      errors.push('audit.lastRecordHash must be string');
    }
    if (s.audit.merkleRoot !== undefined && typeof s.audit.merkleRoot !== 'string') {
      errors.push('audit.merkleRoot must be string when present');
    }
  }

  if (s.sync) {
    if (!Number.isFinite(s.sync.peers) || s.sync.peers < 0) {
      errors.push('sync.peers invalid');
    }
    if (!Number.isFinite(s.sync.divergences) || s.sync.divergences < 0) {
      errors.push('sync.divergences invalid');
    }
  }

  if (s.federation) {
    if (!s.federation.domainId || typeof s.federation.domainId !== 'string') {
      errors.push('federation.domainId invalid');
    }
    if (!s.federation.peersByDomain || typeof s.federation.peersByDomain !== 'object') {
      errors.push('federation.peersByDomain invalid');
    }
    if (!Number.isFinite(s.federation.rejectedByPolicy) || s.federation.rejectedByPolicy < 0) {
      errors.push('federation.rejectedByPolicy invalid');
    }
  }

  if (s.federationSecurity) {
    if (!Number.isFinite(s.federationSecurity.revokedDomainAttempts) || s.federationSecurity.revokedDomainAttempts < 0) {
      errors.push('federationSecurity.revokedDomainAttempts invalid');
    }
    if (
      !Number.isFinite(s.federationSecurity.negotiationFailures) ||
      s.federationSecurity.negotiationFailures < 0
    ) {
      errors.push('federationSecurity.negotiationFailures invalid');
    }
    if (!s.federationSecurity.trustLevelEnforcements || typeof s.federationSecurity.trustLevelEnforcements !== 'object') {
      errors.push('federationSecurity.trustLevelEnforcements invalid');
    } else {
      for (const [k, v] of Object.entries(s.federationSecurity.trustLevelEnforcements)) {
        if (!Number.isFinite(v) || v < 0) {
          errors.push(`federationSecurity.trustLevelEnforcements[${k}] invalid`);
        }
      }
    }
    if (
      s.federationSecurity.rMp1oViPb3EdvcJ5kxoqe52RuaiK6YiUYo !== undefined &&
      (typeof s.federationSecurity.rMp1oViPb3EdvcJ5kxoqe52RuaiK6YiUYo !== 'number' ||
        Number.isNaN(s.federationSecurity.rMp1oViPb3EdvcJ5kxoqe52RuaiK6YiUYo))
    ) {
      errors.push('federationSecurity.rMp1oViPb3EdvcJ5kxoqe52RuaiK6YiUYo invalid');
    }
  }

  if (s.trust) {
    if (!Number.isFinite(s.trust.domains) || s.trust.domains < 0) {
      errors.push('trust.domains invalid');
    }
    if (!Number.isFinite(s.trust.revoked) || s.trust.revoked < 0) {
      errors.push('trust.revoked invalid');
    }
    if (!Number.isFinite(s.trust.lastUpdate) || s.trust.lastUpdate < 0) {
      errors.push('trust.lastUpdate invalid');
    }
    if (typeof s.trust.driftDetected !== 'boolean') {
      errors.push('trust.driftDetected invalid');
    }
  }

  if (s.transport) {
    if (!Number.isFinite(s.transport.activeConnections) || s.transport.activeConnections < 0) errors.push('transport.activeConnections invalid');
    if (!Number.isFinite(s.transport.activeSessions) || s.transport.activeSessions < 0) errors.push('transport.activeSessions invalid');
    if (!Number.isFinite(s.transport.rekeys) || s.transport.rekeys < 0) errors.push('transport.rekeys invalid');
    if (!Number.isFinite(s.transport.rejectedConnections) || s.transport.rejectedConnections < 0) errors.push('transport.rejectedConnections invalid');
    if (!Number.isFinite(s.transport.rateLimited) || s.transport.rateLimited < 0) errors.push('transport.rateLimited invalid');
    if (!Number.isFinite(s.transport.failedHandshakes) || s.transport.failedHandshakes < 0) errors.push('transport.failedHandshakes invalid');
    if (!Number.isFinite(s.transport.replayAttacksDetected) || s.transport.replayAttacksDetected < 0) errors.push('transport.replayAttacksDetected invalid');
    if (!Number.isFinite(s.transport.pfsSessions) || s.transport.pfsSessions < 0) errors.push('transport.pfsSessions invalid');
    if (!Number.isFinite(s.transport.pfsFallbacks) || s.transport.pfsFallbacks < 0) errors.push('transport.pfsFallbacks invalid');
    if (!Number.isFinite(s.transport.pfsStrictSessions) || s.transport.pfsStrictSessions < 0) {
      errors.push('transport.pfsStrictSessions invalid');
    }
    if (!Number.isFinite(s.transport.pfsRejected) || s.transport.pfsRejected < 0) errors.push('transport.pfsRejected invalid');
    if (!Number.isFinite(s.transport.pfsDowngradeAttempts) || s.transport.pfsDowngradeAttempts < 0) {
      errors.push('transport.pfsDowngradeAttempts invalid');
    }
    if (!Number.isFinite(s.transport.sessionExpired) || s.transport.sessionExpired < 0) errors.push('transport.sessionExpired invalid');
    if (!Number.isFinite(s.transport.rekeyTriggeredTime) || s.transport.rekeyTriggeredTime < 0) {
      errors.push('transport.rekeyTriggeredTime invalid');
    }
    if (!Number.isFinite(s.transport.rekeyTriggeredData) || s.transport.rekeyTriggeredData < 0) {
      errors.push('transport.rekeyTriggeredData invalid');
    }
    if (!Number.isFinite(s.transport.rekeyCollisions) || s.transport.rekeyCollisions < 0) errors.push('transport.rekeyCollisions invalid');
    if (!Number.isFinite(s.transport.rekeyCooldownBlocked) || s.transport.rekeyCooldownBlocked < 0) {
      errors.push('transport.rekeyCooldownBlocked invalid');
    }
    if (!Number.isFinite(s.transport.dualKeyActive) || s.transport.dualKeyActive < 0) errors.push('transport.dualKeyActive invalid');
    if (!Number.isFinite(s.transport.replayDetected) || s.transport.replayDetected < 0) errors.push('transport.replayDetected invalid');
    if (!Number.isFinite(s.transport.sessionTerminated) || s.transport.sessionTerminated < 0) {
      errors.push('transport.sessionTerminated invalid');
    }
  }

  if (s.gossip) {
    if (!Number.isFinite(s.gossip.messagesReceived) || s.gossip.messagesReceived < 0) errors.push('gossip.messagesReceived invalid');
    if (!Number.isFinite(s.gossip.messagesForwarded) || s.gossip.messagesForwarded < 0) errors.push('gossip.messagesForwarded invalid');
    if (!Number.isFinite(s.gossip.duplicatesDropped) || s.gossip.duplicatesDropped < 0) errors.push('gossip.duplicatesDropped invalid');
    if (!Number.isFinite(s.gossip.rateLimited) || s.gossip.rateLimited < 0) errors.push('gossip.rateLimited invalid');
    if (!Number.isFinite(s.gossip.blockedAmplifications) || s.gossip.blockedAmplifications < 0) errors.push('gossip.blockedAmplifications invalid');
    if (!Number.isFinite(s.gossip.inflightLimitExceeded) || s.gossip.inflightLimitExceeded < 0) errors.push('gossip.inflightLimitExceeded invalid');
    if (!Number.isFinite(s.gossip.policyViolations) || s.gossip.policyViolations < 0) errors.push('gossip.policyViolations invalid');
    if (!Number.isFinite(s.gossip.lineageInvalid) || s.gossip.lineageInvalid < 0) errors.push('gossip.lineageInvalid invalid');
    if (!Number.isFinite(s.gossip.replayDetected) || s.gossip.replayDetected < 0) errors.push('gossip.replayDetected invalid');
    if (!Number.isFinite(s.gossip.convergenceStalled) || s.gossip.convergenceStalled < 0) errors.push('gossip.convergenceStalled invalid');
  }
  if (s.gossipState) {
    if (!Number.isFinite(s.gossipState.peersCount) || s.gossipState.peersCount < 0) errors.push('gossipState.peersCount invalid');
    if (!Number.isFinite(s.gossipState.activePeers) || s.gossipState.activePeers < 0) errors.push('gossipState.activePeers invalid');
  }
  if (s.gossipControl) {
    if (!Number.isFinite(s.gossipControl.inflight) || s.gossipControl.inflight < 0) errors.push('gossipControl.inflight invalid');
    if (!Number.isFinite(s.gossipControl.blockedAmplifications) || s.gossipControl.blockedAmplifications < 0) {
      errors.push('gossipControl.blockedAmplifications invalid');
    }
    if (!Number.isFinite(s.gossipControl.fanoutAverage) || s.gossipControl.fanoutAverage < 0) errors.push('gossipControl.fanoutAverage invalid');
  }
  if (s.gossipConsistency) {
    if (!Number.isFinite(s.gossipConsistency.convergenceRate) || s.gossipConsistency.convergenceRate < 0 || s.gossipConsistency.convergenceRate > 1) {
      errors.push('gossipConsistency.convergenceRate invalid');
    }
    if (!Number.isFinite(s.gossipConsistency.partialMessages) || s.gossipConsistency.partialMessages < 0) {
      errors.push('gossipConsistency.partialMessages invalid');
    }
  }
  if (s.crdt) {
    if (!Number.isFinite(s.crdt.operationsApplied) || s.crdt.operationsApplied < 0) errors.push('crdt.operationsApplied invalid');
    if (!Number.isFinite(s.crdt.operationsRejected) || s.crdt.operationsRejected < 0) errors.push('crdt.operationsRejected invalid');
    if (!Number.isFinite(s.crdt.conflictsResolved) || s.crdt.conflictsResolved < 0) errors.push('crdt.conflictsResolved invalid');
    if (!Number.isFinite(s.crdt.stateSize) || s.crdt.stateSize < 0) errors.push('crdt.stateSize invalid');
    if (!Number.isFinite(s.crdt.convergenceRate) || s.crdt.convergenceRate < 0 || s.crdt.convergenceRate > 1) {
      errors.push('crdt.convergenceRate invalid');
    }
    if (s.crdt.conflictsResolved > s.crdt.operationsApplied + s.crdt.operationsRejected) {
      errors.push('crdt.conflictsResolved coherence invalid');
    }
  }
  if (s.runtime) {
    if (!['INITIALIZING', 'RUNNING', 'STOPPING', 'STOPPED', 'ERROR'].includes(s.runtime.state)) {
      errors.push('runtime.state invalid');
    }
    if (s.runtime.bootStartedAt !== undefined && (!Number.isFinite(s.runtime.bootStartedAt) || s.runtime.bootStartedAt < 0)) {
      errors.push('runtime.bootStartedAt invalid');
    }
    if (typeof s.runtime.updatedAt !== 'string' || s.runtime.updatedAt.length === 0) errors.push('runtime.updatedAt invalid');
    if (!Number.isFinite(s.runtime.errors) || s.runtime.errors < 0) errors.push('runtime.errors invalid');
    if (!Number.isFinite(s.runtime.activeComponents) || s.runtime.activeComponents < 0) {
      errors.push('runtime.activeComponents invalid');
    }
    if (s.runtime.activeComponentsList !== undefined) {
      if (!Array.isArray(s.runtime.activeComponentsList)) {
        errors.push('runtime.activeComponentsList must be array');
      } else {
        if (s.runtime.activeComponentsList.length !== s.runtime.activeComponents) {
          errors.push('runtime.activeComponentsList length mismatch');
        }
        const seen = new Set<string>();
        for (let i = 0; i < s.runtime.activeComponentsList.length; i++) {
          const c = s.runtime.activeComponentsList[i];
          if (typeof c !== 'string' || c.length === 0) {
            errors.push(`runtime.activeComponentsList[${i}] invalid`);
            continue;
          }
          if (seen.has(c)) {
            errors.push(`runtime.activeComponentsList[${i}] duplicate`);
          } else {
            seen.add(c);
          }
        }
        const sorted = [...s.runtime.activeComponentsList].sort();
        if (sorted.length !== s.runtime.activeComponentsList.length || sorted.some((v, i) => v !== s.runtime!.activeComponentsList![i])) {
          errors.push('runtime.activeComponentsList must be sorted');
        }
      }
    }
    if (s.runtime.lastInitPhase !== undefined && (typeof s.runtime.lastInitPhase !== 'string' || s.runtime.lastInitPhase.length === 0)) {
      errors.push('runtime.lastInitPhase invalid');
    }
    if (
      s.runtime.lastInitPhaseStatus !== undefined &&
      s.runtime.lastInitPhaseStatus !== 'OK' &&
      s.runtime.lastInitPhaseStatus !== 'FAILED'
    ) {
      errors.push('runtime.lastInitPhaseStatus invalid');
    }
    if (
      s.runtime.lastInitErrorPhase !== undefined &&
      (typeof s.runtime.lastInitErrorPhase !== 'string' || s.runtime.lastInitErrorPhase.length === 0)
    ) {
      errors.push('runtime.lastInitErrorPhase invalid');
    }
    if (!assertStateConsistency(s)) {
      errors.push('runtime.state gauge mismatch');
    }
  }

  if (s.federation?.domainsRegistered !== undefined) {
    if (!Array.isArray(s.federation.domainsRegistered)) {
      errors.push('federation.domainsRegistered must be array');
    } else {
      const seen = new Set<string>();
      for (let i = 0; i < s.federation.domainsRegistered.length; i++) {
        const d = s.federation.domainsRegistered[i];
        if (typeof d !== 'string' || d.length === 0) {
          errors.push(`federation.domainsRegistered[${i}] invalid`);
          continue;
        }
        if (seen.has(d)) {
          errors.push(`federation.domainsRegistered[${i}] duplicate`);
        } else {
          seen.add(d);
        }
      }
      const sorted = [...s.federation.domainsRegistered].sort();
      if (sorted.length !== s.federation.domainsRegistered.length || sorted.some((v, i) => v !== s.federation!.domainsRegistered![i])) {
        errors.push('federation.domainsRegistered must be sorted');
      }
    }
  }

  if (s.identity) {
    if (!s.identity.nodeId || typeof s.identity.nodeId !== 'string') {
      errors.push('identity.nodeId invalid');
    }
    if (!s.identity.publicKey || typeof s.identity.publicKey !== 'string') {
      errors.push('identity.publicKey invalid');
    }
    if (!Array.isArray(s.identity.keyTypes)) {
      errors.push('identity.keyTypes must be array');
    }
    if (!s.identity.publicKeyFingerprint || typeof s.identity.publicKeyFingerprint !== 'string') {
      errors.push('identity.publicKeyFingerprint invalid');
    }
  }

  if (s.alerts?.active) {
    for (let i = 0; i < s.alerts.active.length; i++) {
      const a = s.alerts.active[i]!;
      if (!a.ruleId || typeof a.ruleId !== 'string') {
        errors.push(`alerts.active[${i}].ruleId invalid`);
      }
      if (!Number.isFinite(a.value)) {
        errors.push(`alerts.active[${i}].value invalid`);
      }
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
