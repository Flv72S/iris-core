import type { Message } from './Message';
import type { MessageId, ThreadId } from './ids';

export interface MessageRepository {
  save(message: Message): Promise<void>;

  findByThreadId(threadId: ThreadId): Promise<Message[]>;

  findById(id: MessageId): Promise<Message | null>;
}

