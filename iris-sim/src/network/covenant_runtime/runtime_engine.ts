/**
 * Microstep 14M — Covenant Runtime & Event Engine. Runtime engine.
 */

import { randomUUID } from 'node:crypto';
import type { CovenantRegistry } from '../covenants/index.js';
import { CovenantEngine } from '../covenants/index.js';
import type { CovenantEvent } from './runtime_types.js';
import type { EventBus } from './event_bus.js';
import type { CovenantRuntimeStore } from './runtime_store.js';
import { RuntimeContextBuilder, type RuntimeContextBuilderDeps } from './runtime_context_builder.js';

const LIFECYCLE_EVENT_TYPES = [
  'CONSENSUS_COMPLETED',
  'STATE_UPDATED',
  'REPLAY_COMPLETED',
  'MANUAL_TRIGGER',
] as const;

export class CovenantRuntimeEngine {
  private readonly covenantEngine: CovenantEngine;

  constructor(
    registry: CovenantRegistry,
    private readonly eventBus: EventBus,
    private readonly store: CovenantRuntimeStore,
    private readonly deps: RuntimeContextBuilderDeps,
  ) {
    this.covenantEngine = new CovenantEngine(registry);
  }

  start(): void {
    for (const type of LIFECYCLE_EVENT_TYPES) {
      this.eventBus.subscribe(type, (event) => this.handleEvent(event));
    }
  }

  handleEvent(event: CovenantEvent): void {
    const context = RuntimeContextBuilder.build(event, this.deps);
    const report = this.covenantEngine.evaluate(context);
    const stored = Object.freeze({
      id: randomUUID(),
      timestamp: Date.now(),
      report,
    });
    this.store.append(stored);
    if (report.violations.length > 0) {
      this.eventBus.emit({
        type: 'COVENANT_VIOLATION',
        payload: report.violations,
        timestamp: Date.now(),
      });
    }
  }
}
