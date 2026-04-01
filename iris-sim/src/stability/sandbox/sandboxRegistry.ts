/**
 * Stability Step 2 — Sandbox module registry.
 * registerSandboxedModule({ moduleName, resourceBudgetConfig }); no wiring to real modules.
 */

import type { SandboxedModuleRegistration, ResourceBudgetConfig } from './sandboxTypes.js';

const _registry: SandboxedModuleRegistration[] = [];

export function registerSandboxedModule(registration: SandboxedModuleRegistration): void {
  _registry.push(Object.freeze({ ...registration }));
}

export function getSandboxedModules(): readonly SandboxedModuleRegistration[] {
  return _registry;
}

export function getResourceBudgetConfigForModule(moduleName: string): ResourceBudgetConfig | null {
  const reg = _registry.find((r) => r.moduleName === moduleName);
  return reg ? reg.resourceBudgetConfig : null;
}
