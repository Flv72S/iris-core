import { describe, it, expect } from 'vitest';
import type { ThreadId, MessageId } from '../../queries/read-models/ids';
import type { ThreadWithMessagesReadModel } from '../../queries/read-models/ThreadWithMessagesReadModel';
import type { MessageWithThreadReadModel } from '../../queries/read-models/MessageWithThreadReadModel';
import type { ThreadReadProjection } from '../ThreadReadProjection';
import type { MessageReadProjection } from '../MessageReadProjection';

type ExpectTrue<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

describe('Core Projections — interfaces (type contract)', () => {
  it('ThreadReadProjection espone solo projectThreadWithMessages con firma corretta', () => {
    type Methods = keyof ThreadReadProjection;
    type Expected = 'projectThreadWithMessages';
    type _assertMethods = ExpectTrue<Equal<Methods, Expected>>;

    type Ret = ReturnType<ThreadReadProjection['projectThreadWithMessages']>;
    type ExpectedRet = Promise<ThreadWithMessagesReadModel | null>;
    type _assertRet = ExpectTrue<Equal<Ret, ExpectedRet>>;

    type Param = Parameters<ThreadReadProjection['projectThreadWithMessages']>[0];
    type _assertParam = ExpectTrue<Equal<Param, ThreadId>>;

    expect(true).toBe(true);
  });

  it('MessageReadProjection espone solo projectMessageWithThread con firma corretta', () => {
    type Methods = keyof MessageReadProjection;
    type Expected = 'projectMessageWithThread';
    type _assertMethods = ExpectTrue<Equal<Methods, Expected>>;

    type Ret = ReturnType<MessageReadProjection['projectMessageWithThread']>;
    type ExpectedRet = Promise<MessageWithThreadReadModel | null>;
    type _assertRet = ExpectTrue<Equal<Ret, ExpectedRet>>;

    type Param = Parameters<MessageReadProjection['projectMessageWithThread']>[0];
    type _assertParam = ExpectTrue<Equal<Param, MessageId>>;

    expect(true).toBe(true);
  });
});

