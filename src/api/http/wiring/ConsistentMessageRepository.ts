export type MessagePort = import('../../../core/messages/Message').Message;
export type MessageRepositoryPort = import('../../../core/messages/MessageRepository').MessageRepository;
export type ThreadRepositoryPort = import('../../../core/threads/ThreadRepository').ThreadRepository;

/**
 * ConsistentMessageRepository
 *
 * Decorator di consistenza cross-aggregate (wiring-only):
 * - Intercetta save(message)
 * - Verifica esistenza Thread via ThreadRepository.findById(message.threadId)
 * - Se non esiste -> errore (BAD_REQUEST)
 * - findById / findByThreadId: passthrough
 *
 * Vincoli:
 * - Nessuna logica applicativa/di dominio oltre alla verifica di esistenza
 * - Nessun accesso a HTTP/DB/fs/env
 * - Nessuna modifica al Core
 */
export class ConsistentMessageRepository implements MessageRepositoryPort {
  constructor(
    private readonly messageRepository: MessageRepositoryPort,
    private readonly threadRepository: ThreadRepositoryPort
  ) {}

  async save(message: MessagePort): Promise<void> {
    const thread = await this.threadRepository.findById(message.threadId);
    if (!thread) {
      // Errore minimale, senza semantica aggiuntiva:
      // lo strato HTTP lo mapperà a 400 come BAD_REQUEST.
      const err = Object.assign(new Error('Bad Request'), {
        statusCode: 400,
        code: 'BAD_REQUEST',
      });
      throw err;
    }

    await this.messageRepository.save(message);
  }

  async findByThreadId(threadId: string): Promise<MessagePort[]> {
    return await this.messageRepository.findByThreadId(threadId);
  }

  async findById(id: string): Promise<MessagePort | null> {
    return await this.messageRepository.findById(id);
  }
}

