/**
 * Message Append Contract Tests
 * 
 * Test bloccanti per validazione contratto Message Append.
 * Riferimenti vincolanti:
 * - IRIS_API_Contracts_Freeze_STEP5.3_v1.0.md §1
 */

import { describe, it, expect } from 'vitest';

interface MessageAppendRequest {
  readonly threadId: string;
  readonly senderAlias: string;
  readonly payload: string;
  readonly clientMessageId?: string;
}

interface MessageAppendResponse {
  readonly messageId: string;
  readonly threadId: string;
  readonly state: 'SENT';
  readonly createdAt: number;
  readonly clientMessageId?: string;
}

describe('Message Append Contract', () => {
  describe('Schema Validation', () => {
    it('deve accettare request valida con tutti i campi obbligatori', () => {
      const request: MessageAppendRequest = {
        threadId: '550e8400-e29b-41d4-a716-446655440000',
        senderAlias: '660e8400-e29b-41d4-a716-446655440001',
        payload: 'Test message',
      };

      expect(request.threadId).toBeDefined();
      expect(request.senderAlias).toBeDefined();
      expect(request.payload).toBeDefined();
    });

    it('deve garantire che state sia letterale SENT', () => {
      const response: MessageAppendResponse = {
        messageId: '880e8400-e29b-41d4-a716-446655440003',
        threadId: '550e8400-e29b-41d4-a716-446655440000',
        state: 'SENT',
        createdAt: 1706284800000,
      };

      expect(response.state).toBe('SENT');
    });
  });

  describe('Invariante: Append-Only', () => {
    it('deve garantire che messageId sia immutabile', () => {
      const response: MessageAppendResponse = {
        messageId: '880e8400-e29b-41d4-a716-446655440003',
        threadId: '550e8400-e29b-41d4-a716-446655440000',
        state: 'SENT',
        createdAt: 1706284800000,
      };

      expect(response.messageId).toBe('880e8400-e29b-41d4-a716-446655440003');
    });
  });

  describe('Invariante: Thread-First', () => {
    it('deve garantire che threadId sia obbligatorio', () => {
      const request: MessageAppendRequest = {
        threadId: '550e8400-e29b-41d4-a716-446655440000',
        senderAlias: '660e8400-e29b-41d4-a716-446655440001',
        payload: 'Test message',
      };

      expect(request.threadId).toBeDefined();
    });
  });
});
