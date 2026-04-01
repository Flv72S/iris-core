/**
 * Thread Detail View Component
 * 
 * Proiezione passiva del dettaglio thread con messaggi.
 * 
 * Riferimenti vincolanti:
 * - IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md — Sezione 2.2 (Thread Detail View)
 * - IRIS_UX_Hardening_STEP4G_v1.0.md — Mitigazione FM-UX-01, FM-UX-02, FM-UX-03
 * 
 * Vincoli:
 * - Thread-first (STEP 4E §1)
 * - Finitudine visibile (STEP 4E §2)
 * - Stato esplicito (STEP 4E §3)
 * - Privacy by UI (STEP 4E §5)
 * - Nessun preload aggressivo
 * - Paginazione obbligatoria
 */

import React from 'react';
import type { Thread, MessageView } from '../types';
import { MessageComponent } from './MessageComponent';
import { MessageComposer } from './MessageComposer';

export interface ThreadDetailViewProps {
  readonly threadId: string;
  readonly thread: Thread;
  readonly messages: readonly MessageView[];
  readonly participants: readonly string[];
  readonly onLoadPreviousMessages: () => void;
  readonly hasMoreMessages: boolean;
  readonly onSendMessage: (payload: string) => Promise<void>;
  readonly canSend: boolean;
}

/**
 * Thread Detail View
 * 
 * Componente puro che renderizza un thread con i suoi messaggi.
 * Nessuna logica, nessun side effect, nessuna inferenza.
 */
export const ThreadDetailView: React.FC<ThreadDetailViewProps> = ({
  threadId,
  thread,
  messages,
  participants,
  onLoadPreviousMessages,
  hasMoreMessages,
  onSendMessage,
  canSend,
}) => {
  const handleLoadPrevious = (): void => {
    onLoadPreviousMessages();
  };

  return (
    <div data-testid="thread-detail-view">
      <div data-testid={`thread-header-${threadId}`}>
        <div data-testid={`thread-title-${threadId}`}>
          {thread.title || 'Thread senza titolo'}
        </div>
        <div data-testid={`thread-state-${threadId}`}>
          Stato: {thread.state}
        </div>
        <div data-testid={`thread-participants-${threadId}`}>
          Partecipanti: {participants.join(', ')}
        </div>
        {thread.communityId && (
          <div data-testid={`thread-community-${threadId}`}>
            Community: {thread.communityId}
          </div>
        )}
      </div>

      {hasMoreMessages && (
        <button
          data-testid="thread-load-previous-messages"
          onClick={handleLoadPrevious}
          type="button"
        >
          Carica messaggi precedenti
        </button>
      )}

      <div data-testid={`thread-messages-${threadId}`}>
        {messages.map((message) => (
          <MessageComponent
            key={message.id}
            message={message}
            threadId={threadId}
            showTimestamp={true}
            showState={true}
          />
        ))}
      </div>

      {messages.length === 0 && (
        <div data-testid={`thread-no-messages-${threadId}`}>
          Nessun messaggio in questo thread
        </div>
      )}

      <MessageComposer
        threadId={threadId}
        threadState={thread.state}
        isParticipant={canSend}
        onSend={onSendMessage}
        isSending={false}
        disabled={!canSend || thread.state !== 'OPEN'}
      />
    </div>
  );
};
