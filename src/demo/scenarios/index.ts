/**
 * Demo scenarios — export e lista per selector.
 */

export type { DemoScenario } from './focus';
export { focusScenario } from './focus';
export { waitingScenario } from './waiting';
export { blockedScenario } from './blocked';

import type { DemoScenario } from './focus';
import { focusScenario } from './focus';
import { waitingScenario } from './waiting';
import { blockedScenario } from './blocked';

export const allScenarios: readonly DemoScenario[] = Object.freeze([
  focusScenario,
  waitingScenario,
  blockedScenario,
]);
