/**
 * Plugin Governance - controllo formale del plugin system
 * Microstep 5.3.3
 */

export {
  createActivationContext,
  type PluginActivationContext,
  type Environment,
} from './PluginActivationContext';
export { allow, deny, isAllowed, type PluginDecision } from './PluginDecision';
export type { PluginPolicy, PluginForPolicy } from './PluginPolicy';
export { PluginGovernance } from './PluginGovernance';
