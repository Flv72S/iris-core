/**
 * Plugin Metadata - dichiarazione comune
 * Microstep 5.3.1 / 5.4.1 (capabilities)
 */

import type { PluginCapabilitySet } from './capability';

export type PluginKind = 'read' | 'write';

export interface PluginMetadata {
  readonly id: string;
  readonly version: string;
  readonly kind: PluginKind;
  readonly description?: string;
  /** Capability dichiarate. Default []. Non dichiarata = mai utilizzabile. */
  readonly capabilities?: PluginCapabilitySet;
}
