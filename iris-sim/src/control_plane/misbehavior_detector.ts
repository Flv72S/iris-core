import type { ControlPlaneRegistry } from './control_plane_registry.js';
import type { TrustEvent } from './trust_events.js';
import { securityLog } from '../security/security_logger.js';

export type MisbehaviorResult = {
  isValid: boolean;
  violations: string[];
};

type EventPoint = { ts: number; type: TrustEvent['type'] };

export class MisbehaviorDetector {
  private readonly eventHistory = new Map<string, EventPoint[]>();
  private readonly seenByIssuer = new Set<string>();
  private readonly onViolation: ((nodeId: string, violation: string, eventId: string) => void) | undefined;

  constructor(opts?: { onViolation?: (nodeId: string, violation: string, eventId: string) => void }) {
    this.onViolation = opts?.onViolation;
  }

  analyze(event: TrustEvent, registry: ControlPlaneRegistry): MisbehaviorResult {
    const violations: string[] = [];
    const auth = registry.getNodeAuth(event.nodeId);
    const key = `${event.issuerNodeId}:${event.eventId}`;
    if (this.seenByIssuer.has(key)) violations.push('replay_suspect');
    else this.seenByIssuer.add(key);

    if (event.type === 'ROTATION_COMPLETED' && auth?.trustState !== 'ROTATING') {
      violations.push('rotation_completed_without_start');
    }
    if (event.type === 'ROTATION_STARTED' && auth && auth.trustState !== 'ACTIVE' && auth.trustState !== 'ROTATING') {
      violations.push('rotation_start_invalid_state');
    }

    const history = this.eventHistory.get(event.issuerNodeId) ?? [];
    const recentWindow = history.filter((x) => event.timestamp - x.ts <= 1000);
    if (recentWindow.length >= 8) violations.push('event_spam');

    const contradiction = recentWindow.find(
      (x) =>
        (x.type === 'NODE_REVOKED' && event.type === 'NODE_ACTIVATED') ||
        (x.type === 'NODE_ACTIVATED' && event.type === 'NODE_REVOKED'),
    );
    if (contradiction && Math.abs(event.timestamp - contradiction.ts) <= 200) {
      violations.push('rapid_contradictory_events');
    }

    history.push({ ts: event.timestamp, type: event.type });
    if (history.length > 64) history.splice(0, history.length - 64);
    this.eventHistory.set(event.issuerNodeId, history);
    if (violations.length > 0) {
      securityLog('BYZANTINE_VIOLATION', { nodeId: event.issuerNodeId, violations, eventId: event.eventId });
      for (const v of violations) this.onViolation?.(event.issuerNodeId, v, event.eventId);
    }
    return { isValid: violations.length === 0, violations };
  }
}
