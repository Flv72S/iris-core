/**
 * Microstep 14M — Covenant Runtime & Event Engine. Periodic scheduler.
 */

export class RuntimeScheduler {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Start periodic execution. Replaces any existing schedule.
   */
  start(intervalMs: number, trigger: () => void): void {
    this.stop();
    // Execute once immediately to avoid timer start jitter in short-interval tests.
    trigger();
    this.intervalId = setInterval(trigger, intervalMs);
  }

  stop(): void {
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
