/**
 * Microstep 14L — AI Covenant Monitoring Platform. Registry.
 */

import type { Covenant } from './covenant_types.js';
import { CovenantError, CovenantErrorCode } from './covenant_errors.js';

export class CovenantRegistry {
  private readonly covenants = new Map<string, Covenant>();

  register(covenant: Covenant): void {
    if (this.covenants.has(covenant.id)) {
      throw new CovenantError(CovenantErrorCode.REGISTRY_DUPLICATE, `Covenant id already registered: ${covenant.id}`);
    }
    this.covenants.set(covenant.id, covenant);
  }

  getAll(): Covenant[] {
    return Array.from(this.covenants.values());
  }

  get(id: string): Covenant | undefined {
    return this.covenants.get(id);
  }
}
