/**
 * Preview Config
 *
 * Configurazione runtime per Preview Mode (STEP 6B).
 * Legge da env; usata solo su HTTP edge. Disattivabile via config.
 *
 * Riferimenti: IRIS_STEP6B_Preview_Access_Model.md
 */

export interface PreviewConfig {
  readonly previewMode: boolean;
  readonly accessToken: string;
  readonly rateLimitRpm: number;
}

const PREVIEW_PUBLIC_PATHS = ['/health', '/ready'] as const;

export function isPreviewPublicPath(pathname: string): boolean {
  return PREVIEW_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Legge config preview da env. Non valida (validazione a bootstrap). */
export function getPreviewConfigFromEnv(): PreviewConfig {
  const previewMode = process.env.PREVIEW_MODE === 'true';
  const accessToken = process.env.PREVIEW_ACCESS_TOKEN ?? '';
  const rateLimitRpm = Math.max(
    1,
    parseInt(process.env.PREVIEW_RATE_LIMIT_RPM ?? '60', 10) || 60
  );
  return { previewMode, accessToken, rateLimitRpm };
}

/** Valida preview config. Fail-fast se PREVIEW_MODE=true e token mancante. */
export function validatePreviewConfig(config: PreviewConfig): void {
  if (!config.previewMode) return;
  if (!config.accessToken || config.accessToken.length < 1) {
    throw new Error(
      'Config validation failed: PREVIEW_ACCESS_TOKEN is required when PREVIEW_MODE=true'
    );
  }
}
