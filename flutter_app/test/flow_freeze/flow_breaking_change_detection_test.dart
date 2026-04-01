// F9 - Breaking change detection: graph/policy/binding change changes hash and validator signals.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_context_binding/flow_context_binding_rules.dart';
import 'package:iris_flutter_app/flow_freeze/flow_behavioral_hasher.dart';
import 'package:iris_flutter_app/flow_freeze/flow_compatibility_manifest.dart';
import 'package:iris_flutter_app/flow_freeze/flow_freeze_validator.dart';
import 'package:iris_flutter_app/flow_freeze/flow_interface_snapshot.dart';
import 'package:iris_flutter_app/flow_policy/flow_policy_rule.dart';
import 'package:iris_flutter_app/flow_steps/flow_progression_rules.dart';
import 'package:iris_flutter_app/flow_steps/flow_step.dart';
import 'package:iris_flutter_app/flow_steps/flow_step_edge.dart';
import 'package:iris_flutter_app/flow_steps/flow_step_graph.dart';
import 'package:iris_flutter_app/flow_steps/flow_step_id.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart' show FlowTimestamp;
import 'package:iris_flutter_app/flow_context_binding/flow_context_key.dart';

void main() {
  FlowInterfaceSnapshot baselineSnapshot() {
    final a = FlowStepId('a');
    final b = FlowStepId('b');
    final graph = FlowStepGraph(
      steps: [FlowStep(stepId: a, label: 'A'), FlowStep(stepId: b, label: 'B')],
      initialStepId: a,
      edges: [FlowStepEdge(from: a, to: b)],
    );
    final progression = FlowProgressionRules(mandatorySteps: {a});
    final policyRules = [FlowPolicyRule(ruleId: 'r1', description: 'desc')];
    final bindingRules = FlowContextBindingRules(
      mappings: [
        FlowContextBindingRule(
          coreField: CoreFieldSource.coreStructuralHash,
          contextKey: FlowContextKey('k'),
        ),
      ],
      keysByStep: {'a': {FlowContextKey('k')}},
    );
    return FlowInterfaceSnapshot.buildFrom(
      stepGraph: graph,
      progressionRules: progression,
      policyRules: policyRules,
      bindingRules: bindingRules,
    );
  }

  test('step graph change changes behavioral hash', () {
    final base = baselineSnapshot();
    final a = FlowStepId('a');
    final b = FlowStepId('b');
    final c = FlowStepId('c');
    final graphModified = FlowStepGraph(
      steps: [
        FlowStep(stepId: a, label: 'A'),
        FlowStep(stepId: b, label: 'B'),
        FlowStep(stepId: c, label: 'C'),
      ],
      initialStepId: a,
      edges: [FlowStepEdge(from: a, to: b), FlowStepEdge(from: b, to: c)],
    );
    final snapshotModified = FlowInterfaceSnapshot.buildFrom(
      stepGraph: graphModified,
      progressionRules: FlowProgressionRules(mandatorySteps: {a}),
      policyRules: [FlowPolicyRule(ruleId: 'r1', description: 'desc')],
      bindingRules: FlowContextBindingRules(
        mappings: [
          FlowContextBindingRule(
            coreField: CoreFieldSource.coreStructuralHash,
            contextKey: FlowContextKey('k'),
          ),
        ],
        keysByStep: {'a': {FlowContextKey('k')}},
      ),
    );
    expect(FlowBehavioralHasher.behavioralHash(base),
        isNot(FlowBehavioralHasher.behavioralHash(snapshotModified)));
  });

  test('policy rule change changes behavioral hash', () {
    final base = baselineSnapshot();
    final a = FlowStepId('a');
    final graph = FlowStepGraph(
      steps: [FlowStep(stepId: a, label: 'A')],
      initialStepId: a,
      edges: [],
    );
    final snapshotModified = FlowInterfaceSnapshot.buildFrom(
      stepGraph: graph,
      progressionRules: FlowProgressionRules(mandatorySteps: {a}),
      policyRules: [
        FlowPolicyRule(ruleId: 'r1', description: 'desc'),
        FlowPolicyRule(ruleId: 'r2', description: 'extra'),
      ],
      bindingRules: FlowContextBindingRules(
        mappings: [
          FlowContextBindingRule(
            coreField: CoreFieldSource.coreStructuralHash,
            contextKey: FlowContextKey('k'),
          ),
        ],
        keysByStep: {'a': {FlowContextKey('k')}},
      ),
    );
    expect(FlowBehavioralHasher.behavioralHash(base),
        isNot(FlowBehavioralHasher.behavioralHash(snapshotModified)));
  });

  test('validator signals breaking change when behavioral hash differs', () {
    const ts = FlowTimestamp(0);
    final baseline = FlowCompatibilityManifest(
      flowVersion: '1.0.0',
      behavioralHash: 'hash1',
      coreCompatibilityVersion: '1.0',
      stepGraphSignature: 's',
      policySignature: 'p',
      bindingSignature: 'b',
      eventModelSignature: 'e',
      freezeTimestamp: ts,
    );
    final current = FlowCompatibilityManifest(
      flowVersion: '1.0.0',
      behavioralHash: 'hash2',
      coreCompatibilityVersion: '1.0',
      stepGraphSignature: 's',
      policySignature: 'p',
      bindingSignature: 'b',
      eventModelSignature: 'e',
      freezeTimestamp: ts,
    );
    final result = FlowFreezeValidator.compare(current, baseline);
    expect(result.isCompatible, false);
    expect(result.breakingChanges, contains('behavioralHash'));
  });

  test('validator reports compatible when manifests match', () {
    const manifest = FlowCompatibilityManifest(
      flowVersion: '1.0.0',
      behavioralHash: 'h',
      coreCompatibilityVersion: '1.0',
      stepGraphSignature: 's',
      policySignature: 'p',
      bindingSignature: 'b',
      eventModelSignature: 'e',
      freezeTimestamp: FlowTimestamp(0),
    );
    final result = FlowFreezeValidator.compare(manifest, manifest);
    expect(result.isCompatible, true);
    expect(result.breakingChanges, isEmpty);
  });

  test('forbidden dependency scan: no DateTime.now Random IO network', () {
    final dir = Directory('lib/flow_freeze');
    expect(dir.existsSync(), true);
    const forbidden = ['DateTime.now', 'Random(', 'dart:io', 'Socket', 'HttpClient'];
    final issues = <String>[];
    for (final f in dir.listSync()) {
      if (f is! File || !f.path.endsWith('.dart')) continue;
      final content = f.readAsStringSync();
      final name = f.uri.pathSegments.last;
      for (final token in forbidden) {
        if (content.contains(token)) issues.add('$name: $token');
      }
    }
    expect(issues, isEmpty);
  });
}
