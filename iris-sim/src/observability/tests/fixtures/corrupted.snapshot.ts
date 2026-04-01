import type { IrisObservabilitySnapshot } from '../../observability_contract.js';
import { cloneSnapshot, createValidSnapshot } from './snapshot.factory.js';

export function corruptedMissingNodeId(): IrisObservabilitySnapshot {
  const s = createValidSnapshot();
  (s.node as any).id = '';
  return s;
}

export function corruptedInvalidStateGauge(): IrisObservabilitySnapshot {
  const s = createValidSnapshot();
  if (!s.runtime) throw new Error('runtime block required');
  s.runtime.state = 'RUNNING';
  s.metrics.metrics['runtime.state'] = 0;
  return s;
}

export function corruptedUnsortedComponents(): IrisObservabilitySnapshot {
  const s = createValidSnapshot();
  if (!s.runtime) throw new Error('runtime block required');
  s.runtime.activeComponentsList = cloneSnapshot(s).runtime!.activeComponentsList!.slice().reverse();
  return s;
}

export function corruptedUnsortedDomains(): IrisObservabilitySnapshot {
  const s = createValidSnapshot();
  if (!s.federation) throw new Error('federation block required');
  s.federation.domainsRegistered = ['z', 'a'];
  return s;
}

export function corruptedMissingRuntimeNestedField(): IrisObservabilitySnapshot {
  const s = createValidSnapshot();
  if (!s.runtime) throw new Error('runtime block required');
  (s.runtime as any).updatedAt = '';
  return s;
}

export function corruptedWrongActiveComponentsListType(): IrisObservabilitySnapshot {
  const s = createValidSnapshot();
  (s.runtime as any).activeComponentsList = 'identity,gossip';
  return s;
}

export function corruptedPartiallySortedComponents(): IrisObservabilitySnapshot {
  const s = createValidSnapshot();
  if (!s.runtime?.activeComponentsList) throw new Error('runtime.activeComponentsList required');
  s.runtime.activeComponentsList = ['crdt', 'gossip', 'federation', 'identity', 'observability', 'transport'];
  return s;
}

export function corruptedDuplicateComponents(): IrisObservabilitySnapshot {
  const s = createValidSnapshot();
  if (!s.runtime?.activeComponentsList) throw new Error('runtime.activeComponentsList required');
  s.runtime.activeComponentsList = ['crdt', 'federation', 'gossip', 'identity', 'identity', 'transport'];
  return s;
}

export function corruptedDuplicateDomains(): IrisObservabilitySnapshot {
  const s = createValidSnapshot();
  if (!s.federation) throw new Error('federation block required');
  s.federation.domainsRegistered = ['local', 'local'];
  return s;
}

