/**
 * Test Non-Deriva Semantica — Backend Connection
 * 
 * STEP 5.2 — Test obbligatori
 * 
 * Riferimenti vincolanti:
 * - IRIS_UI_Semantic_Freeze_STEP5.1.5_v1.0.md
 * - IRIS_STEP5.2_Data_Connection_Map_v1.0.md
 * 
 * Verifica che il collegamento backend/mock non introduca:
 * - cambiamenti a copy UI
 * - cambiamenti a ordine semantico
 * - cambiamenti a significato di "vuoto"
 * - nuovo testo
 * - cambiamenti a comportamento visibile
 */

import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'fs';
import { glob } from 'glob';
import { ThreadListView } from '../components/ThreadListView';
import { ThreadDetailView } from '../components/ThreadDetailView';
import { MessageComponent } from '../components/MessageComponent';
import { MessageComposer } from '../components/MessageComposer';
import type { ThreadSummary, Thread, MessageView, ThreadState } from '../types';
import { THREAD_LIST_COPY, THREAD_DETAIL_COPY, MESSAGE_COPY, COMPOSER_COPY } from '../utils/ui-copy';

describe('UI Backend Connection — No Semantic Drift', () => {
  test('copy UI non cambia dopo collegamento backend', () => {
    // Verifica che i copy dichiarativi siano invariati
    expect(THREAD_LIST_COPY.END_OF_LIST).toBe('Fine lista thread');
    expect(THREAD_LIST_COPY.LOAD_MORE).toBe('Carica più thread');
    expect(THREAD_DETAIL_COPY.NO_MESSAGES).toBe('Nessun messaggio in questo thread');
    expect(THREAD_DETAIL_COPY.LOAD_PREVIOUS).toBe('Carica messaggi precedenti');
    expect(MESSAGE_COPY.SENDER_LABEL).toBe('Da:');
    expect(MESSAGE_COPY.STATE_LABEL).toBe('Stato:');
    expect(COMPOSER_COPY.INPUT_PLACEHOLDER).toBe('Scrivi un messaggio...');
    expect(COMPOSER_COPY.SEND_BUTTON).toBe('Invia');
  });
  
  test('significato "vuoto" non cambia', () => {
    const mockThreads: ThreadSummary[] = [];
    const mockOnSelect = (): void => {};
    
    render(
      <ThreadListView
        threads={mockThreads}
        onThreadSelect={mockOnSelect}
        hasMore={false}
      />
    );
    
    // Verifica che "vuoto" significhi ancora "stato del sistema", non "silenzio sociale"
    expect(screen.queryByTestId('thread-list-end')).toBeInTheDocument();
    
    const mockThread: Thread = {
      id: 'thread-1',
      title: 'Test Thread',
      communityId: null,
      participants: ['user1'],
      state: 'OPEN',
      createdAt: Date.now(),
      lastEventAt: Date.now(),
    };
    
    const mockMessages: MessageView[] = [];
    const mockOnLoadPrevious = (): void => {};
    const mockOnSend = async (): Promise<void> => {};
    
    render(
      <ThreadDetailView
        threadId="thread-1"
        thread={mockThread}
        messages={mockMessages}
        participants={['user1']}
        onLoadPreviousMessages={mockOnLoadPrevious}
        hasMoreMessages={false}
        onSendMessage={mockOnSend}
        canSend={true}
      />
    );
    
    // Verifica che "nessun messaggio" significhi ancora "stato del sistema"
    expect(screen.queryByTestId('thread-no-messages-thread-1')).toBeInTheDocument();
    expect(screen.getByText('Nessun messaggio in questo thread')).toBeInTheDocument();
  });
  
  test('nessun nuovo testo compare nei componenti', async () => {
    const componentFiles = await glob('src/ui/components/**/*.{ts,tsx}', {
      ignore: ['**/*.test.ts', '**/*.test.tsx', '**/node_modules/**', '**/index.ts']
    });
    
    // Lista testi consentiti (da ui-copy.ts)
    const allowedTexts = [
      'Fine lista thread',
      'Carica più thread',
      'Nessun messaggio in questo thread',
      'Carica messaggi precedenti',
      'Thread senza titolo',
      'Da:',
      'Stato:',
      'Scrivi un messaggio...',
      'Invia',
      'Invio in corso...',
      'Errore:',
      'Non sei un partecipante di questo thread',
      'Thread non aperto. Stato:',
      'Partecipanti:',
      'Ultimo evento:',
      'Messaggi:',
    ];
    
    for (const file of componentFiles) {
      const content = readFileSync(file, 'utf-8');
      
      // Estrai stringhe letterali (tra virgolette)
      const stringMatches = content.match(/['"`]([^'"`]+)['"`]/g) || [];
      
      for (const match of stringMatches) {
        const text = match.slice(1, -1); // Rimuovi virgolette
        // Ignora stringhe vuote, numeri, e testid
        if (text.length > 0 && !text.match(/^[a-z-]+-\d+$/) && !text.match(/^\d+$/)) {
          // Verifica che il testo sia consentito o sia parte di un testid
          const isAllowed = allowedTexts.some(allowed => text.includes(allowed) || allowed.includes(text));
          const isTestId = text.includes('testid') || text.includes('data-testid');
          
          if (!isAllowed && !isTestId && text.length > 2) {
            throw new Error(
              `File ${file} contiene nuovo testo non autorizzato: "${text}". ` +
              `Tutti i testi devono essere definiti in ui-copy.ts.`
            );
          }
        }
      }
    }
    
    expect(true).toBe(true);
  });
  
  test('comportamento visibile non cambia', () => {
    const mockThreads: ThreadSummary[] = [
      {
        id: 'thread-1',
        title: 'Test Thread',
        participants: ['user1'],
        state: 'OPEN',
        lastEventAt: Date.now(),
        messageCount: 5,
      },
    ];
    
    const mockOnSelect = (): void => {};
    
    const { container } = render(
      <ThreadListView
        threads={mockThreads}
        onThreadSelect={mockOnSelect}
        hasMore={false}
      />
    );
    
    // Verifica che il comportamento visibile sia invariato
    expect(screen.getByTestId('thread-list-view')).toBeInTheDocument();
    expect(screen.getByTestId('thread-item-thread-1')).toBeInTheDocument();
    expect(screen.getByTestId('thread-list-end')).toBeInTheDocument();
  });
  
  test('ordine semantico non cambia', () => {
    const mockThreads: ThreadSummary[] = [
      {
        id: 'thread-1',
        title: 'Thread 1',
        participants: ['user1'],
        state: 'OPEN',
        lastEventAt: Date.now(),
        messageCount: 5,
      },
      {
        id: 'thread-2',
        title: 'Thread 2',
        participants: ['user2'],
        state: 'OPEN',
        lastEventAt: Date.now() - 1000,
        messageCount: 3,
      },
    ];
    
    const mockOnSelect = (): void => {};
    
    const { container } = render(
      <ThreadListView
        threads={mockThreads}
        onThreadSelect={mockOnSelect}
        hasMore={false}
      />
    );
    
    // Verifica che l'ordine sia quello passato via props, non modificato
    const threadItems = container.querySelectorAll('[data-testid^="thread-item-"]');
    expect(threadItems.length).toBe(2);
    expect(threadItems[0].getAttribute('data-testid')).toBe('thread-item-thread-1');
    expect(threadItems[1].getAttribute('data-testid')).toBe('thread-item-thread-2');
  });
  
  test('test semantici STEP 5.1.5 PASS invariati', async () => {
    // Importa e verifica che i test semantici di STEP 5.1.5 siano ancora validi
    // Questo test verifica che non ci siano derive semantiche
    
    const componentFiles = await glob('src/ui/components/**/*.{ts,tsx}', {
      ignore: ['**/*.test.ts', '**/*.test.tsx', '**/node_modules/**', '**/index.ts']
    });
    
    // Verifica pattern vietati (da ui-semantic-guards.test.tsx)
    const forbiddenPatterns = [
      /nuovi messaggi in arrivo/i,
      /resta aggiornato/i,
      /ultima attività/i,
      /in attesa/i,
      /non risponde/i,
      /sta scrivendo/i,
      /online/i,
      /offline/i,
      /last seen/i,
      /continua/i,
      /altri disponibili/i,
      /carica automaticamente/i,
      /importante/i,
      /priorità/i,
      /popolare/i,
      /attivo/i,
      /consigliato/i,
      /suggerito/i,
      /persone che potresti conoscere/i,
      /amici/i,
      /seguaci/i,
      /aggiorna/i,
      /ricarica/i,
      /controlla/i,
      /verifica/i,
      /refresh/i,
      /reload/i,
    ];
    
    for (const file of componentFiles) {
      const content = readFileSync(file, 'utf-8');
      
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(content)) {
          throw new Error(
            `File ${file} contiene pattern semantico vietato: ${pattern}. ` +
            `I test semantici di STEP 5.1.5 devono PASSARE invariati.`
          );
        }
      }
    }
    
    expect(true).toBe(true);
  });
});
