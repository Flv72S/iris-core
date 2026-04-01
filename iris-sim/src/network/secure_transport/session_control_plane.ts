import { securityLog } from '../../security/security_logger.js';

export type SessionState = 'STABLE' | 'REKEYING' | 'SWITCHING' | 'TERMINATED';
export type RekeyRole = 'LEADER' | 'FOLLOWER' | 'NONE';

export interface SessionControlPlane {
  state: SessionState;
  rekeyInProgress: boolean;
  rekeyEpoch: number;
  rekeyRole: RekeyRole;
  lastRekeyAt: number;
  rekeyCooldownMs: number;
}

export function electRekeyLeader(localNodeId: string, remoteNodeId: string): string {
  return localNodeId.localeCompare(remoteNodeId) <= 0 ? localNodeId : remoteNodeId;
}

export function resolveRekeyRole(localNodeId: string, remoteNodeId: string): RekeyRole {
  const leader = electRekeyLeader(localNodeId, remoteNodeId);
  return localNodeId === leader ? 'LEADER' : 'FOLLOWER';
}

export function createSessionControlPlane(args: {
  localNodeId: string;
  remoteNodeId: string;
  now: () => number;
  rekeyCooldownMs?: number;
}): SessionControlPlane {
  const role = resolveRekeyRole(args.localNodeId, args.remoteNodeId);
  const cooldown = args.rekeyCooldownMs ?? 2000;
  securityLog('REKEY_LEADER_ELECTED', {
    localNodeId: args.localNodeId,
    remoteNodeId: args.remoteNodeId,
    leader: electRekeyLeader(args.localNodeId, args.remoteNodeId),
    role,
  });
  return {
    state: 'STABLE',
    rekeyInProgress: false,
    rekeyEpoch: 0,
    rekeyRole: role,
    // allow an immediate first rekey after handshake without a spurious cooldown block
    lastRekeyAt: args.now() - cooldown,
    rekeyCooldownMs: cooldown,
  };
}

export function canTriggerRekey(scp: SessionControlPlane, now: number): { ok: true } | { ok: false; reason: string } {
  if (scp.state === 'TERMINATED') return { ok: false, reason: 'TERMINATED' };
  if (scp.rekeyRole !== 'LEADER') return { ok: false, reason: 'NOT_LEADER' };
  if (scp.rekeyInProgress || scp.state !== 'STABLE') return { ok: false, reason: 'REKEY_IN_PROGRESS' };
  if (now - scp.lastRekeyAt < scp.rekeyCooldownMs) return { ok: false, reason: 'COOLDOWN' };
  return { ok: true };
}

export function transitionSessionState(
  scp: SessionControlPlane,
  next: SessionState,
  meta?: Record<string, unknown>,
): void {
  const prev = scp.state;
  const allowed =
    (prev === 'STABLE' && (next === 'REKEYING' || next === 'TERMINATED')) ||
    (prev === 'REKEYING' && (next === 'SWITCHING' || next === 'TERMINATED' || next === 'STABLE')) ||
    (prev === 'SWITCHING' && (next === 'STABLE' || next === 'TERMINATED')) ||
    (prev === 'TERMINATED' && next === 'TERMINATED');

  if (!allowed) {
    securityLog('INVALID_STATE_TRANSITION', { prev, next, ...(meta ? { meta } : {}) });
    const err = new Error('INVALID_STATE_TRANSITION');
    (err as NodeJS.ErrnoException).code = 'INVALID_STATE_TRANSITION';
    throw err;
  }

  scp.state = next;
  scp.rekeyInProgress = next === 'REKEYING' || next === 'SWITCHING';
  securityLog('SESSION_STATE_TRANSITION', { prev, next, ...(meta ? { meta } : {}) });
}

export function resolveRekeyCollision(args: {
  localNodeId: string;
  remoteNodeId: string;
  localRekeyInProgress: boolean;
  incomingRekey: boolean;
}): 'ABORT_LOCAL_REKEY' | 'IGNORE_INCOMING' | 'ACCEPT_INCOMING' | 'NO_COLLISION' {
  if (!args.incomingRekey || !args.localRekeyInProgress) return 'NO_COLLISION';
  const abortLocal = args.remoteNodeId.localeCompare(args.localNodeId) < 0;
  securityLog('REKEY_COLLISION_RESOLVED', {
    localNodeId: args.localNodeId,
    remoteNodeId: args.remoteNodeId,
    decision: abortLocal ? 'ABORT_LOCAL_REKEY' : 'IGNORE_INCOMING',
  });
  return abortLocal ? 'ABORT_LOCAL_REKEY' : 'IGNORE_INCOMING';
}

/**
 * Optional: simple session ticket helpers for resumption tests.
 * These utilities are not wired into the network handshake by default (feature-flag only).
 */
export type SessionTicketPayload = {
  nodeId: string;
  lastEpoch: number;
  expiry: number;
  nonce: string;
};

export function encodeSessionTicket(payload: SessionTicketPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

export function decodeSessionTicket(ticketB64: string): SessionTicketPayload {
  const raw = Buffer.from(ticketB64, 'base64').toString('utf8');
  return JSON.parse(raw) as SessionTicketPayload;
}

