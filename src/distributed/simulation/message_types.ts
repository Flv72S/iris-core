import crypto from 'node:crypto';

import { stableStringify } from '../../logging/audit';

export type MessageId = string;

export type MessageType = 'DECISION' | 'STATE_SYNC';

export interface Message<TPayload = unknown> {
  readonly id: MessageId;
  readonly type: MessageType;
  readonly payload: TPayload;
  readonly timestamp: number;
  readonly originNodeId: string;
}

export interface NetworkEnvelope<TPayload = unknown> {
  readonly message: Message<TPayload>;
  readonly toNodeId: string;
  readonly deliverAtTick: number;
}

export function deriveMessageId(input: {
  readonly type: MessageType;
  readonly payload: unknown;
  readonly timestamp: number;
  readonly originNodeId: string;
}): MessageId {
  const digest = crypto
    .createHash('sha256')
    .update(
      stableStringify({
        type: input.type,
        payload: input.payload,
        timestamp: input.timestamp,
        originNodeId: input.originNodeId,
      }),
      'utf8',
    )
    .digest('hex');
  return `MSG:${digest}`;
}

export function buildMessage<TPayload>(input: {
  readonly type: MessageType;
  readonly payload: TPayload;
  readonly timestamp: number;
  readonly originNodeId: string;
}): Message<TPayload> {
  const id = deriveMessageId(input);
  return Object.freeze({
    id,
    type: input.type,
    payload: input.payload,
    timestamp: input.timestamp,
    originNodeId: input.originNodeId,
  });
}
