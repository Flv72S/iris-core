import { describe, it, expect } from 'vitest';
import { Thread } from '../Thread';

describe('Thread Entity (Core)', () => {
  it('1) Creazione thread valida', () => {
    const thread = Thread.create({ title: 'Hello' });

    expect(thread.getId().trim().length).toBeGreaterThan(0);
    expect(thread.getTitle()).toBe('Hello');
    expect(thread.isArchived()).toBe(false);
  });

  it('2) Fallimento se title vuoto', () => {
    expect(() => Thread.create({ title: '' })).toThrowError();
    expect(() => Thread.create({ title: '   ' })).toThrowError();
  });

  it('3) rename() aggiorna titolo e updatedAt', () => {
    const thread = Thread.create({ title: 'Old' });
    const before = thread.getUpdatedAt().getTime();

    thread.rename('New');

    expect(thread.getTitle()).toBe('New');
    expect(thread.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before);
  });

  it('4) rename() con titolo vuoto ⇒ error', () => {
    const thread = Thread.create({ title: 'Ok' });

    expect(() => thread.rename('')).toThrowError();
    expect(() => thread.rename('   ')).toThrowError();
  });

  it('5) archive() imposta isArchived = true', () => {
    const thread = Thread.create({ title: 'Ok' });

    thread.archive();

    expect(thread.isArchived()).toBe(true);
  });

  it('6) archive() chiamato due volte ⇒ nessun errore', () => {
    const thread = Thread.create({ title: 'Ok' });

    expect(() => {
      thread.archive();
      thread.archive();
    }).not.toThrow();
  });

  it('7) createdAt non mutabile (getter ritorna copia)', () => {
    const thread = Thread.create({ title: 'Ok' });
    const createdAt = thread.getCreatedAt();

    createdAt.setFullYear(1999);

    expect(thread.getCreatedAt().getFullYear()).not.toBe(1999);
  });

  it('8) updatedAt ≥ createdAt', () => {
    const thread = Thread.create({ title: 'Ok' });

    expect(thread.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(thread.getCreatedAt().getTime());
  });
});

