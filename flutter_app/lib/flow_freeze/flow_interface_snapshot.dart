// F9 - Interface snapshot. Immutable DTO; deterministic ordering only.

import 'package:iris_flutter_app/flow_context_binding/flow_context_binding_rules.dart';
import 'package:iris_flutter_app/flow_policy/flow_policy_rule.dart';
import 'package:iris_flutter_app/flow_steps/flow_progression_rules.dart';
import 'package:iris_flutter_app/flow_steps/flow_step_edge.dart';
import 'package:iris_flutter_app/flow_steps/flow_step_graph.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_event_type.dart';

/// Immutable snapshot of Flow structural surface. Canonical signatures only; no volatile fields.
class FlowInterfaceSnapshot {
  const FlowInterfaceSnapshot({
    required this.stepGraphSignature,
    required this.progressionSignature,
    required this.policySignature,
    required this.bindingSignature,
    required this.eventModelSignature,
  });

  final String stepGraphSignature;
  final String progressionSignature;
  final String policySignature;
  final String bindingSignature;
  final String eventModelSignature;

  /// Build snapshot from Flow modules. Deterministic: same inputs → same signatures.
  static FlowInterfaceSnapshot buildFrom({
    required FlowStepGraph stepGraph,
    required FlowProgressionRules progressionRules,
    required List<FlowPolicyRule> policyRules,
    required FlowContextBindingRules bindingRules,
  }) {
    return FlowInterfaceSnapshot(
      stepGraphSignature: _stepGraphSignature(stepGraph),
      progressionSignature: _progressionSignature(progressionRules),
      policySignature: _policySignature(policyRules),
      bindingSignature: _bindingSignature(bindingRules),
      eventModelSignature: _eventModelSignature(),
    );
  }

  static String _stepGraphSignature(FlowStepGraph graph) {
    final stepIds = graph.stepIds.map((id) => id.value).toList()..sort();
    final edges = graph.edges.map((e) => '${e.from.value}|${e.to.value}|${e.edgeType.name}').toList()..sort();
    final initial = graph.initialStepId.value;
    return 'initial=$initial;steps=${stepIds.join(',')};edges=${edges.join(';')}';
  }

  static String _progressionSignature(FlowProgressionRules r) {
    final m = r.mandatorySteps.map((id) => id.value).toList()..sort();
    final o = r.optionalSteps.map((id) => id.value).toList()..sort();
    final p = r.repeatableSteps.map((id) => id.value).toList()..sort();
    final t = r.terminalSteps.map((id) => id.value).toList()..sort();
    return 'mandatory=${m.join(',')};optional=${o.join(',')};repeatable=${p.join(',')};terminal=${t.join(',')}';
  }

  static String _policySignature(List<FlowPolicyRule> rules) {
    final list = rules.map((r) {
      final appliesTo = r.appliesTo?.value ?? '';
      final paramKeys = r.params.keys.toList()..sort();
      final params = paramKeys.map((k) => '$k=${r.params[k]}').join(',');
      return '${r.ruleId}|${r.description}|$appliesTo|${r.evaluationType.name}|$params';
    }).toList()..sort();
    return list.join(';');
  }

  static String _bindingSignature(FlowContextBindingRules rules) {
    final mappings = rules.mappings.map((m) => '${m.coreField.name}:${m.contextKey.value}').toList()..sort();
    final keysByStep = rules.keysByStep.keys.toList()..sort();
    final stepParts = keysByStep.map((step) {
      final keys = rules.keysByStep[step]!.map((k) => k.value).toList()..sort();
      return '$step=[${keys.join(',')}]';
    });
    return 'mappings=${mappings.join(';')};steps=${stepParts.join(';')}';
  }

  static String _eventModelSignature() {
    final names = FlowEventType.values.map((e) => e.name).toList()..sort();
    return names.join(',');
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FlowInterfaceSnapshot &&
          stepGraphSignature == other.stepGraphSignature &&
          progressionSignature == other.progressionSignature &&
          policySignature == other.policySignature &&
          bindingSignature == other.bindingSignature &&
          eventModelSignature == other.eventModelSignature);

  @override
  int get hashCode => Object.hash(
        stepGraphSignature,
        progressionSignature,
        policySignature,
        bindingSignature,
        eventModelSignature,
      );
}
