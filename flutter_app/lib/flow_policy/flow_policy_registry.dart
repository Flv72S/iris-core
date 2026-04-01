// F6 — Policy registry. Deterministic; no conditional logic on Core data.

import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';

import 'flow_policy_rule.dart';

/// Registry of active policy rules. Configuration only.
class FlowPolicyRegistry {
  FlowPolicyRegistry({List<FlowPolicyRule>? rules}) : _rules = rules ?? [];

  final List<FlowPolicyRule> _rules;

  /// Rules that apply to [stepId] (global rules + step-specific).
  List<FlowPolicyRule> getRulesForStep(FlowStepId stepId) =>
      _rules.where((r) => r.appliesToStep(stepId)).toList();
}
