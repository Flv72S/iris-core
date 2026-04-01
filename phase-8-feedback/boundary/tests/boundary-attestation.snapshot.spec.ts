/**
 * Phase 8.3 — Boundary attestation snapshot tests
 */

import { describe, it, expect } from 'vitest';
import { createBoundaryEscalationEvent } from '../escalation/boundary-escalation.bridge';
import { createBoundaryAttestationSnapshot } from '../escalation/boundary-attestation.snapshot';
import type { SafetyChecklistVerdict } from '../../safety/checklist/safety-checklist.types';
import type { Phase7BoundaryReport } from '../../safety/checklist/safety-checklist.types';

function verdict(status: SafetyChecklistVerdict['status'], violatedRules: string[] = []): SafetyChecklistVerdict {
  return Object.freeze({
    status,
    violatedRules: Object.freeze([...violatedRules]) as readonly string[],
    hasCriticalFailure: status === 'UNSAFE',
    explanation: 'Test.',
  });
}

const report: Phase7BoundaryReport = {
  signalLayerIsolation: true,
  preferenceImmutability: true,
  learningInactive: true,
  phase7FullyCertified: true,
};

describe('Boundary attestation snapshot', () => {
  it('same input produces same snapshotHash', () => {
    const event = createBoundaryEscalationEvent(verdict('SAFE'));
    const a = createBoundaryAttestationSnapshot(event, report);
    const b = createBoundaryAttestationSnapshot(event, report);
    expect(a.snapshotHash).toBe(b.snapshotHash);
  });

  it('change in escalation yields different hash', () => {
    const eventSafe = createBoundaryEscalationEvent(verdict('SAFE'));
    const eventUnsafe = createBoundaryEscalationEvent(verdict('UNSAFE', ['R1']));
    const snapSafe = createBoundaryAttestationSnapshot(eventSafe, report);
    const snapUnsafe = createBoundaryAttestationSnapshot(eventUnsafe, report);
    expect(snapSafe.snapshotHash).not.toBe(snapUnsafe.snapshotHash);
  });

  it('change in boundaryReport yields different hash', () => {
    const event = createBoundaryEscalationEvent(verdict('SAFE'));
    const report2: Phase7BoundaryReport = {
      ...report,
      phase7FullyCertified: false,
    };
    const a = createBoundaryAttestationSnapshot(event, report);
    const b = createBoundaryAttestationSnapshot(event, report2);
    expect(a.snapshotHash).not.toBe(b.snapshotHash);
  });

  it('snapshot is immutable', () => {
    const event = createBoundaryEscalationEvent(verdict('SAFE'));
    const snap = createBoundaryAttestationSnapshot(event, report);
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap.escalationEvent)).toBe(true);
  });

  it('no Phase 7 runtime dependency (types only)', () => {
    const event = createBoundaryEscalationEvent(verdict('WARNING', ['R1']));
    const snap = createBoundaryAttestationSnapshot(event, report);
    expect(snap.phase7BoundaryReport).toEqual(report);
    expect(snap.escalationEvent.level).toBe('OBSERVE');
  });
});
