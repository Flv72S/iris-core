/**
 * Microstep 14M — Covenant Runtime & Event Engine. Event bus.
 */

import type { CovenantEvent, CovenantEventType } from './runtime_types.js';

export type { CovenantEvent, CovenantEventType } from './runtime_types.js';

export type CovenantEventHandler = (event: CovenantEvent) => void;

export class EventBus {
  private readonly listeners = new Map<CovenantEventType, CovenantEventHandler[]>();

  subscribe(type: CovenantEventType, handler: CovenantEventHandler): void {
    const list = this.listeners.get(type) ?? [];
    list.push(handler);
    this.listeners.set(type, list);
  }

  emit(event: CovenantEvent): void {
    const list = this.listeners.get(event.type) ?? [];
    for (const handler of list) {
      try {
        handler(event);
      } catch (_e) {
        // Don't let one handler break others; violations are still persisted.
      }
    }
  }
}
