/**
 * ThreadWithMessagesReadModel (Denormalized CQRS Read Model)
 *
 * Vincoli:
 * - Solo tipi primitivi serializzabili
 * - Nessun metodo / logica
 * - Nessun import dal dominio (Thread/Message)
 * - Nessun Date
 */
export interface ThreadWithMessagesReadModel {
  id: string;
  title: string;
  archived: boolean;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601

  messages: {
    id: string;
    author: string;
    content: string;
    createdAt: string; // ISO-8601
  }[];
}

