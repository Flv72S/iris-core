/**
 * Message Composer Component
 * 
 * Proiezione passiva del compositore messaggi.
 * 
 * Riferimenti vincolanti:
 * - IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md — Sezione 2.4 (Composer)
 * - IRIS_UX_Hardening_STEP4G_v1.0.md — Mitigazione FM-UX-01 (Comunicazione agency utente)
 * 
 * Vincoli:
 * - Thread-first (STEP 4E §1)
 * - Assenza di realtime (STEP 4E §4)
 * - Gestione errori esplicita (STEP 4E §6)
 * - Nessuna auto-suggest
 * - Nessuna predizione testo
 * - Nessun retry automatico
 */

import React, { useState } from 'react';
import type { ThreadState } from '../types';

export interface MessageComposerProps {
  readonly threadId: string;
  readonly threadState: ThreadState;
  readonly isParticipant: boolean;
  readonly onSend: (payload: string) => Promise<void>;
  readonly isSending: boolean;
  readonly disabled: boolean;
  readonly error?: string;
}

/**
 * Message Composer
 * 
 * Componente controllato che permette di comporre e inviare messaggi.
 * Stato interno minimo (solo input text) - nessun side effect.
 */
export const MessageComposer: React.FC<MessageComposerProps> = ({
  threadId,
  threadState,
  isParticipant,
  onSend,
  isSending,
  disabled,
  error,
}) => {
  const [inputValue, setInputValue] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setInputValue(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (disabled || isSending || !inputValue.trim()) {
      return;
    }
    const payload = inputValue.trim();
    setInputValue('');
    await onSend(payload);
  };

  const isComposerDisabled = disabled || threadState !== 'OPEN' || !isParticipant || isSending;

  return (
    <div data-testid={`message-composer-${threadId}`}>
      {error && (
        <div data-testid={`message-composer-error-${threadId}`} style={{ color: 'red' }}>
          Errore: {error}
        </div>
      )}
      {!isParticipant && (
        <div data-testid={`message-composer-not-participant-${threadId}`}>
          Non sei un partecipante di questo thread
        </div>
      )}
      {threadState !== 'OPEN' && (
        <div data-testid={`message-composer-thread-closed-${threadId}`}>
          Thread non aperto. Stato: {threadState}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <textarea
          data-testid={`message-composer-input-${threadId}`}
          value={inputValue}
          onChange={handleInputChange}
          disabled={isComposerDisabled}
          placeholder="Scrivi un messaggio..."
          rows={3}
        />
        <button
          data-testid={`message-composer-submit-${threadId}`}
          type="submit"
          disabled={isComposerDisabled || !inputValue.trim()}
        >
          {isSending ? 'Invio in corso...' : 'Invia'}
        </button>
      </form>
    </div>
  );
};
