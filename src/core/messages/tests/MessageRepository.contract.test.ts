import { describe, it, expect } from 'vitest';
import type { MessageRepository } from '../MessageRepository';

type ExpectTrue<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

describe('Core Messages — MessageRepository (type contract)', () => {
  it('espone esattamente i metodi richiesti', () => {
    type Methods = keyof MessageRepository;
    type Expected = 'save' | 'findByThreadId' | 'findById';
    type _assert = ExpectTrue<Equal<Methods, Expected>>;

    expect(true).toBe(true);
  });
});

