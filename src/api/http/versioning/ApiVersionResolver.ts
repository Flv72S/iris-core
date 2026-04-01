/**
 * API Version Resolver — risoluzione centralizzata della versione
 * Microstep 5.1.1 — API Versioning (Read & Write)
 *
 * Priorità: 1) URL, 2) Header, 3) Default
 */

import { ApiVersion } from './ApiVersion';

const VERSION_HEADER = 'x-api-version';

/** Input minimo per la risoluzione (framework-agnostico). */
export interface VersionResolutionInput {
  readonly url: string;
  readonly headers?: Record<string, string | undefined>;
}

const URL_VERSION_PATTERN = /\/api\/(v\d+)(?:\/|$)/i;

/**
 * Risolve la versione API da una richiesta HTTP.
 * Nessuna dipendenza dal dominio. Riutilizzabile per Read e Write API.
 */
export class ApiVersionResolver {
  private readonly defaultVersion: ApiVersion;

  constructor(defaultVersion: ApiVersion = ApiVersion.default()) {
    this.defaultVersion = defaultVersion;
  }

  /**
   * Risolve la versione secondo priorità: URL → Header → Default.
   */
  resolve(input: VersionResolutionInput): ApiVersion {
    const fromUrl = this.resolveFromUrl(input.url);
    if (fromUrl !== null) {
      return fromUrl;
    }

    const fromHeader = this.resolveFromHeader(input.headers);
    if (fromHeader !== null) {
      return fromHeader;
    }

    return this.defaultVersion;
  }

  private resolveFromUrl(url: string): ApiVersion | null {
    const match = url.match(URL_VERSION_PATTERN);
    if (!match) return null;
    const raw = match[1];
    if (ApiVersion.isSupported(raw)) {
      return ApiVersion.fromString(raw);
    }
    return null;
  }

  private resolveFromHeader(headers?: Record<string, string | undefined>): ApiVersion | null {
    if (!headers) return null;
    const value = headers[VERSION_HEADER] ?? headers['X-API-Version'];
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (ApiVersion.isSupported(trimmed)) {
      return ApiVersion.fromString(trimmed);
    }
    return null;
  }
}
