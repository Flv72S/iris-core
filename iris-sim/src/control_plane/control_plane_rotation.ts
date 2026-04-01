/**
 * Microstep 16D.X2 — secret rotation helpers (zero-downtime dual key).
 */

import { randomUUID } from 'node:crypto';

import type { ControlPlaneRegistry } from './control_plane_registry.js';

function generateSecret(): string {
  return `${randomUUID()}-${randomUUID()}`;
}

export function initiateRotation(registry: ControlPlaneRegistry, nodeId: string, now: number): string | null {
  const nextSecret = generateSecret();
  const ok = registry.startRotation(nodeId, nextSecret, now);
  return ok ? nextSecret : null;
}

export function finalizeRotation(registry: ControlPlaneRegistry, nodeId: string, now: number): boolean {
  return registry.completeRotation(nodeId, now);
}

