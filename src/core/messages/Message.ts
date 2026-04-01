/**
 * Message Entity (Core)
 *
 * Dominio puro: nessuna dipendenza da HTTP, persistence, env, runtime o framework.
 *
 * IRIS — FASE 2.1.1 — Core Domain — Entity: Message
 */

function assertNonBlank(value: string, field: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Message.${field} must be non-empty`);
  }
}

export type MessageProps = Readonly<{
  id: string;
  threadId: string;
  author: string;
  content: string;
  createdAt: Date;
}>;

export class Message {
  private readonly idValue: string;
  private readonly threadIdValue: string;
  private readonly authorValue: string;
  private readonly contentValue: string;
  private readonly createdAtValue: Date;

  constructor(props: MessageProps) {
    // Structural invariants (constructor-enforced)
    assertNonBlank(props.id, 'id');
    assertNonBlank(props.threadId, 'threadId');
    assertNonBlank(props.content, 'content');

    if (!(props.createdAt instanceof Date) || Number.isNaN(props.createdAt.getTime())) {
      throw new Error('Message.createdAt must be a valid Date');
    }

    this.idValue = props.id.trim();
    this.threadIdValue = props.threadId.trim();
    this.authorValue = props.author;
    this.contentValue = props.content.trim();
    this.createdAtValue = new Date(props.createdAt.getTime());

    // Immutabilità runtime: nessuna mutazione post-creazione (append-only).
    Object.freeze(this);
  }

  get id(): string {
    return this.idValue;
  }

  get threadId(): string {
    return this.threadIdValue;
  }

  get author(): string {
    return this.authorValue;
  }

  get content(): string {
    return this.contentValue;
  }

  get createdAt(): Date {
    // Defensive copy: prevents external mutation of internal state.
    return new Date(this.createdAtValue.getTime());
  }
}

