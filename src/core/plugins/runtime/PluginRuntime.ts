/**
 * Plugin Runtime - orchestrazione lifecycle e dispatch hook
 * Microstep 5.3.2
 *
 * Nessuna esecuzione plugin fuori dal runtime. Isolamento fallimenti per plugin.
 * Hook invocati in ordine deterministico (per pluginId).
 */

import type { PluginContext, PluginLogger } from '../PluginContext';
import type { ReadPlugin } from '../ReadPlugin';
import type { WritePlugin } from '../WritePlugin';
import type { PluginGovernance, PluginActivationContext } from '../governance';
import type { CapabilityGovernance } from '../capability';
import type { TenantGovernance } from '../tenant';
import type { SecurityAuditDispatcher } from '../audit/SecurityAuditDispatcher';
import { createSecurityAuditEvent } from '../audit/SecurityAuditEvent';
import { PluginRegistry, type RegisteredPlugin } from './PluginRegistry';
import { PluginSandbox } from './PluginSandbox';
import type { PluginExecutionError } from './PluginExecutionError';

function defaultLogger(): PluginLogger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

const noopLogger: PluginLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

function noopClock(): { now(): number } {
  return { now: () => 0 };
}

function createContext(
  plugin: RegisteredPlugin,
  logger: PluginLogger,
  clock: { now(): number },
  activationContext: PluginActivationContext | undefined,
  capabilityGovernance: CapabilityGovernance | undefined,
  auditDispatcher: SecurityAuditDispatcher | undefined,
  auditAllowDecisions: boolean
): PluginContext {
  let actualLogger = logger;
  let actualClock = clock;
  if (capabilityGovernance && activationContext) {
    const loggerDecision = capabilityGovernance.canUseCapability(
      plugin,
      'runtime:logger',
      activationContext
    );
    if (auditDispatcher) {
      if (!loggerDecision.allowed) {
        auditDispatcher.dispatch(
          createSecurityAuditEvent({
            timestamp: activationContext.timestamp,
            pluginId: plugin.metadata.id,
            pluginVersion: plugin.metadata.version,
            decision: 'DENY',
            layer: 'CAPABILITY',
            reason: loggerDecision.reason,
            capability: 'runtime:logger',
            tenantId: activationContext.tenant?.tenantId,
            environment: activationContext.environment,
            apiVersion: activationContext.apiVersion,
          })
        );
      } else if (auditAllowDecisions) {
        auditDispatcher.dispatch(
          createSecurityAuditEvent({
            timestamp: activationContext.timestamp,
            pluginId: plugin.metadata.id,
            pluginVersion: plugin.metadata.version,
            decision: 'ALLOW',
            layer: 'CAPABILITY',
            capability: 'runtime:logger',
            tenantId: activationContext.tenant?.tenantId,
            environment: activationContext.environment,
            apiVersion: activationContext.apiVersion,
          })
        );
      }
    }
    if (!loggerDecision.allowed) actualLogger = noopLogger;

    const clockDecision = capabilityGovernance.canUseCapability(
      plugin,
      'runtime:clock',
      activationContext
    );
    if (auditDispatcher) {
      if (!clockDecision.allowed) {
        auditDispatcher.dispatch(
          createSecurityAuditEvent({
            timestamp: activationContext.timestamp,
            pluginId: plugin.metadata.id,
            pluginVersion: plugin.metadata.version,
            decision: 'DENY',
            layer: 'CAPABILITY',
            reason: clockDecision.reason,
            capability: 'runtime:clock',
            tenantId: activationContext.tenant?.tenantId,
            environment: activationContext.environment,
            apiVersion: activationContext.apiVersion,
          })
        );
      } else if (auditAllowDecisions) {
        auditDispatcher.dispatch(
          createSecurityAuditEvent({
            timestamp: activationContext.timestamp,
            pluginId: plugin.metadata.id,
            pluginVersion: plugin.metadata.version,
            decision: 'ALLOW',
            layer: 'CAPABILITY',
            capability: 'runtime:clock',
            tenantId: activationContext.tenant?.tenantId,
            environment: activationContext.environment,
            apiVersion: activationContext.apiVersion,
          })
        );
      }
    }
    if (!clockDecision.allowed) actualClock = noopClock();
  }
  return Object.freeze({
    logger: actualLogger,
    clock: actualClock,
    pluginId: plugin.metadata.id,
    pluginVersion: plugin.metadata.version,
  });
}

/**
 * Ordine deterministico: per pluginId.
 */
function byPluginId<T extends { metadata: { id: string } }>(a: T, b: T): number {
  return a.metadata.id.localeCompare(b.metadata.id);
}

export interface PluginRuntimeOptions {
  logger?: PluginLogger;
  clock?: { now(): number };
  /** Se forniti, ogni esecuzione plugin è subordinata a canExecute. */
  governance?: PluginGovernance;
  getActivationContext?: () => PluginActivationContext;
  /** Se fornito, logger/clock sono limitati in base a canUseCapability. */
  capabilityGovernance?: CapabilityGovernance;
  /** Se fornito e context.tenant presente, canExecute(plugin, tenant, context) prima di eseguire. */
  tenantGovernance?: TenantGovernance;
  /** Se fornito, eventi DENY (e opzionalmente ALLOW) sono inviati ai sink. */
  auditDispatcher?: SecurityAuditDispatcher;
  /** Se true, anche le decisioni ALLOW sono auditabili. */
  auditAllowDecisions?: boolean;
}

export class PluginRuntime {
  private readonly registry = new PluginRegistry();
  private readonly sandbox = new PluginSandbox();
  private readonly logger: PluginLogger;
  private readonly clock: { now(): number };
  private readonly governance?: PluginGovernance;
  private readonly getActivationContext?: () => PluginActivationContext;
  private readonly capabilityGovernance?: CapabilityGovernance;
  private readonly tenantGovernance?: TenantGovernance;
  private readonly auditDispatcher?: SecurityAuditDispatcher;
  private readonly auditAllowDecisions: boolean;
  private started = false;
  private readonly executionErrors: PluginExecutionError[] = [];

  constructor(options: PluginRuntimeOptions = {}) {
    this.logger = options.logger ?? defaultLogger();
    this.clock = options.clock ?? { now: () => Date.now() };
    this.governance = options.governance;
    this.getActivationContext = options.getActivationContext;
    this.capabilityGovernance = options.capabilityGovernance;
    this.tenantGovernance = options.tenantGovernance;
    this.auditDispatcher = options.auditDispatcher;
    this.auditAllowDecisions = options.auditAllowDecisions ?? false;
  }

  private getActivationContextOrUndefined(): PluginActivationContext | undefined {
    return this.getActivationContext?.();
  }

  private dispatchPluginOrTenantAudit(
    decision: 'ALLOW' | 'DENY',
    layer: 'PLUGIN' | 'TENANT',
    plugin: RegisteredPlugin,
    reason?: string,
    tenantId?: string
  ): void {
    if (!this.auditDispatcher) return;
    const ctx = this.getActivationContextOrUndefined();
    this.auditDispatcher.dispatch(
      createSecurityAuditEvent({
        timestamp: ctx?.timestamp ?? Date.now(),
        pluginId: plugin.metadata.id,
        pluginVersion: plugin.metadata.version,
        decision,
        layer,
        reason,
        tenantId: tenantId ?? ctx?.tenant?.tenantId,
        environment: ctx?.environment ?? '',
        apiVersion: ctx?.apiVersion ?? '',
      })
    );
  }

  /** Ordine 1: Plugin Governance. Ritorna true se skip. Emette audit su DENY. */
  private shouldSkipByGovernance(plugin: RegisteredPlugin): boolean {
    if (!this.governance || !this.getActivationContext) return false;
    const decision = this.governance.canExecute(plugin, this.getActivationContext());
    if (!decision.allow) {
      this.dispatchPluginOrTenantAudit('DENY', 'PLUGIN', plugin, decision.reason);
      return true;
    }
    return false;
  }

  /** Ordine 3: Tenant Governance. Ritorna true se skip. Emette audit su DENY. */
  private shouldSkipByTenant(plugin: RegisteredPlugin): boolean {
    const ctx = this.getActivationContextOrUndefined();
    if (!ctx?.tenant || !this.tenantGovernance) return false;
    const decision = this.tenantGovernance.canExecute(plugin, ctx.tenant, ctx);
    if (!decision.allow) {
      this.dispatchPluginOrTenantAudit('DENY', 'TENANT', plugin, decision.reason, ctx.tenant.tenantId);
      return true;
    }
    return false;
  }

  /**
   * Registra un plugin e invoca onRegister (sandboxed).
   */
  async register(plugin: RegisteredPlugin): Promise<void> {
    this.registry.register(plugin);
    if (this.shouldSkipByGovernance(plugin)) return;
    if (this.shouldSkipByTenant(plugin)) return;
    if (this.auditAllowDecisions) {
      this.dispatchPluginOrTenantAudit('ALLOW', 'PLUGIN', plugin);
    }
    const context = createContext(
        plugin,
        this.logger,
        this.clock,
        this.getActivationContextOrUndefined(),
        this.capabilityGovernance,
        this.auditDispatcher,
        this.auditAllowDecisions
      );
    const err = await this.sandbox.execute(plugin, 'onRegister', [], context);
    if (err) {
      this.executionErrors.push(err);
    }
  }

  /**
   * Avvia il runtime: invoca onStart per tutti i plugin (ordine deterministico).
   */
  async start(): Promise<void> {
    if (this.started) return;
    const all = [...this.registry.getAll()].sort(byPluginId);
    for (const plugin of all) {
      if (this.shouldSkipByGovernance(plugin)) continue;
      if (this.shouldSkipByTenant(plugin)) continue;
      if (this.auditAllowDecisions) {
        this.dispatchPluginOrTenantAudit('ALLOW', 'PLUGIN', plugin);
      }
      const context = createContext(
        plugin,
        this.logger,
        this.clock,
        this.getActivationContextOrUndefined(),
        this.capabilityGovernance,
        this.auditDispatcher,
        this.auditAllowDecisions
      );
      const err = await this.sandbox.execute(plugin, 'onStart', [], context);
      if (err) {
        this.executionErrors.push(err);
      }
    }
    this.started = true;
  }

  /**
   * Arresta il runtime: invoca onStop per tutti i plugin (ordine deterministico).
   */
  async stop(): Promise<void> {
    if (!this.started) return;
    const all = [...this.registry.getAll()].sort(byPluginId);
    for (const plugin of all) {
      if (this.shouldSkipByGovernance(plugin)) continue;
      if (this.shouldSkipByTenant(plugin)) continue;
      if (this.auditAllowDecisions) {
        this.dispatchPluginOrTenantAudit('ALLOW', 'PLUGIN', plugin);
      }
      const context = createContext(
        plugin,
        this.logger,
        this.clock,
        this.getActivationContextOrUndefined(),
        this.capabilityGovernance,
        this.auditDispatcher,
        this.auditAllowDecisions
      );
      const err = await this.sandbox.execute(plugin, 'onStop', [], context);
      if (err) {
        this.executionErrors.push(err);
      }
    }
    this.started = false;
  }

  /**
   * Dispatch di un hook read-side. Solo plugin read; ordine deterministico.
   */
  async dispatchReadHook(
    hookName: string,
    payload: unknown[],
    contextOverrides?: Partial<Pick<PluginContext, 'logger' | 'clock'>>
  ): Promise<PluginExecutionError[]> {
    const readPlugins = [...this.registry.getReadPlugins()].sort(byPluginId);
    const errors: PluginExecutionError[] = [];
    for (const plugin of readPlugins) {
      if (this.shouldSkipByGovernance(plugin)) continue;
      if (this.shouldSkipByTenant(plugin)) continue;
      if (this.auditAllowDecisions) {
        this.dispatchPluginOrTenantAudit('ALLOW', 'PLUGIN', plugin);
      }
      const context = createContext(
        plugin,
        this.logger,
        this.clock,
        this.getActivationContextOrUndefined(),
        this.capabilityGovernance,
        this.auditDispatcher,
        this.auditAllowDecisions
      );
      const contextWithOverrides: PluginContext = contextOverrides
        ? { ...context, ...contextOverrides }
        : context;
      const err = await this.sandbox.execute(
        plugin,
        hookName,
        payload,
        contextWithOverrides
      );
      if (err) {
        this.executionErrors.push(err);
        errors.push(err);
      }
    }
    return errors;
  }

  /**
   * Dispatch di un hook write-side. Solo plugin write; ordine deterministico.
   */
  async dispatchWriteHook(
    hookName: string,
    payload: unknown[],
    contextOverrides?: Partial<Pick<PluginContext, 'logger' | 'clock'>>
  ): Promise<PluginExecutionError[]> {
    const writePlugins = [...this.registry.getWritePlugins()].sort(byPluginId);
    const errors: PluginExecutionError[] = [];
    for (const plugin of writePlugins) {
      if (this.shouldSkipByGovernance(plugin)) continue;
      if (this.shouldSkipByTenant(plugin)) continue;
      if (this.auditAllowDecisions) {
        this.dispatchPluginOrTenantAudit('ALLOW', 'PLUGIN', plugin);
      }
      const context = createContext(
        plugin,
        this.logger,
        this.clock,
        this.getActivationContextOrUndefined(),
        this.capabilityGovernance,
        this.auditDispatcher,
        this.auditAllowDecisions
      );
      const contextWithOverrides: PluginContext = contextOverrides
        ? { ...context, ...contextOverrides }
        : context;
      const err = await this.sandbox.execute(
        plugin,
        hookName,
        payload,
        contextWithOverrides
      );
      if (err) {
        this.executionErrors.push(err);
        errors.push(err);
      }
    }
    return errors;
  }

  getReadPlugins(): readonly ReadPlugin[] {
    return this.registry.getReadPlugins();
  }

  getWritePlugins(): readonly WritePlugin[] {
    return this.registry.getWritePlugins();
  }

  getAll(): readonly RegisteredPlugin[] {
    return this.registry.getAll();
  }

  /** Errori di esecuzione raccolti (per logging, metrics, audit). */
  getExecutionErrors(): readonly PluginExecutionError[] {
    return [...this.executionErrors];
  }

  /** Svuota la coda errori (opzionale, per test). */
  clearExecutionErrors(): void {
    this.executionErrors.length = 0;
  }

  isStarted(): boolean {
    return this.started;
  }
}
