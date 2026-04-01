import { stableStringify } from '../../logging/audit';

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export function assertNoInputMutation<T>(before: T, after: T): void {
  if (stableStringify(before) !== stableStringify(after)) {
    throw new Error('runtime invariant violated: input mutated');
  }
}

export function assertSerializable(value: unknown): void {
  try {
    JSON.stringify(value);
  } catch {
    throw new Error('runtime invariant violated: state not serializable');
  }
}

export function assertDeterministicSerialization(value: unknown): void {
  const once = stableStringify(value);
  const twice = stableStringify(deepClone(value));
  if (once !== twice) {
    throw new Error('runtime invariant violated: non-deterministic serialization');
  }
}
