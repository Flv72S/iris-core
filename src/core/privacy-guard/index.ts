/**
 * Privacy Guard — 6.2.3
 *
 * Intercetta eventi prima della Behavioral Memory.
 * Ammette o scarta; nessuna modifica al dominio.
 */

export type { PrivacyDecision } from './PrivacyDecision';
export type { PrivacyContext } from './PrivacyContext';
export type { PrivacyPolicy } from './PrivacyPolicy';
export type { ClearableForPrivacy } from './ClearableForPrivacy';
export { UserOptOutPolicy } from './UserOptOutPolicy';
export { ContextIsolationPolicy } from './ContextIsolationPolicy';
export { PrivacyGuard } from './PrivacyGuard';
export { NoOpPrivacyGuard } from './NoOpPrivacyGuard';
export { PrivacyDataClearer } from './PrivacyDataClearer';
