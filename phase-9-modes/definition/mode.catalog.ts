/**
 * Phase 9.1 — Immutable mode catalog
 */

import type { ModeDefinition } from './mode.types';
import type { BehaviorMode } from './mode.types';
import { MODE_CONTRACT } from './mode.contract';

const ORDER: BehaviorMode[] = ['DEFAULT', 'FOCUS', 'WELLBEING'];

export const MODE_CATALOG: readonly ModeDefinition[] = Object.freeze(
  ORDER.map((id) => MODE_CONTRACT[id])
);
