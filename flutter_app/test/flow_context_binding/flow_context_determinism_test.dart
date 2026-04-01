// F5 — Deterministic binding: same snapshot and step -> same result.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_context_binding/flow_context_binder.dart';
import 'package:iris_flutter_app/flow_context_binding/flow_context_binding_rules.dart';
import 'package:iris_flutter_app/flow_context_binding/flow_context_key.dart';
import 'package:iris_flutter_app/flow_core_consumption/core_consumption_models.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart' as runtime;
import 'package:iris_flutter_app/flow_runtime/flow_runtime_state.dart' as runtime;

void main() {
  late FlowContextBinder binder;
  late runtime.FlowRuntimeState state;
  late FlowCoreSnapshot coreSnapshot;

  setUp(() {
    final kHash = FlowContextKey('core.structuralHash');
    final kManifest = FlowContextKey('core.manifestVersion');
    final rules = FlowContextBindingRules(
      mappings: [
        FlowContextBindingRule(
            coreField: CoreFieldSource.coreStructuralHash, contextKey: kHash),
        FlowContextBindingRule(
            coreField: CoreFieldSource.coreManifestVersion, contextKey: kManifest),
      ],
      keysByStep: {'A': {kHash, kManifest}},
    );
    binder = FlowContextBinder(rules: rules);
    state = runtime.FlowRuntimeState.initial();
    state = state.copyWith(
      sessionContext: state.sessionContext.copyWith(
        sessionId: runtime.FlowSessionId('s1'),
        activeStep: runtime.FlowStepId('A'),
      ),
    );
    coreSnapshot = FlowCoreSnapshot(
      structuralHash: 'h1',
      manifestVersion: 'v1',
    );
  });

  test('same snapshot and step produce equal FlowContextSnapshot', () {
    final a = binder.bind(state, runtime.FlowStepId('A'), coreSnapshot);
    final b = binder.bind(state, runtime.FlowStepId('A'), coreSnapshot);
    expect(a, equals(b));
  });

  test('same inputs produce identical contextData and sourceHashes', () {
    final a = binder.bind(state, runtime.FlowStepId('A'), coreSnapshot);
    final b = binder.bind(state, runtime.FlowStepId('A'), coreSnapshot);
    expect(a.contextData.length, equals(b.contextData.length));
    expect(a.sourceHashes, equals(b.sourceHashes));
  });
}
