export interface SeededRandom {
  readonly seed: number;
  nextU32(): number;
  nextFloat(): number;
  nextInt(minInclusive: number, maxExclusive: number): number;
  chance(probability: number): boolean;
  pickOne<T>(items: readonly T[]): T;
  shuffleInPlace<T>(items: T[]): T[];
}

export function createSeededRandom(seed: number): SeededRandom {
  let state = seed >>> 0;
  const nextU32 = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
  const nextFloat = (): number => nextU32() / 0x1_0000_0000;
  const nextInt = (minInclusive: number, maxExclusive: number): number => {
    if (!Number.isInteger(minInclusive) || !Number.isInteger(maxExclusive) || maxExclusive <= minInclusive) {
      throw new Error('createSeededRandom.nextInt: invalid bounds');
    }
    const span = maxExclusive - minInclusive;
    return minInclusive + (nextU32() % span);
  };
  const chance = (probability: number): boolean => {
    if (probability <= 0) return false;
    if (probability >= 1) return true;
    return nextFloat() < probability;
  };
  const pickOne = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('createSeededRandom.pickOne: empty array');
    return items[nextInt(0, items.length)]!;
  };
  const shuffleInPlace = <T>(items: T[]): T[] => {
    for (let i = items.length - 1; i > 0; i--) {
      const j = nextInt(0, i + 1);
      [items[i], items[j]] = [items[j]!, items[i]!];
    }
    return items;
  };

  return {
    get seed() {
      return state >>> 0;
    },
    nextU32,
    nextFloat,
    nextInt,
    chance,
    pickOne,
    shuffleInPlace,
  };
}
