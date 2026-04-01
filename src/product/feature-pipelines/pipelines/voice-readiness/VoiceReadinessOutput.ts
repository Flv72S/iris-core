/**
 * VoiceReadinessOutput — C.7
 * Output UX per Voice Readiness.
 */

export interface VoiceReadinessOutput {
  readonly ready: boolean;
  readonly reason: string;
  readonly derivedAt: number;
}
