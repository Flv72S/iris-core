// F5 — Isolation: no shared references; mutating snapshot does not affect Core.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_context_binding/flow_context_binder.dart';
import 'package:iris_flutter_app/flow_context_binding/flow_context_binding_rules.dart';
import 'package:iris_flutter_app/flow_context_binding/flow_context_key.dart';
import 'package:iris_flutter_app/flow_context_binding/flow_context_snapshot.dart';
import 'package:iris_flutter_app/flow_core_consumption/core_consumption_models.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart' as runtime;
import 'package:iris_flutter_app/flow_runtime/flow_runtime_state.dart' as runtime;

void main() {
  test('FlowContextSnapshot has unmodifiable contextData and sourceHashes', () {
    final kHash = FlowContextKey('core.structuralHash');
    final rules = FlowContextBindingRules(
      mappings: [
        FlowContextBindingRule(
            coreField: CoreFieldSource.coreStructuralHash, contextKey: kHash),
      ],
      keysByStep: {'A': {kHash}},
    );
    final binder = FlowContextBinder(rules: rules);
    final state = runtime.FlowRuntimeState.initial();
    state.copyWith(
      sessionContext: state.sessionContext.copyWith(
        activeStep: runtime.FlowStepId('A'),
      ),
    );
    final coreSnapshot = FlowCoreSnapshot(
      structuralHash: 'original',
      manifestVersion: 'v1',
    );
    final result = binder.bind(state, runtime.FlowStepId('A'), coreSnapshot);
    expect(result.contextData[kHash], equals('original'));
    expect(() => result.contextData[FlowContextKey('x')] = 'y', throwsA(isA<UnsupportedError>()));
    expect(() => result.sourceHashes['k'] = 'v', throwsA(isA<UnsupportedError>()));
  });

  test('mutating state after bind does not change already-produced snapshot', () {
    final kHash = FlowContextKey('core.structuralHash');
    final rules = FlowContextBindingRules(
      mappings: [
        FlowContextBindingRule(
            coreField: CoreFieldSource.coreStructuralHash, contextKey: kHash),
      ],
      keysByStep: {'A': {kHash}},
    );
    final binder = FlowContextBinder(rules: rules);
    var state = runtime.FlowRuntimeState.initial();
    state = state.copyWith(
      sessionContext: state.sessionContext.copyWith(
        sessionId: runtime.FlowSessionId('s1'),
        snapshotId: 'id1',
        activeStep: runtime.FlowStepId('A'),
      ),
    );
    final coreSnapshot = FlowCoreSnapshot(
      structuralHash: 'h1',
      manifestVersion: 'v1',
    );
    final result = binder.bind(state, runtime.FlowStepId('A'), coreSnapshot);
    state = state.copyWith(
      sessionContext: state.sessionContext.copyWith(snapshotId: 'id2'),
    );
    expect(result.snapshotId, equals('id1'));
  });

  test('result is new instance every time', () {
    final kHash = FlowContextKey('core.structuralHash');
    final rules = FlowContextBindingRules(
      mappings: [
        FlowContextBindingRule(
            coreField: CoreFieldSource.coreStructuralHash, contextKey: kHash),
      ],
      keysByStep: {'A': {kHash}},
    );
    final binder = FlowContextBinder(rules: rules);
    final state = runtime.FlowRuntimeState.initial();
    state.copyWith(
      sessionContext: state.sessionContext.copyWith(
        activeStep: runtime.FlowStepId('A'),
      ),
    );
    final coreSnapshot = FlowCoreSnapshot(
      structuralHash: 'h1',
      manifestVersion: 'v1',
    );
    final a = binder.bind(state, runtime.FlowStepId('A'), coreSnapshot);
    final b = binder.bind(state, runtime.FlowStepId('A'), coreSnapshot);
    expect(identical(a, b), isFalse);
  });
}
