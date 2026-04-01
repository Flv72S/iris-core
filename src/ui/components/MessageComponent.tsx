/**
 * Message Component
 * 
 * Proiezione passiva di un singolo messaggio.
 * 
 * Riferimenti vincolanti:
 * - IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md — Sezione 2.3 (Message Component)
 * - IRIS_UX_Hardening_STEP4G_v1.0.md — Mitigazione FM-UX-03 (Disinnesco inferenza stato)
 * 
 * Vincoli:
 * - Thread-first (STEP 4E §1)
 * - Stato esplicito (STEP 4E §3)
 * - Privacy by UI (STEP 4E §5)
 * - Nessun metadato nascosto
 * - Nessuno stato inferito
 */

import React from 'react';
import type { MessageView } from '../types';

export interface MessageComponentProps {
  readonly message: MessageView;
  readonly threadId: string;
  readonly showTimestamp: boolean;
  readonly showState: boolean;
}

/**
 * Message Component
 * 
 * Componente puro che renderizza un singolo messaggio.
 * Nessuna logica, nessun side effect, nessuna inferenza.
 */
export const MessageComponent: React.FC<MessageComponentProps> = ({
  message,
  threadId,
  showTimestamp,
  showState,
}) => {
  // Verifica che il messaggio appartenga al thread (enforcement thread-first)
  if (message.threadId !== threadId) {
    return null;
  }

  return (
    <div data-testid={`message-${message.id}`}>
      <div data-testid={`message-sender-${message.id}`}>
        Da: {message.senderAlias}
      </div>
      <div data-testid={`message-payload-${message.id}`}>
        {message.payload}
      </div>
      {showState && (
        <div data-testid={`message-state-${message.id}`}>
          Stato: {message.state}
        </div>
      )}
      {showTimestamp && (
        <div data-testid={`message-timestamp-${message.id}`}>
          {new Date(message.createdAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};
