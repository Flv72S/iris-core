// I6 - Tests for FailureSimulator and related classes.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_result.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_simulator.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_type.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation_type.dart';

void main() {
  group('FailureInjection', () {
    test('equality works correctly', () {
      final injection1 = FailureInjection(
        sequenceOrder: 2,
        failureResult: FailureResult.networkError('Test'),
      );

      final injection2 = FailureInjection(
        sequenceOrder: 2,
        failureResult: FailureResult.networkError('Test'),
      );

      final injection3 = FailureInjection(
        sequenceOrder: 3,
        failureResult: FailureResult.networkError('Test'),
      );

      expect(injection1, equals(injection2));
      expect(injection1, isNot(equals(injection3)));
    });

    test('hashCode is deterministic', () {
      final injection1 = FailureInjection(
        sequenceOrder: 1,
        failureResult: FailureResult.timeout('Timeout'),
      );

      final injection2 = FailureInjection(
        sequenceOrder: 1,
        failureResult: FailureResult.timeout('Timeout'),
      );

      expect(injection1.hashCode, injection2.hashCode);
    });

    test('toJson serializes correctly', () {
      final injection = FailureInjection(
        sequenceOrder: 5,
        failureResult: FailureResult.validationError('Bad input'),
      );

      final json = injection.toJson();

      expect(json['sequenceOrder'], 5);
      expect(json['failureResult']['type'], 'validationError');
    });
  });

  group('FailureScenario', () {
    test('noFailures creates empty scenario', () {
      const scenario = FailureScenario.noFailures();

      expect(scenario.name, 'no_failures');
      expect(scenario.injections, isEmpty);
    });

    test('singleFailure creates scenario with one injection', () {
      final scenario = FailureScenario.singleFailure(
        atSequence: 3,
        type: FailureType.networkError,
      );

      expect(scenario.injections.length, 1);
      expect(scenario.injections[0].sequenceOrder, 3);
      expect(scenario.injections[0].failureResult.type, FailureType.networkError);
    });

    test('multipleFailures creates scenario with multiple injections', () {
      final scenario = FailureScenario.multipleFailures([
        (1, FailureType.timeout),
        (3, FailureType.networkError),
        (5, FailureType.storageUnavailable),
      ]);

      expect(scenario.injections.length, 3);
      expect(scenario.injections[0].sequenceOrder, 1);
      expect(scenario.injections[1].sequenceOrder, 3);
      expect(scenario.injections[2].sequenceOrder, 5);
    });

    test('injectionAt returns correct injection', () {
      final scenario = FailureScenario.multipleFailures([
        (2, FailureType.timeout),
        (4, FailureType.networkError),
      ]);

      expect(scenario.injectionAt(2)?.failureResult.type, FailureType.timeout);
      expect(scenario.injectionAt(4)?.failureResult.type, FailureType.networkError);
      expect(scenario.injectionAt(3), isNull);
    });

    test('equality works correctly', () {
      final scenario1 = FailureScenario.singleFailure(
        atSequence: 1,
        type: FailureType.timeout,
        message: 'Test',
      );

      final scenario2 = FailureScenario.singleFailure(
        atSequence: 1,
        type: FailureType.timeout,
        message: 'Test',
      );

      expect(scenario1, equals(scenario2));
    });

    test('hashCode is deterministic', () {
      final scenario1 = FailureScenario.multipleFailures([
        (1, FailureType.timeout),
      ]);

      final scenario2 = FailureScenario.multipleFailures([
        (1, FailureType.timeout),
      ]);

      expect(scenario1.hashCode, scenario2.hashCode);
    });

    test('toJson serializes correctly', () {
      final scenario = FailureScenario.singleFailure(
        atSequence: 2,
        type: FailureType.policyViolation,
      );

      final json = scenario.toJson();

      expect(json['name'], contains('single_failure'));
      expect((json['injections'] as List).length, 1);
    });
  });

  group('FailureSimulatorAdapter', () {
    const testOperation = PhysicalOperation(
      mediaId: 'test-media',
      type: PhysicalOperationType.uploadCloud,
      targetTier: 'cloud',
      sequenceOrder: 0,
    );

    test('noFailures returns success for all operations', () async {
      const adapter = FailureSimulatorAdapter.noFailures();

      final result = await adapter.execute(testOperation);

      expect(result.isSuccess, isTrue);
    });

    test('failAt fails at specified sequences', () async {
      final adapter = FailureSimulatorAdapter.failAt([1, 3]);

      final op0 = testOperation;
      final op1 = PhysicalOperation(
        mediaId: 'test',
        type: PhysicalOperationType.storeLocal,
        targetTier: 'local',
        sequenceOrder: 1,
      );
      final op2 = PhysicalOperation(
        mediaId: 'test',
        type: PhysicalOperationType.storeLocal,
        targetTier: 'local',
        sequenceOrder: 2,
      );
      final op3 = PhysicalOperation(
        mediaId: 'test',
        type: PhysicalOperationType.storeLocal,
        targetTier: 'local',
        sequenceOrder: 3,
      );

      expect((await adapter.execute(op0)).isSuccess, isTrue);
      expect((await adapter.execute(op1)).isFailure, isTrue);
      expect((await adapter.execute(op2)).isSuccess, isTrue);
      expect((await adapter.execute(op3)).isFailure, isTrue);
    });

    test('failOnOperationType fails on specified types', () async {
      final adapter = FailureSimulatorAdapter.failOnOperationType({
        PhysicalOperationType.uploadCloud,
      });

      final localOp = const PhysicalOperation(
        mediaId: 'test',
        type: PhysicalOperationType.storeLocal,
        targetTier: 'local',
        sequenceOrder: 0,
      );

      final cloudOp = const PhysicalOperation(
        mediaId: 'test',
        type: PhysicalOperationType.uploadCloud,
        targetTier: 'cloud',
        sequenceOrder: 1,
      );

      expect((await adapter.execute(localOp)).isSuccess, isTrue);
      expect((await adapter.execute(cloudOp)).isFailure, isTrue);
    });

    test('failure result contains correct code and message', () async {
      final scenario = FailureScenario.singleFailure(
        atSequence: 0,
        type: FailureType.networkError,
        message: 'Custom network error',
      );

      final adapter = FailureSimulatorAdapter(scenario: scenario);

      final result = await adapter.execute(testOperation);

      expect(result.isFailure, isTrue);
      expect(result.failure?.code, 'networkError');
      expect(result.failure?.message, 'Custom network error');
    });

    test('is deterministic', () async {
      final adapter = FailureSimulatorAdapter.failAt([2]);

      final op = const PhysicalOperation(
        mediaId: 'test',
        type: PhysicalOperationType.storeLocal,
        targetTier: 'local',
        sequenceOrder: 2,
      );

      final result1 = await adapter.execute(op);
      final result2 = await adapter.execute(op);

      expect(result1.isFailure, isTrue);
      expect(result2.isFailure, isTrue);
      expect(result1.failure?.code, result2.failure?.code);
    });

    test('type-based failure takes precedence over sequence', () async {
      final scenario = FailureScenario.singleFailure(
        atSequence: 0,
        type: FailureType.timeout,
      );

      final adapter = FailureSimulatorAdapter(
        scenario: scenario,
        failOnTypes: {PhysicalOperationType.uploadCloud},
      );

      final op = const PhysicalOperation(
        mediaId: 'test',
        type: PhysicalOperationType.uploadCloud,
        targetTier: 'cloud',
        sequenceOrder: 0,
      );

      final result = await adapter.execute(op);

      expect(result.isFailure, isTrue);
      expect(result.failure?.code, 'TYPE_FAILURE');
    });
  });
}
