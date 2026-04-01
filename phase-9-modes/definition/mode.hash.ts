import type { ModeDefinition } from './mode.types';

const KEYS: (keyof Omit<ModeDefinition, 'deterministicHash'>)[] = ['id', 'description', 'affects', 'forbids'];

function hashString(s: string): string {
  if (typeof process !== 'undefined' && process.versions?.node) {
    const crypto = require('node:crypto');
    return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
  }
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function stableStringify(mode: Omit<ModeDefinition, 'deterministicHash'>): string {
  return KEYS.map((k) => (Array.isArray(mode[k]) ? JSON.stringify([...(mode[k] as string[])].sort()) : JSON.stringify(mode[k]))).join('\n');
}

export function computeModeHash(mode: Omit<ModeDefinition, 'deterministicHash'>): string {
  return hashString(stableStringify(mode));
}
