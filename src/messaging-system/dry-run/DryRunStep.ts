/**
 * DryRunStep - C.4.D
 * Step simulato. MUST NOT: adapterId, channelId, endpoint, retry, execute, dispatch.
 */

import type { DryRunActionType } from './DryRunActionType';

export interface DryRunStep {
  readonly stepId: string;
  readonly actionType: DryRunActionType;
  readonly description: string;
  readonly relatedPlanId: string;
  readonly warnings?: readonly string[];
  readonly requiresConfirmation?: boolean;
}
