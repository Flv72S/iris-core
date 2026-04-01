/**
 * S-0 — Scheduled event. Immutable after creation; no dynamic priority mutation.
 */

import type { ScheduledEvent as IScheduledEvent } from './SchedulerTypes.js';

export function createScheduledEvent(
  id: string,
  scheduledTick: bigint,
  priority: number,
  execute: () => void,
): IScheduledEvent {
  if (!id || typeof id !== 'string') {
    throw new DeterministicSchedulerError('INVALID_EVENT_ID', 'Event id must be a non-empty string.');
  }
  if (typeof scheduledTick !== 'bigint' || scheduledTick < 0n) {
    throw new DeterministicSchedulerError('INVALID_TICK', 'scheduledTick must be a non-negative bigint.');
  }
  if (typeof priority !== 'number' || !Number.isFinite(priority)) {
    throw new DeterministicSchedulerError('INVALID_PRIORITY', 'priority must be a finite number.');
  }
  if (typeof execute !== 'function') {
    throw new DeterministicSchedulerError('INVALID_EXECUTE', 'execute must be a function.');
  }
  return Object.freeze({
    id,
    scheduledTick,
    priority,
    execute,
  });
}

export class DeterministicSchedulerError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DeterministicSchedulerError';
    Object.setPrototypeOf(this, DeterministicSchedulerError.prototype);
  }
}
