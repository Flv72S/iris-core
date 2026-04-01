/**
 * Stability Step 2 — Sandbox controller.
 * Maps id -> ExecutionContext, id -> ResourceBudgetController; create/execute/suspend/terminate.
 */

import type { ResourceBudgetConfig } from './sandboxTypes.js';
import { SandboxExecutionContext } from './executionContext.js';
import { ResourceBudgetController } from './resourceBudget.js';
import type { SandboxMetrics } from './sandboxTypes.js';

export class SandboxController {
  private readonly _contexts = new Map<string, SandboxExecutionContext>();
  private readonly _budgets = new Map<string, ResourceBudgetController>();

  createSandbox(id: string, config: ResourceBudgetConfig): SandboxExecutionContext {
    if (this._contexts.has(id)) {
      throw new Error(`Sandbox already exists: ${id}`);
    }
    const ctx = new SandboxExecutionContext(id, config);
    this._contexts.set(id, ctx);
    this._budgets.set(id, ctx.resourceController);
    return ctx;
  }

  executeInSandbox<T>(id: string, fn: (ctx: SandboxExecutionContext) => T): T {
    const ctx = this._contexts.get(id);
    if (!ctx) throw new Error(`Sandbox not found: ${id}`);
    return ctx.runGuarded(() => fn(ctx));
  }

  suspendSandbox(id: string): void {
    const ctx = this._contexts.get(id);
    if (ctx) ctx.suspend();
  }

  terminateSandbox(id: string): void {
    const ctx = this._contexts.get(id);
    if (ctx) ctx.terminate();
  }

  getSandboxStatus(id: string): string | null {
    const ctx = this._contexts.get(id);
    return ctx ? ctx.getStatus() : null;
  }

  getSandboxMetrics(id: string): SandboxMetrics | null {
    const budget = this._budgets.get(id);
    return budget ? budget.getMetrics() : null;
  }
}
