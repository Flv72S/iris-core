/** 16F.5.FINAL.CERTIFICATION — deep freeze for SDK-visible replay rows, exports, and validation reports (best-effort). */
export function deepFreezeSdk<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Object.isFrozen(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      deepFreezeSdk(value[i]);
    }
    return Object.freeze(value);
  }
  const o = value as Record<string, unknown>;
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (v !== null && typeof v === 'object') {
      deepFreezeSdk(v);
    }
  }
  return Object.freeze(value);
}
