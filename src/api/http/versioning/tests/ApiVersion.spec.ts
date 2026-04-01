/**
 * ApiVersion — unit test
 * Microstep 5.1.1 — API Versioning
 */

import { describe, it, expect } from 'vitest';
import { ApiVersion } from '../ApiVersion';

describe('ApiVersion', () => {
  it('creazione valida di v1 e v2', () => {
    expect(ApiVersion.v1().id).toBe('v1');
    expect(ApiVersion.v2().id).toBe('v2');
  });

  it('default version = v1', () => {
    expect(ApiVersion.default().id).toBe('v1');
  });

  it('parsing corretto da stringa "v1" e "v2"', () => {
    expect(ApiVersion.fromString('v1').id).toBe('v1');
    expect(ApiVersion.fromString('v2').id).toBe('v2');
    expect(ApiVersion.fromString(' V2 ').id).toBe('v2');
  });

  it('versione non supportata -> fromString fallback a default', () => {
    expect(ApiVersion.fromString('v99').id).toBe('v1');
  });

  it('versione non supportata -> fromStringStrict lancia errore', () => {
    expect(() => ApiVersion.fromStringStrict('v99')).toThrow('Unsupported API version');
  });

  it('confronto tra versioni con equals', () => {
    expect(ApiVersion.v1().equals(ApiVersion.v1())).toBe(true);
    expect(ApiVersion.v2().equals(ApiVersion.v2())).toBe(true);
    expect(ApiVersion.v1().equals(ApiVersion.v2())).toBe(false);
  });

  it('toString serializza correttamente', () => {
    expect(ApiVersion.v1().toString()).toBe('v1');
  });
});
