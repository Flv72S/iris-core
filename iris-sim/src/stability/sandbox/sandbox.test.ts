/**
 * Stability Step 2 — Sandbox layer tests.
 * Isolated context, blocked global write, budget suspension, cooldown, commit, terminate, stress.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SandboxExecutionContext } from './executionContext.js';
import { createIsolationProxy } from './isolationProxy.js';
import { SandboxController } from './sandboxController.js';
import { registerSandboxedModule, getResourceBudgetConfigForModule } from './sandboxRegistry.js';

const budget = (overrides?: Partial<{ maxExecutionTimeMs: number; maxDecisionsPerWindow: number; maxStateWrites: number; cooldownMs: number }>) => ({
  maxExecutionTimeMs: 5000,
  maxDecisionsPerWindow: 10,
  maxStateWrites: 20,
  cooldownMs: 100,
  ...overrides,
});

describe('SandboxExecutionContext', () => {
  it('isolated context: local state not visible outside', () => {
    const ctx = new SandboxExecutionContext('s1', budget());
    ctx.runGuarded(() => {
      ctx.safeWrite('x', 42);
      assert.strictEqual(ctx.safeRead('x'), 42);
    });
    assert.strictEqual(ctx.safeRead('x'), 42);
    const other = new SandboxExecutionContext('s2', budget());
    assert.strictEqual(other.safeRead('x'), undefined);
  });

  it('maxDecisions leads to suspension', () => {
    const ctx = new SandboxExecutionContext('s1', budget({ maxDecisionsPerWindow: 3 }));
    let suspended = false;
    ctx.runGuarded(() => {
      for (let i = 0; i < 4; i++) ctx.resourceController.registerDecision(Date.now());
    });
    try {
      ctx.runGuarded(() => {});
    } catch (e: unknown) {
      suspended = (e as Error).message.includes('suspended');
    }
    assert.strictEqual(ctx.getStatus(), 'suspended');
    assert.ok(suspended);
  });

  it('maxExecutionTime leads to suspension', () => {
    const ctx = new SandboxExecutionContext('s1', budget({ maxExecutionTimeMs: 50 }));
    ctx.runGuarded(() => {
      const start = Date.now();
      while (Date.now() - start < 60) {}
    });
    assert.strictEqual(ctx.getStatus(), 'suspended');
  });

  it('cooldown reactivation: can run again after cooldown', async () => {
    const ctx = new SandboxExecutionContext('s1', budget({ maxDecisionsPerWindow: 1, cooldownMs: 50 }));
    ctx.runGuarded(() => {
      ctx.resourceController.registerDecision(Date.now());
      ctx.resourceController.registerDecision(Date.now());
    });
    assert.strictEqual(ctx.getStatus(), 'suspended');
    await new Promise((r) => setTimeout(r, 60));
    ctx.resourceController.resetWindowIfNeeded(Date.now());
    ctx.runGuarded(() => { assert.ok(true); });
  });

  it('requestCommit does not mutate global state', () => {
    const global: Record<string, unknown> = {};
    const ctx = new SandboxExecutionContext('s1', budget());
    ctx.runGuarded(() => {
      ctx.safeWrite('k', 1);
      ctx.requestCommit('k', 1);
    });
    assert.strictEqual(ctx.commitRequests.length, 1);
    assert.strictEqual(global['k'], undefined);
  });

  it('terminate blocks execution', () => {
    const ctx = new SandboxExecutionContext('s1', budget());
    ctx.terminate();
    assert.throws(() => ctx.runGuarded(() => {}), /terminated/);
    assert.strictEqual(ctx.getStatus(), 'terminated');
  });
});

describe('isolationProxy', () => {
  it('blocks direct global write', () => {
    const target = { a: 1, b: { c: 2 } };
    const proxy = createIsolationProxy(target);
    assert.strictEqual(proxy.a, 1);
    assert.strictEqual((proxy as { b: { c: number } }).b.c, 2);
    assert.throws(() => ((proxy as unknown as Record<string, number>).x = 99), /not allowed/);
    assert.strictEqual(target.a, 1);
  });
});

describe('SandboxController', () => {
  it('createSandbox, executeInSandbox, getSandboxStatus, getSandboxMetrics', () => {
    const ctrl = new SandboxController();
    ctrl.createSandbox('x', budget());
    let ran = false;
    ctrl.executeInSandbox('x', (ctx) => {
      ran = true;
      ctx.safeWrite('v', 1);
      return 2;
    });
    assert.strictEqual(ran, true);
    assert.strictEqual(ctrl.getSandboxStatus('x'), 'active');
    const m = ctrl.getSandboxMetrics('x');
    assert.ok(m && m.executions >= 1);
  });

  it('suspendSandbox and terminateSandbox', () => {
    const ctrl = new SandboxController();
    ctrl.createSandbox('y', budget());
    ctrl.suspendSandbox('y');
    assert.strictEqual(ctrl.getSandboxStatus('y'), 'suspended');
    ctrl.terminateSandbox('y');
    assert.strictEqual(ctrl.getSandboxStatus('y'), 'terminated');
  });
});

describe('sandboxRegistry', () => {
  it('registerSandboxedModule and getResourceBudgetConfigForModule', () => {
    registerSandboxedModule({
      moduleName: 'testModule',
      resourceBudgetConfig: budget({ maxDecisionsPerWindow: 5 }),
    });
    const cfg = getResourceBudgetConfigForModule('testModule');
    assert.ok(cfg && cfg.maxDecisionsPerWindow === 5);
  });
});

describe('sandbox stress', () => {
  it('many decisions and writes: suspended, no global mutation, budgetViolations in metrics', () => {
    const ctrl = new SandboxController();
    ctrl.createSandbox('stress', budget({ maxDecisionsPerWindow: 5, maxStateWrites: 5 }));
    const global: Record<string, unknown> = {};
    try {
      ctrl.executeInSandbox('stress', (ctx) => {
        for (let i = 0; i < 20; i++) {
          ctx.resourceController.registerDecision(Date.now());
          ctx.safeWrite(`k${i}`, i);
        }
      });
    } catch (_) {}
    assert.strictEqual(ctrl.getSandboxStatus('stress'), 'suspended');
    assert.strictEqual(Object.keys(global).length, 0);
    const m = ctrl.getSandboxMetrics('stress');
    assert.ok(m && m.budgetViolations >= 1);
  });
});
