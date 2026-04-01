export const globalCleanups: Array<() => Promise<void> | void> = [];

export function registerCleanup(fn: () => Promise<void> | void): void {
  globalCleanups.push(fn);
}

export async function runGlobalCleanups(): Promise<void> {
  while (globalCleanups.length > 0) {
    const fn = globalCleanups.pop();
    if (!fn) continue;
    await fn();
  }
}
