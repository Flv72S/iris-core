/**
 * Prisma Read Store — implementazione della porta tramite Prisma Client
 * Assume l'esistenza di tabelle read-side dedicate. Nessuno schema definito in questo microstep.
 * Delega le operazioni CRUD a un delegate iniettabile (Prisma delegate o mock).
 */

import type { ReadStore, WithId } from './ReadStore';

/** Delegate Prisma-shaped per operazioni su una singola tabella read-side (upsert, findUnique, delete). */
export interface PrismaReadStoreDelegate<T extends WithId> {
  upsert(args: { where: { id: string }; create: T; update: Partial<T> }): Promise<T>;
  findUnique(args: { where: { id: string } }): Promise<T | null>;
  delete(args: { where: { id: string } }): Promise<T>;
}

export class PrismaReadStore<T extends WithId> implements ReadStore<T> {
  constructor(private readonly delegate: PrismaReadStoreDelegate<T>) {}

  async upsert(model: T): Promise<void> {
    await this.delegate.upsert({
      where: { id: model.id },
      create: model,
      update: model as Partial<T>,
    });
  }

  async getById(id: string): Promise<T | undefined> {
    const row = await this.delegate.findUnique({ where: { id } });
    return row ?? undefined;
  }

  async deleteById(id: string): Promise<void> {
    await this.delegate.delete({ where: { id } });
  }
}
