/**
 * Messaging Contract — Microstep C.1
 * Tipo dichiarativo: solo proprietà semantiche.
 * MUST NOT: channelId, adapterId, endpoint, retry, priority, score, confidence.
 */

export interface MessagingContract {
  readonly contractId: string;
  readonly intentId: string;
  readonly messageKind: string;
  readonly payloadDescriptor?: Readonly<Record<string, unknown>>;
  readonly constraints?: Readonly<Record<string, unknown>>;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly derivedAt: string;
}
