/**
 * Query Layer — ID types (read-model)
 *
 * Vincoli:
 * - Primitivi e serializzabili
 * - Nessuna dipendenza dal Core domain (threads/messages)
 */
export type ThreadId = string;
export type MessageId = string;

