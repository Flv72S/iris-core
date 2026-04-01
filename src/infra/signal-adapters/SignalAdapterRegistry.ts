/**
 * SignalAdapterRegistry — Invoca read() su tutti gli adapter abilitati,
 * concatena i risultati. NON ordina, deduplica o filtra. Output frozen.
 */

import type { SignalAdapter } from './SignalAdapter';
import type { SignalEvent } from './SignalEvent';
import { isSignalAdapterEnabled, type SignalAdapterRegistry as KillSwitchRegistry } from './SignalAdapterKillSwitch';

export class SignalAdapterRegistry {
  private readonly adapters: readonly SignalAdapter[];
  private readonly killSwitch: KillSwitchRegistry | undefined;

  constructor(
    adapters: readonly SignalAdapter[],
    killSwitch?: KillSwitchRegistry
  ) {
    this.adapters = adapters;
    this.killSwitch = killSwitch;
  }

  async readAll(): Promise<readonly SignalEvent[]> {
    const results: SignalEvent[] = [];
    for (const adapter of this.adapters) {
      if (this.killSwitch !== undefined && !isSignalAdapterEnabled(this.killSwitch, adapter.id)) {
        continue;
      }
      const events = await adapter.read();
      for (let i = 0; i < events.length; i++) {
        results.push(events[i]);
      }
    }
    return Object.freeze(results);
  }
}
