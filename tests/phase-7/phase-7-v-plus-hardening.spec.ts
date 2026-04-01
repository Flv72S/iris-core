/**
 * Phase 7.V+ — Certification Hardening
 *
 * Verifica che la hardening suite passi: determinismo forte, failure injection, phase boundary.
 */

import { describe, it, expect } from 'vitest';
import { runHardeningSuite } from './hardening/hardening-suite';

describe('Phase 7.V+ — Certification Hardening', () => {
  it('hardening suite: readyForCertification is true', () => {
    const report = runHardeningSuite();
    expect(report.deterministic).toBe(true);
    expect(report.failuresHandled).toBe(true);
    expect(report.boundariesRespected).toBe(true);
    expect(report.readyForCertification).toBe(true);
  });

  it('hardening suite: deterministic (deep compare + audit hash)', () => {
    const report = runHardeningSuite();
    expect(report.deterministic).toBe(true);
    expect(report.details?.auditHashConsistent).toBe(true);
    expect(report.details?.determinismDiff).toBeUndefined();
  });

  it('hardening suite: failures handled (kill-switch + corrupted audit)', () => {
    const report = runHardeningSuite();
    expect(report.failuresHandled).toBe(true);
    expect(report.details?.killSwitchStopped).toBe(true);
    expect(report.details?.corruptedAuditDetected).toBe(true);
  });

  it('hardening suite: phase boundaries respected', () => {
    const report = runHardeningSuite();
    expect(report.boundariesRespected).toBe(true);
  });
});
