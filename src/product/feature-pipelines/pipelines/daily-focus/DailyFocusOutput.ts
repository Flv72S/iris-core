/**
 * DailyFocusOutput — C.7
 * Output UX per Daily Focus. Nessuna pianificazione task.
 */

export type FocusLevel = 'low' | 'medium' | 'high';

export interface DailyFocusOutput {
  readonly focusLevel: FocusLevel;
  readonly focusReason: string;
  readonly suggestedLens: 'focus' | 'neutral';
  readonly derivedAt: number;
}
