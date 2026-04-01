/**
 * SignalEvent — Tipo base per eventi normalizzati da adapter.
 * MUST NOT: priority, score, severity, recommendation, interpretation.
 */

export type SignalSource =
  | 'calendar'
  | 'tasks'
  | 'inbox'
  | 'time'
  | 'activity';

export interface SignalEvent {
  readonly id: string;
  readonly source: SignalSource;
  readonly type: string;
  readonly occurredAt: number;
  readonly payload: Record<string, unknown>;
  readonly receivedAt: number;
}
