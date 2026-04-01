/**
 * Microstep 10G — Governance Trust Event Log Engine. Event log engine.
 */

import type { TrustEvent, TrustEventLog } from '../types/trust_event_types.js';

/**
 * Append-only event log. Events are never modified or removed.
 */
export class TrustEventLogEngine {
  private events: TrustEvent[] = [];

  /**
   * Append an event to the log (append-only).
   */
  appendEvent(event: TrustEvent): void {
    this.events.push(event);
  }

  /**
   * Get all events in chronological order (copy).
   */
  getEvents(): TrustEvent[] {
    return [...this.events];
  }

  /**
   * Get the current event count.
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Get the log as a TrustEventLog (readonly view).
   */
  getLog(): TrustEventLog {
    return Object.freeze({ events: [...this.events] });
  }
}
