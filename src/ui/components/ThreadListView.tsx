/**
 * Thread List View Component
 * 
 * Proiezione passiva della lista thread.
 * 
 * Riferimenti vincolanti:
 * - IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md — Sezione 2.1 (Thread List View)
 * - IRIS_UX_Hardening_STEP4G_v1.0.md — Mitigazione FM-UX-01, FM-UX-02
 * 
 * Vincoli:
 * - Thread-first (STEP 4E §1)
 * - Finitudine visibile (STEP 4E §2)
 * - Privacy by UI (STEP 4E §5)
 * - Nessun ranking implicito
 * - Nessuna priorità implicita
 * - Ordinamento statico documentato
 * - Paginazione obbligatoria
 */

import React from 'react';
import type { ThreadSummary } from '../types';

export interface ThreadListViewProps {
  readonly threads: readonly ThreadSummary[];
  readonly onThreadSelect: (threadId: string) => void;
  readonly onLoadMore?: () => void;
  readonly hasMore: boolean;
}

export const ThreadListView: React.FC<ThreadListViewProps> = ({
  threads,
  onThreadSelect,
  onLoadMore,
  hasMore,
}) => {
  const handleThreadClick = (threadId: string): void => {
    onThreadSelect(threadId);
  };

  const handleLoadMoreClick = (): void => {
    if (onLoadMore) {
      onLoadMore();
    }
  };

  return (
    <div data-testid="thread-list-view">
      <div data-testid="thread-list">
        {threads.map((thread) => (
          <div
            key={thread.id}
            data-testid={`thread-item-${thread.id}`}
            onClick={() => handleThreadClick(thread.id)}
            style={{ cursor: 'pointer', padding: '8px', border: '1px solid #ccc', margin: '4px' }}
          >
            <div data-testid={`thread-title-${thread.id}`}>
              {thread.title || 'Thread senza titolo'}
            </div>
            <div data-testid={`thread-participants-${thread.id}`}>
              Partecipanti: {thread.participants.join(', ')}
            </div>
            <div data-testid={`thread-state-${thread.id}`}>
              Stato: {thread.state}
            </div>
            <div data-testid={`thread-last-event-${thread.id}`}>
              Ultimo evento: {new Date(thread.lastEventAt).toLocaleString()}
            </div>
            <div data-testid={`thread-message-count-${thread.id}`}>
              Messaggi: {thread.messageCount}
            </div>
          </div>
        ))}
      </div>
      {hasMore && onLoadMore && (
        <button
          data-testid="thread-list-load-more"
          onClick={handleLoadMoreClick}
          type="button"
        >
          Carica più thread
        </button>
      )}
      {!hasMore && threads.length > 0 && (
        <div data-testid="thread-list-end">Fine lista thread</div>
      )}
    </div>
  );
};
