// F5 — Context binder. Pure; read-only; no inference.

import 'package:iris_flutter_app/flow_core_consumption/core_consumption_models.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart' as runtime;
import 'package:iris_flutter_app/flow_runtime/flow_runtime_state.dart' as runtime;

import 'flow_context_binding_rules.dart';
import 'flow_context_key.dart';
import 'flow_context_snapshot.dart';

/// Binds Core snapshot to Flow context using declarative rules. Pure; no side effects.
class FlowContextBinder {
  FlowContextBinder({required this.rules});

  final FlowContextBindingRules rules;

  /// Produces FlowContextSnapshot from runtime state, current step, and Core snapshot.
  /// Does not mutate any input. No shared references in output.
  FlowContextSnapshot bind(
    runtime.FlowRuntimeState state,
    runtime.FlowStepId stepId,
    FlowCoreSnapshot coreSnapshot,
  ) {
    final stepValue = stepId.value;
    final allowedKeys = rules.keysForStep(stepValue);
    final Map<FlowContextKey, Object> contextData = <FlowContextKey, Object>{};
    for (final rule in rules.mappings) {
      if (!allowedKeys.contains(rule.contextKey)) continue;
      final value = _valueFor(coreSnapshot, rule.coreField);
      if (value != null) {
        contextData[rule.contextKey] = value;
      }
    }
    final sourceHashes = <String, String>{
      'structuralHash': coreSnapshot.structuralHash,
      'manifestVersion': coreSnapshot.manifestVersion,
    };
    final snapshotId = state.sessionContext.snapshotId ?? coreSnapshot.structuralHash;
    return FlowContextSnapshot(
      snapshotId: snapshotId,
      boundAtStep: stepId,
      contextData: Map<FlowContextKey, Object>.unmodifiable(contextData),
      sourceHashes: Map<String, String>.unmodifiable(sourceHashes),
    );
  }

  /// Reads one field from Core snapshot. No interpretation.
  static Object? _valueFor(FlowCoreSnapshot snapshot, CoreFieldSource field) {
    switch (field) {
      case CoreFieldSource.coreStructuralHash:
        return snapshot.structuralHash;
      case CoreFieldSource.coreManifestVersion:
        return snapshot.manifestVersion;
    }
  }
}
