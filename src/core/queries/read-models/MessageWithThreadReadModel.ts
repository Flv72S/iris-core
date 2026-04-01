/**
 * MessageWithThreadReadModel (Denormalized CQRS Read Model)
 *
 * Vincoli:
 * - Solo tipi primitivi serializzabili
 * - Nessun metodo / logica
 * - Nessun import dal dominio (Thread/Message)
 * - Nessun Date
 */
export interface MessageWithThreadReadModel {
  id: string;
  content: string;
  author: string;
  createdAt: string; // ISO-8601

  thread: {
    id: string;
    title: string;
    archived: boolean;
  };
}

