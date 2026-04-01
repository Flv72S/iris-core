// F5 — Binder: bind produces snapshot; step-aware keys.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_context_binding/flow_context_binder.dart';
import 'package:iris_flutter_app/flow_context_binding/flow_context_binding_rules.dart';
import 'package:iris_flutter_app/flow_context_binding/flow_context_key.dart';
import 'package:iris_flutter_app/flow_context_binding/flow_context_snapshot.dart';
import 'package:iris_flutter_app/flow_core_consumption/core_consumption_models.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart' as runtime;
import 'package:iris_flutter_app/flow_runtime/flow_runtime_state.dart' as runtime;

void main() {
  late FlowContextBindingRules rules;
  late FlowContextBinder binder;
  late runtime.FlowRuntimeState state;
  late FlowCoreSnapshot coreSnapshot;

  setUp(() {
    final kHash = FlowContextKey('core.structuralHash');
    final kManifest = FlowContextKey('core.manifestVersion');
    rules = FlowContextBindingRules(
      mappings: [
        FlowContextBindingRule(
            coreField: CoreFieldSource.coreStructuralHash, contextKey: kHash),
        FlowContextBindingRule(
            coreField: CoreFieldSource.coreManifestVersion, contextKey: kManifest),
      ],
      keysByStep: {
        'A': {kHash, kManifest},
        'B': {kHash},
      },
    );
    binder = FlowContextBinder(rules: rules);
    state = runtime.FlowRuntimeState.initial();
    state = state.copyWith(
      sessionContext: state.sessionContext.copyWith(
        sessionId: runtime.FlowSessionId('s1'),
        snapshotId: 'snap-1',
        activeStep: runtime.FlowStepId('A'),
      ),
    );
    coreSnapshot = FlowCoreSnapshot(
      structuralHash: 'abc123',
      manifestVersion: 'v1',
    );
  });

  test('bind produces FlowContextSnapshot with snapshotId and boundAtStep', () {
    final result = binder.bind(state, runtime.FlowStepId('A'), coreSnapshot);
    expect(result.snapshotId, equals('snap-1'));
    expect(result.boundAtStep.value, equals('A'));
  });

  test('bind includes only keys allowed for step', () {
    final resultA = binder.bind(state, runtime.FlowStepId('A'), coreSnapshot);
    expect(resultA.contextData.length, equals(2));
    expect(resultA.contextData[FlowContextKey('core.structuralHash')],
        equals('abc123'));
    expect(resultA.contextData[FlowContextKey('core.manifestVersion')],
        equals('v1'));

    final resultB = binder.bind(state, runtime.FlowStepId('B'), coreSnapshot);
    expect(resultB.contextData.length, equals(1));
    expect(resultB.contextData[FlowContextKey('core.structuralHash')],
        equals('abc123'));
    expect(resultB.contextData[FlowContextKey('core.manifestVersion')],
        isNull);
  });

  test('sourceHashes contains structuralHash and manifestVersion', () {
    final result = binder.bind(state, runtime.FlowStepId('A'), coreSnapshot);
    expect(result.sourceHashes['structuralHash'], equals('abc123'));
    expect(result.sourceHashes['manifestVersion'], equals('v1'));
  });

  test('keysForStep returns empty set for unknown step', () {
    final result = binder.bind(state, runtime.FlowStepId('Z'), coreSnapshot);
    expect(result.contextData.isEmpty, isTrue);
  });
}
