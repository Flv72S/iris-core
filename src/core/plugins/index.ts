export type { PluginMetadata, PluginKind } from './PluginMetadata';
export type { PluginContext, PluginLogger } from './PluginContext';
export type { ReadPlugin, ObservedEvent } from './ReadPlugin';
export type {
  WritePlugin,
  ObservedCommand,
  ObservedCommandResult,
} from './WritePlugin';

export {
  PluginExecutionError,
  PluginRegistry,
  PluginSandbox,
  PluginRuntime,
  DuplicatePluginIdError,
  InvalidPluginError,
} from './runtime';
export type {
  PluginExecutionErrorData,
  RegisteredPlugin,
  PluginRuntimeOptions,
} from './runtime';

export {
  createActivationContext,
  PluginGovernance,
  allow,
  deny,
  isAllowed,
} from './governance';
export type {
  PluginActivationContext,
  Environment,
  PluginDecision,
  PluginPolicy,
  PluginForPolicy,
} from './governance';

export {
  hasCapability,
  requireCapability,
  capabilityAllowed,
  capabilityDenied,
  isCapabilityAllowed,
  CapabilityGovernance,
} from './capability';
export type {
  PluginCapability,
  PluginCapabilitySet,
  CapabilityDecision,
  CapabilityPolicy,
} from './capability';

export {
  createTenantContext,
  TenantGovernance,
  tenantAllowed,
  tenantDenied,
  isTenantAllowed,
} from './tenant';
export type {
  TenantContext,
  TenantDecision,
  TenantPolicy,
} from './tenant';

export {
  createSecurityAuditEvent,
  SecurityAuditDispatcher,
  InMemoryAuditSink,
} from './audit';
export type {
  SecurityAuditEvent,
  AuditDecision,
  AuditLayer,
  SecurityAuditSink,
} from './audit';
