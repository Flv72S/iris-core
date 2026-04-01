/**
 * Thread Entity (Core)
 *
 * Dominio puro: nessuna dipendenza da HTTP, persistence, env, feature flags o framework.
 *
 * STEP 7A / FASE 1 — Microstep 1.1.1 — Thread Entity (Core)
 */

type ThreadCreateInput = {
  title: string;
};

function assertNonBlank(value: string, field: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Thread.${field} must be non-empty`);
  }
}

function fallbackUuidV4(): string {
  // RFC4122-ish v4 UUID generator (no imports, no deps).
  // NOTE: Not cryptographically secure; acceptable as "equivalente" for Core.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateThreadId(): string {
  const id =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : fallbackUuidV4();
  assertNonBlank(id, 'id');
  return id;
}

export class Thread {
  private readonly id: string;
  private readonly createdAt: Date;
  private updatedAt: Date;
  private title: string;
  private isArchivedValue: boolean;

  private constructor(params: {
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    isArchived: boolean;
  }) {
    assertNonBlank(params.id, 'id');
    assertNonBlank(params.title, 'title');

    if (!(params.createdAt instanceof Date) || Number.isNaN(params.createdAt.getTime())) {
      throw new Error('Thread.createdAt must be a valid Date');
    }
    if (!(params.updatedAt instanceof Date) || Number.isNaN(params.updatedAt.getTime())) {
      throw new Error('Thread.updatedAt must be a valid Date');
    }
    if (params.updatedAt.getTime() < params.createdAt.getTime()) {
      throw new Error('Thread.updatedAt must be >= Thread.createdAt');
    }

    this.id = params.id;
    this.title = params.title.trim();
    this.createdAt = new Date(params.createdAt.getTime());
    this.updatedAt = new Date(params.updatedAt.getTime());
    this.isArchivedValue = params.isArchived;
  }

  static create(input: ThreadCreateInput): Thread {
    assertNonBlank(input.title, 'title');

    const now = new Date();
    const id = generateThreadId();

    return new Thread({
      id,
      title: input.title,
      createdAt: now,
      updatedAt: now,
      isArchived: false,
    });
  }

  rename(newTitle: string): void {
    assertNonBlank(newTitle, 'title');

    this.title = newTitle.trim();

    // Preserve invariant even if system clock is skewed.
    const nextUpdatedAtMs = Math.max(Date.now(), this.createdAt.getTime(), this.updatedAt.getTime());
    this.updatedAt = new Date(nextUpdatedAtMs);
  }

  archive(): void {
    if (this.isArchivedValue) return; // idempotente

    this.isArchivedValue = true;

    // Preserve invariant even if system clock is skewed.
    const nextUpdatedAtMs = Math.max(Date.now(), this.createdAt.getTime(), this.updatedAt.getTime());
    this.updatedAt = new Date(nextUpdatedAtMs);
  }

  getId(): string {
    return this.id;
  }

  getTitle(): string {
    return this.title;
  }

  isArchived(): boolean {
    return this.isArchivedValue;
  }

  getCreatedAt(): Date {
    // Defensive copy: prevents external mutation of internal state.
    return new Date(this.createdAt.getTime());
  }

  getUpdatedAt(): Date {
    // Defensive copy: prevents external mutation of internal state.
    return new Date(this.updatedAt.getTime());
  }
}

