/**
 * UserPreferenceContext — Contesto per valutare una regola di preferenza.
 */

import type { ProductMode } from '../../../product/orchestration/ProductMode';

export type UserPreferenceContext = {
  readonly featureId: string;
  readonly productMode: ProductMode;
  /** Set when the feature may send a notification; NotificationConsentRule checks notifications.enabled */
  readonly maySendNotification?: boolean;
};
