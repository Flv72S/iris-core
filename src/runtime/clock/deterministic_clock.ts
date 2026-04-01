export interface DeterministicClock {
  now(): number;
}

export function createDeterministicClock(deterministicMode: boolean): DeterministicClock {
  if (!deterministicMode) {
    return Object.freeze({
      now: () => Date.now(),
    });
  }
  let tick = 0;
  return Object.freeze({
    now: () => {
      tick += 1;
      return tick;
    },
  });
}
