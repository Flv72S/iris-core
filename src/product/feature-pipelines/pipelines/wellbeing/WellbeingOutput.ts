/**
 * WellbeingOutput — C.7
 * Output UX per Digital Wellbeing. Niente nudging automatico.
 */

export interface WellbeingOutput {
  readonly status: 'ok' | 'attention';
  readonly explanation: string;
  readonly derivedAt: number;
}
