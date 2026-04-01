/**
 * Action Lifecycle Manager — Fase 7.1b
 *
 * Ciclo di vita: planned → executing → applied → reverted | failed.
 * Reversibilità obbligatoria (applied → reverted); stato persistente; audit completo.
 */

export type ActionLifecycleState =
  | 'planned'
  | 'executing'
  | 'applied'
  | 'reverted'
  | 'failed';

/** Record persistente dello stato di vita di un'azione. Serializzabile. */
export type ActionLifecycleEntry = {
  readonly actionId: string;
  readonly state: ActionLifecycleState;
  readonly transitionedAt: number;
  readonly previousState: ActionLifecycleState | null;
  readonly reason: string | null;
};

/** Entry audit per ogni transizione. Append-only. */
export type ActionLifecycleAuditEntry = {
  readonly actionId: string;
  readonly fromState: ActionLifecycleState;
  readonly toState: ActionLifecycleState;
  readonly transitionedAt: number;
  readonly reason: string | null;
};

/** Transizioni ammesse: fromState → toState[]. */
const ALLOWED_TRANSITIONS: Readonly<Record<ActionLifecycleState, readonly ActionLifecycleState[]>> =
  Object.freeze({
    planned: Object.freeze(['executing']),
    executing: Object.freeze(['applied', 'failed']),
    applied: Object.freeze(['reverted']),
    reverted: Object.freeze([]),
    failed: Object.freeze([]),
  });

/**
 * Stati consentiti a partire da uno stato corrente.
 */
export function getNextAllowedStates(current: ActionLifecycleState): readonly ActionLifecycleState[] {
  return ALLOWED_TRANSITIONS[current];
}

/**
 * Verifica se la transizione è consentita.
 */
export function canTransition(
  fromState: ActionLifecycleState,
  toState: ActionLifecycleState
): boolean {
  return ALLOWED_TRANSITIONS[fromState].includes(toState);
}

/**
 * Crea una nuova entry di lifecycle dopo la transizione.
 * Se la transizione non è consentita, restituisce null.
 * at = timestamp della transizione (per stato persistente e audit).
 */
export function transition(
  entry: ActionLifecycleEntry,
  toState: ActionLifecycleState,
  reason: string | null,
  at: number
): ActionLifecycleEntry | null {
  if (!canTransition(entry.state, toState)) return null;
  return Object.freeze({
    actionId: entry.actionId,
    state: toState,
    transitionedAt: at,
    previousState: entry.state,
    reason,
  });
}

/**
 * Crea la prima entry per un'azione (stato planned).
 */
export function createPlannedEntry(actionId: string, at: number): ActionLifecycleEntry {
  return Object.freeze({
    actionId,
    state: 'planned',
    transitionedAt: at,
    previousState: null,
    reason: null,
  });
}

/** Store in-memory per stato persistente. Serializzabile (toJSON / fromJSON). */
export type ActionLifecycleStore = {
  get(actionId: string): ActionLifecycleEntry | null;
  set(entry: ActionLifecycleEntry): void;
  getAll(): readonly ActionLifecycleEntry[];
  /** Per persistenza: snapshot serializzabile. */
  toJSON(): string;
  /** Ripristino da persistenza. */
  fromJSON(json: string): void;
};

let lifecycleAuditStore: readonly ActionLifecycleAuditEntry[] = Object.freeze([]);

export function appendLifecycleAudit(auditEntry: ActionLifecycleAuditEntry): void {
  lifecycleAuditStore = Object.freeze([...lifecycleAuditStore, Object.freeze(auditEntry)]);
}

export function readLifecycleAudit(): readonly ActionLifecycleAuditEntry[] {
  return lifecycleAuditStore;
}

export function _resetLifecycleAuditForTest(): void {
  lifecycleAuditStore = Object.freeze([]);
}

/**
 * Esegue la transizione e aggiorna lo store e l'audit. Restituisce la nuova entry o null.
 */
export function transitionAndPersist(
  store: ActionLifecycleStore,
  entry: ActionLifecycleEntry,
  toState: ActionLifecycleState,
  reason: string | null,
  at: number
): ActionLifecycleEntry | null {
  const next = transition(entry, toState, reason, at);
  if (next == null) return null;
  store.set(next);
  appendLifecycleAudit(
    Object.freeze({
      actionId: entry.actionId,
      fromState: entry.state,
      toState,
      transitionedAt: at,
      reason,
    })
  );
  return next;
}

/**
 * Implementazione in-memory dello store. Stato persistente (serializzabile).
 */
export class InMemoryActionLifecycleStore implements ActionLifecycleStore {
  private map = new Map<string, ActionLifecycleEntry>();

  get(actionId: string): ActionLifecycleEntry | null {
    return this.map.get(actionId) ?? null;
  }

  set(entry: ActionLifecycleEntry): void {
    this.map.set(entry.actionId, Object.freeze(entry));
  }

  getAll(): readonly ActionLifecycleEntry[] {
    return Object.freeze([...this.map.values()]);
  }

  toJSON(): string {
    const arr = [...this.map.entries()].map(([id, e]) => ({
      actionId: id,
      state: e.state,
      transitionedAt: e.transitionedAt,
      previousState: e.previousState,
      reason: e.reason,
    }));
    return JSON.stringify(arr);
  }

  fromJSON(json: string): void {
    const arr = JSON.parse(json) as Array<{
      actionId: string;
      state: ActionLifecycleState;
      transitionedAt: number;
      previousState: ActionLifecycleState | null;
      reason: string | null;
    }>;
    this.map.clear();
    for (const e of arr) {
      this.map.set(e.actionId, Object.freeze({
        actionId: e.actionId,
        state: e.state,
        transitionedAt: e.transitionedAt,
        previousState: e.previousState ?? null,
        reason: e.reason ?? null,
      }));
    }
  }
}
