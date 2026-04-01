import { describe, it, expect } from 'vitest';
import type { ThreadQueryRepository } from '../ThreadQueryRepository';
import type { MessageQueryRepository } from '../MessageQueryRepository';
import type { ThreadReadModel } from '../read-models/ThreadReadModel';
import type { MessageReadModel } from '../read-models/MessageReadModel';

type ExpectTrue<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type HasAnyFunctionProps<T> = {
  [K in keyof T]-?: T[K] extends (...args: any[]) => any ? true : false;
}[keyof T] extends true
  ? true
  : false;

describe('Core Queries — ports & read-models (type contract)', () => {
  it('ThreadQueryRepository espone solo metodi read-only richiesti', () => {
    type Methods = keyof ThreadQueryRepository;
    type Expected = 'findAll' | 'findById';
    type _assert = ExpectTrue<Equal<Methods, Expected>>;
    expect(true).toBe(true);
  });

  it('MessageQueryRepository espone solo metodi read-only richiesti', () => {
    type Methods = keyof MessageQueryRepository;
    type Expected = 'findByThreadId' | 'findById';
    type _assert = ExpectTrue<Equal<Methods, Expected>>;
    expect(true).toBe(true);
  });

  it('Read models non contengono funzioni/metodi', () => {
    type _threadHasFns = HasAnyFunctionProps<ThreadReadModel>;
    type _msgHasFns = HasAnyFunctionProps<MessageReadModel>;
    type _assertThread = ExpectTrue<Equal<_threadHasFns, false>>;
    type _assertMsg = ExpectTrue<Equal<_msgHasFns, false>>;
    expect(true).toBe(true);
  });
});

