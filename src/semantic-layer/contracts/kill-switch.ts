/**
 * Kill-Switch Contract — Phase 8 Validity Requirement
 * Microstep 8.1.0 §5
 *
 * ARCHITECTURAL: Every Phase 8 component MUST be disactivable. When
 * kill-switch is ON (Phase 8 off), system behavior MUST be identical to
 * Phase 7 pure. Component without kill-switch is architecturally invalid.
 */

/**
 * Identifies a Phase 8 component that MUST be disactivable.
 * Use stable, namespaced ids (e.g. "semantic-layer.ranking", "semantic-layer.explanations").
 */
export type Phase8ComponentId = string;

/**
 * Registry that decides whether a Phase 8 component is enabled.
 * When disabled, that component MUST not apply; behavior MUST degrade to Phase 7.
 *
 * Implementation may be in-memory, feature-flag service, or env-based;
 * this contract only requires the query: is this component enabled?
 */
export interface Phase8KillSwitchRegistry {
  /** Returns true iff the component is allowed to run. False => behave as Phase 7 pure. */
  isEnabled(componentId: Phase8ComponentId): boolean;
}

/**
 * Contract: component that is subject to kill-switch.
 * MUST check registry before applying any Phase 8 semantics.
 */
export interface Phase8KillSwitchAware {
  /** Id used in Phase8KillSwitchRegistry. MUST be unique and stable. */
  readonly componentId: Phase8ComponentId;
  /**
   * When registry.isEnabled(componentId) === false, this component MUST
   * not apply overlay; MUST return or behave as Phase 7 only.
   */
  readonly requiresKillSwitch: true;
}

export const KILL_SWITCH_REQUIRED =
  'Every Phase 8 component MUST be disactivable; otherwise architecturally invalid.';
