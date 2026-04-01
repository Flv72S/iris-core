/**
 * Stability Step 2 — Read-only isolation proxy.
 * Throws on write/mutation; logs write attempts.
 */

const WRITE_ATTEMPT_LOG_PREFIX = '[Sandbox] Write attempt blocked:';

export function createIsolationProxy<T extends object>(targetObject: T): T {
  return new Proxy(targetObject, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (value !== null && typeof value === 'object') {
        return createIsolationProxy(value);
      }
      return value;
    },
    set(_target, prop, _value) {
      console.warn(WRITE_ATTEMPT_LOG_PREFIX, String(prop));
      throw new Error(`Sandbox: write to "${String(prop)}" is not allowed`);
    },
    defineProperty(_target, prop) {
      console.warn(WRITE_ATTEMPT_LOG_PREFIX, String(prop));
      throw new Error(`Sandbox: defineProperty "${String(prop)}" is not allowed`);
    },
    deleteProperty(_target, prop) {
      console.warn(WRITE_ATTEMPT_LOG_PREFIX, 'delete', String(prop));
      throw new Error(`Sandbox: delete "${String(prop)}" is not allowed`);
    },
  }) as T;
}
