import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import type { ThreadWithMessagesReadModel } from '../read-models/ThreadWithMessagesReadModel';
import type { MessageWithThreadReadModel } from '../read-models/MessageWithThreadReadModel';

type ExpectTrue<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type HasAnyFunctionProps<T> = {
  [K in keyof T]-?: T[K] extends (...args: any[]) => any ? true : false;
}[keyof T] extends true
  ? true
  : false;

type ContainsDate<T> = T extends Date
  ? true
  : T extends (...args: any[]) => any
    ? false
    : T extends readonly (infer I)[]
      ? ContainsDate<I>
      : T extends object
        ? {
            [K in keyof T]-?: ContainsDate<T[K]>;
          }[keyof T] extends true
          ? true
          : false
        : false;

describe('Core Queries — denormalized read models', () => {
  it('ThreadWithMessagesReadModel: shape esatto + serializzabile (type-level)', () => {
    type Keys = keyof ThreadWithMessagesReadModel;
    type ExpectedKeys =
      | 'id'
      | 'title'
      | 'archived'
      | 'createdAt'
      | 'updatedAt'
      | 'messages';
    type _assertKeys = ExpectTrue<Equal<Keys, ExpectedKeys>>;

    type Msg = ThreadWithMessagesReadModel['messages'][number];
    type MsgKeys = keyof Msg;
    type ExpectedMsgKeys = 'id' | 'author' | 'content' | 'createdAt';
    type _assertMsgKeys = ExpectTrue<Equal<MsgKeys, ExpectedMsgKeys>>;

    type _assertNoFns = ExpectTrue<Equal<HasAnyFunctionProps<ThreadWithMessagesReadModel>, false>>;
    type _assertNoDate = ExpectTrue<Equal<ContainsDate<ThreadWithMessagesReadModel>, false>>;

    expect(true).toBe(true);
  });

  it('MessageWithThreadReadModel: shape esatto + serializzabile (type-level)', () => {
    type Keys = keyof MessageWithThreadReadModel;
    type ExpectedKeys = 'id' | 'content' | 'author' | 'createdAt' | 'thread';
    type _assertKeys = ExpectTrue<Equal<Keys, ExpectedKeys>>;

    type Thread = MessageWithThreadReadModel['thread'];
    type ThreadKeys = keyof Thread;
    type ExpectedThreadKeys = 'id' | 'title' | 'archived';
    type _assertThreadKeys = ExpectTrue<Equal<ThreadKeys, ExpectedThreadKeys>>;

    type _assertNoFns = ExpectTrue<Equal<HasAnyFunctionProps<MessageWithThreadReadModel>, false>>;
    type _assertNoDate = ExpectTrue<Equal<ContainsDate<MessageWithThreadReadModel>, false>>;

    expect(true).toBe(true);
  });

  it('Isolamento: i denormalized read models non devono importare nulla', () => {
    const files = [
      'src/core/queries/read-models/ThreadWithMessagesReadModel.ts',
      'src/core/queries/read-models/MessageWithThreadReadModel.ts',
    ];

    const violations: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      if (/\bfrom\s+['"][^'"]+['"]/.test(content)) {
        violations.push(`${file}: contiene import (vietato)`);
      }
      // Non deve esistere alcun uso del tipo Date (commenti ok).
      if (/:\s*Date\b/.test(content) || /\bnew\s+Date\b/.test(content) || /\binstanceof\s+Date\b/.test(content)) {
        violations.push(`${file}: usa Date (vietato)`);
      }
    }

    expect(violations).toEqual([]);
  });
});

