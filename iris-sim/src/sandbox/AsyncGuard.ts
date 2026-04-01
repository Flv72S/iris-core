/**
 * S-0 — Throws if Promise-based or timer-based scheduling is attempted outside scheduler.
 */

export class NondeterministicAsyncError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'NondeterministicAsyncError';
    Object.setPrototypeOf(this, NondeterministicAsyncError.prototype);
  }
}

function throwAsync(): never {
  throw new NondeterministicAsyncError(
    'UNSCHEDULED_ASYNC',
    'setTimeout/setInterval are disabled in deterministic runtime. Use scheduler only.',
  );
}

export function throwPromise(): never {
  throw new NondeterministicAsyncError(
    'UNSCHEDULED_PROMISE',
    'Promise-based scheduling outside deterministic scheduler is not allowed.',
  );
}

export type TimerShim = (callback: () => void, ms?: number) => ReturnType<typeof setTimeout>;
export type IntervalShim = (callback: () => void, ms?: number) => ReturnType<typeof setInterval>;

export function createBlockingTimerShim(): TimerShim {
  return () => {
    throwAsync();
  };
}

export function createBlockingIntervalShim(): IntervalShim {
  return () => {
    throwAsync();
  };
}

/** Call this to guard against unscheduled async if you hook Promise. */
export function guardPromise(): void {
  throwPromise();
}
