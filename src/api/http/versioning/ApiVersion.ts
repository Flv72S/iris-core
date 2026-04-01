/**
 * API Version — rappresentazione tipizzata e immutabile
 * Microstep 5.1.1 — API Versioning (Read & Write)
 */

const SUPPORTED_VERSIONS = ['v1', 'v2'] as const;
export type ApiVersionId = (typeof SUPPORTED_VERSIONS)[number];

const DEFAULT_VERSION: ApiVersionId = 'v1';

/**
 * Rappresenta una versione API.
 * Immutabile, confrontabile, serializzabile.
 */
export class ApiVersion {
  private constructor(private readonly _id: ApiVersionId) {}

  get id(): ApiVersionId {
    return this._id;
  }

  /** Serializza per header o log. */
  toString(): string {
    return this._id;
  }

  equals(other: ApiVersion): boolean {
    return this._id === other._id;
  }

  static v1(): ApiVersion {
    return new ApiVersion('v1');
  }

  static v2(): ApiVersion {
    return new ApiVersion('v2');
  }

  /** Versione di default backward-compatible. */
  static default(): ApiVersion {
    return new ApiVersion(DEFAULT_VERSION);
  }

  /**
   * Crea ApiVersion da stringa.
   * @param s Es. "v1", "v2"
   * @returns ApiVersion se supportata, altrimenti default (backward-compatible)
   */
  static fromString(s: string): ApiVersion {
    const normalized = s.trim().toLowerCase();
    if (SUPPORTED_VERSIONS.includes(normalized as ApiVersionId)) {
      return new ApiVersion(normalized as ApiVersionId);
    }
    return ApiVersion.default();
  }

  /**
   * Crea ApiVersion da stringa in modalità strict.
   * @param s Es. "v1", "v2"
   * @throws Error se versione non supportata
   */
  static fromStringStrict(s: string): ApiVersion {
    const normalized = s.trim().toLowerCase();
    if (SUPPORTED_VERSIONS.includes(normalized as ApiVersionId)) {
      return new ApiVersion(normalized as ApiVersionId);
    }
    throw new Error(`Unsupported API version: ${s}`);
  }

  /**
   * Valida se una stringa è versione supportata.
   */
  static isSupported(s: string): boolean {
    return SUPPORTED_VERSIONS.includes(s.trim().toLowerCase() as ApiVersionId);
  }

  static getSupportedVersions(): readonly ApiVersionId[] {
    return SUPPORTED_VERSIONS;
  }
}
