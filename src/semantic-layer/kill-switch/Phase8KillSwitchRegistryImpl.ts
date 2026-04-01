/**
 * Phase 8 Kill-Switch Registry — minimal implementation
 * Microstep 8.1.0
 *
 * In-memory registry. Does NOT depend on platform/features so that
 * SemanticLayer stays dependent only on Domain, Application, ReadPlatform.
 * Infrastructure may wire a FeatureToggle-based implementation if needed.
 */

import type { Phase8ComponentId, Phase8KillSwitchRegistry } from '../contracts';

/**
 * Simple registry: component id -> enabled (true) or disabled (false).
 * Default: all disabled (Phase 8 off => Phase 7 pure).
 */
export class Phase8KillSwitchRegistryImpl implements Phase8KillSwitchRegistry {
  private readonly enabled = new Set<Phase8ComponentId>();

  constructor(initialEnabled: Phase8ComponentId[] = []) {
    for (const id of initialEnabled) {
      this.enabled.add(id);
    }
  }

  isEnabled(componentId: Phase8ComponentId): boolean {
    return this.enabled.has(componentId);
  }

  setEnabled(componentId: Phase8ComponentId, enabled: boolean): void {
    if (enabled) {
      this.enabled.add(componentId);
    } else {
      this.enabled.delete(componentId);
    }
  }

  /** Disable all Phase 8 components — full fallback to Phase 7 pure. */
  disableAll(): void {
    this.enabled.clear();
  }
}
