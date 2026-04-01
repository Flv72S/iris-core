/**
 * Test Bloccanti — Rendering Deterministico Componenti UI
 * 
 * STEP 5.1 — Test obbligatori
 * 
 * Riferimenti vincolanti:
 * - IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md — Sezione 7 (Test UI Bloccanti)
 * - STEP 5.1 (Test obbligatori)
 * 
 * Verifica che i componenti UI siano deterministici (stesse props = stesso output).
 */

import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ThreadListView } from '../components/ThreadListView';
import { MessageComponent } from '../components/MessageComponent';
import type { ThreadSummary, MessageView } from '../types';

describe('UI Components — Rendering Deterministico', () => {
  test('ThreadListView renderizza deterministicamente con stesse props', () => {
    const mockThreads: ThreadSummary[] = [
      {
        id: 'thread1',
        title: 'Test Thread',
        participants: ['user1', 'user2'],
        state: 'OPEN',
        lastEventAt: 1000000,
        messageCount: 5,
      },
    ];
    
    const mockOnSelect = (): void => {};
    
    const { container: container1 } = render(
      <ThreadListView
        threads={mockThreads}
        onThreadSelect={mockOnSelect}
        hasMore={false}
      />
    );
    
    const { container: container2 } = render(
      <ThreadListView
        threads={mockThreads}
        onThreadSelect={mockOnSelect}
        hasMore={false}
      />
    );
    
    expect(container1.innerHTML).toBe(container2.innerHTML);
  });
  
  test('MessageComponent renderizza deterministicamente con stesse props', () => {
    const mockMessage: MessageView = {
      id: 'msg1',
      threadId: 'thread1',
      senderAlias: 'user1',
      payload: 'Test message',
      state: 'SENT',
      createdAt: 1000000,
    };
    
    const { container: container1 } = render(
      <MessageComponent
        message={mockMessage}
        threadId="thread1"
        showTimestamp={true}
        showState={true}
      />
    );
    
    const { container: container2 } = render(
      <MessageComponent
        message={mockMessage}
        threadId="thread1"
        showTimestamp={true}
        showState={true}
      />
    );
    
    expect(container1.innerHTML).toBe(container2.innerHTML);
  });
});
