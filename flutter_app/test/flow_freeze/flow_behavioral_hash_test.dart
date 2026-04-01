import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_context_binding/flow_context_binding_rules.dart';
import 'package:iris_flutter_app/flow_context_binding/flow_context_key.dart';
import 'package:iris_flutter_app/flow_freeze/flow_behavioral_hasher.dart';
import 'package:iris_flutter_app/flow_freeze/flow_interface_snapshot.dart';
import 'package:iris_flutter_app/flow_policy/flow_policy_rule.dart';
import 'package:iris_flutter_app/flow_steps/flow_progression_rules.dart';
import 'package:iris_flutter_app/flow_steps/flow_step.dart';
import 'package:iris_flutter_app/flow_steps/flow_step_edge.dart';
import 'package:iris_flutter_app/flow_steps/flow_step_graph.dart';
import 'package:iris_flutter_app/flow_steps/flow_step_id.dart';

void main() {
  late FlowInterfaceSnapshot snapshot;

  setUp(() {
    final a = FlowStepId('a');
    final b = FlowStepId('b');
    final graph = FlowStepGraph(
      steps: [FlowStep(stepId: a, label: 'A'), FlowStep(stepId: b, label: 'B')],
      initialStepId: a,
      edges: [FlowStepEdge(from: a, to: b)],
    );
    final progression = FlowProgressionRules(mandatorySteps: {a}, terminalSteps: {b});
    final policyRules = [FlowPolicyRule(ruleId: 'r1', description: 'd1')];
    final bindingRules = FlowContextBindingRules(
      mappings: [
        FlowContextBindingRule(
          coreField: CoreFieldSource.coreStructuralHash,
          contextKey: FlowContextKey('hash'),
        ),
      ],
      keysByStep: {'a': {FlowContextKey('hash')}},
    );
    snapshot = FlowInterfaceSnapshot.buildFrom(
      stepGraph: graph,
      progressionRules: progression,
      policyRules: policyRules,
      bindingRules: bindingRules,
    );
  });

  test('behavioral hash is identical over 100 runs', () {
    final hashes = <String>[];
    for (var i = 0; i < 100; i++) {
      hashes.add(FlowBehavioralHasher.behavioralHash(snapshot));
    }
    expect(hashes.every((h) => h == hashes.first), true);
    expect(hashes.first.length, 64);
  });
}
