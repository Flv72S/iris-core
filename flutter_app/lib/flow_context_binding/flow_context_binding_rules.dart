// F5 — Binding rules. Declarative only; no conditions or evaluations.

import 'flow_context_key.dart';

/// Identifies a Core snapshot field (F1). Used only for mapping.
enum CoreFieldSource {
  coreStructuralHash,
  coreManifestVersion,
}

/// Single rule: one Core field maps to one Flow context key.
class FlowContextBindingRule {
  const FlowContextBindingRule({
    required this.coreField,
    required this.contextKey,
  });

  final CoreFieldSource coreField;
  final FlowContextKey contextKey;
}

/// Declarative rules: mappings and per-step key visibility. Static data only.
class FlowContextBindingRules {
  FlowContextBindingRules({
    List<FlowContextBindingRule>? mappings,
    Map<String, Set<FlowContextKey>>? keysByStep,
  })  : mappings = mappings ?? const [],
        keysByStep = keysByStep ?? {};

  final List<FlowContextBindingRule> mappings;
  /// Step id value -> set of context keys available for that step.
  final Map<String, Set<FlowContextKey>> keysByStep;

  /// Keys allowed for a step. Empty set if step not in keysByStep.
  Set<FlowContextKey> keysForStep(String stepIdValue) {
    final set = keysByStep[stepIdValue];
    return set != null ? Set<FlowContextKey>.from(set) : {};
  }
}
