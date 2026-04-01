/**
 * QualifiedSignalEvent — Evento con marcatura di qualità.
 * Estende SignalEvent; nessun campo proibito (priority, score, severity, interpretation, recommendation).
 */

import type { SignalEvent } from '../signal-adapters/SignalEvent';
import type { SignalQuality } from './SignalQuality';

export interface QualifiedSignalEvent extends SignalEvent {
  readonly quality: SignalQuality;
}
