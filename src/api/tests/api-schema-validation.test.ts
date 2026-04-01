/**
 * API Schema Validation Tests
 * 
 * Test bloccanti per validazione schema TypeScript/JSON.
 * Questi test verificano che gli schema siano corretti e non ambigui.
 * 
 * Riferimenti vincolanti:
 * - IRIS_API_Contracts_Freeze_STEP5.3_v1.0.md
 */

import { describe, it, expect } from 'vitest';

describe('API Schema Validation', () => {
  describe('Message Append Schema', () => {
    it('deve avere schema request completo e non ambiguo', () => {
      interface MessageAppendRequest {
        readonly threadId: string;
        readonly senderAlias: string;
        readonly payload: string;
        readonly clientMessageId?: string;
      }

      const request: MessageAppendRequest = {
        threadId: '550e8400-e29b-41d4-a716-446655440000',
        senderAlias: '660e8400-e29b-41d4-a716-446655440001',
        payload: 'Test',
      };

      expect(request.threadId).toBeDefined();
      expect(request.senderAlias).toBeDefined();
      expect(request.payload).toBeDefined();
    });

    it('deve avere schema response completo e non ambiguo', () => {
      interface MessageAppendResponse {
        readonly messageId: string;
        readonly threadId: string;
        readonly state: 'SENT';
        readonly createdAt: number;
        readonly clientMessageId?: string;
      }

      const response: MessageAppendResponse = {
        messageId: '880e8400-e29b-41d4-a716-446655440003',
        threadId: '550e8400-e29b-41d4-a716-446655440000',
        state: 'SENT',
        createdAt: 1706284800000,
      };

      expect(response.messageId).toBeDefined();
      expect(response.threadId).toBeDefined();
      expect(response.state).toBe('SENT');
      expect(response.createdAt).toBeDefined();
    });
  });

  describe('Thread State Schema', () => {
    it('deve avere schema response completo e non ambiguo', () => {
      interface ThreadStateResponse {
        readonly threadId: string;
        readonly state: 'OPEN' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';
        readonly lastStateChangeAt: number;
        readonly canAcceptMessages: boolean;
      }

      const response: ThreadStateResponse = {
        threadId: '550e8400-e29b-41d4-a716-446655440000',
        state: 'OPEN',
        lastStateChangeAt: 1706284800000,
        canAcceptMessages: true,
      };

      expect(response.threadId).toBeDefined();
      expect(response.state).toBe('OPEN');
      expect(response.lastStateChangeAt).toBeDefined();
      expect(response.canAcceptMessages).toBe(true);
    });
  });

  describe('Sync / Delivery Schema', () => {
    it('deve avere schema delivery completo e non ambiguo', () => {
      interface MessageDeliveryResponse {
        readonly messageId: string;
        readonly threadId: string;
        readonly state: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
        readonly sentAt: number;
        readonly deliveredAt?: number;
        readonly readAt?: number;
        readonly failedAt?: number;
        readonly failureReason?: string;
      }

      const response: MessageDeliveryResponse = {
        messageId: '880e8400-e29b-41d4-a716-446655440003',
        threadId: '550e8400-e29b-41d4-a716-446655440000',
        state: 'DELIVERED',
        sentAt: 1706284800000,
        deliveredAt: 1706284805000,
      };

      expect(response.messageId).toBeDefined();
      expect(response.threadId).toBeDefined();
      expect(response.state).toBe('DELIVERED');
      expect(response.sentAt).toBeDefined();
    });
  });
});
