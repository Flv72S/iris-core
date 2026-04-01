// I6 - Failure simulator. Deterministic injection of failures for testing.

import 'package:iris_flutter_app/media_execution/execution_failure.dart';
import 'package:iris_flutter_app/media_execution/execution_result.dart';
import 'package:iris_flutter_app/media_execution/media_execution_port.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation_type.dart';

import 'failure_result.dart';
import 'failure_type.dart';

/// Configuration for simulating a failure at a specific point.
class FailureInjection {
  const FailureInjection({
    required this.sequenceOrder,
    required this.failureResult,
  });

  /// The sequence order at which to inject the failure.
  final int sequenceOrder;

  /// The failure result to inject.
  final FailureResult failureResult;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FailureInjection &&
          sequenceOrder == other.sequenceOrder &&
          failureResult == other.failureResult);

  @override
  int get hashCode => Object.hash(sequenceOrder, failureResult);

  Map<String, dynamic> toJson() => {
        'sequenceOrder': sequenceOrder,
        'failureResult': failureResult.toJson(),
      };
}

/// Failure scenario for deterministic testing.
class FailureScenario {
  const FailureScenario({
    required this.name,
    required this.injections,
  });

  /// Name of the scenario for identification.
  final String name;

  /// List of failure injections in this scenario.
  final List<FailureInjection> injections;

  /// Creates an empty scenario with no failures.
  const FailureScenario.noFailures()
      : name = 'no_failures',
        injections = const [];

  /// Creates a scenario with a single failure at the given sequence.
  factory FailureScenario.singleFailure({
    required int atSequence,
    required FailureType type,
    String? message,
  }) {
    return FailureScenario(
      name: 'single_failure_at_$atSequence',
      injections: [
        FailureInjection(
          sequenceOrder: atSequence,
          failureResult: FailureResult(
            type: type,
            message: message ?? 'Simulated ${type.name} at sequence $atSequence',
            retryable: type.isRecoverable,
          ),
        ),
      ],
    );
  }

  /// Creates a scenario with multiple failures.
  factory FailureScenario.multipleFailures(List<(int, FailureType)> failures) {
    return FailureScenario(
      name: 'multiple_failures',
      injections: failures
          .map((f) => FailureInjection(
                sequenceOrder: f.$1,
                failureResult: FailureResult(
                  type: f.$2,
                  message: 'Simulated ${f.$2.name} at sequence ${f.$1}',
                  retryable: f.$2.isRecoverable,
                ),
              ))
          .toList(),
    );
  }

  /// Returns the failure injection for a given sequence, or null if none.
  FailureInjection? injectionAt(int sequenceOrder) {
    for (final injection in injections) {
      if (injection.sequenceOrder == sequenceOrder) {
        return injection;
      }
    }
    return null;
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FailureScenario &&
          name == other.name &&
          _listEquals(injections, other.injections));

  static bool _listEquals(List<FailureInjection> a, List<FailureInjection> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(name, Object.hashAll(injections));

  Map<String, dynamic> toJson() => {
        'name': name,
        'injections': injections.map((i) => i.toJson()).toList(),
      };
}

/// Adapter that simulates failures based on a FailureScenario.
/// Implements MediaExecutionPort for integration with the execution pipeline.
class FailureSimulatorAdapter implements MediaExecutionPort {
  const FailureSimulatorAdapter({
    required this.scenario,
    this.failOnTypes = const {},
  });

  /// The failure scenario to simulate.
  final FailureScenario scenario;

  /// Additional failure by operation type.
  final Set<PhysicalOperationType> failOnTypes;

  /// Creates an adapter with no failures.
  const FailureSimulatorAdapter.noFailures()
      : scenario = const FailureScenario.noFailures(),
        failOnTypes = const {};

  /// Creates an adapter that fails at specific sequences.
  factory FailureSimulatorAdapter.failAt(
    List<int> sequences, {
    FailureType type = FailureType.executionException,
  }) {
    return FailureSimulatorAdapter(
      scenario: FailureScenario.multipleFailures(
        sequences.map((s) => (s, type)).toList(),
      ),
    );
  }

  /// Creates an adapter that fails on specific operation types.
  factory FailureSimulatorAdapter.failOnOperationType(
    Set<PhysicalOperationType> types, {
    FailureType failureType = FailureType.executionException,
  }) {
    return FailureSimulatorAdapter(
      scenario: const FailureScenario.noFailures(),
      failOnTypes: types,
    );
  }

  @override
  Future<ExecutionResult> execute(PhysicalOperation operation) async {
    // Check for type-based failure first
    if (failOnTypes.contains(operation.type)) {
      return ExecutionResult.failed(
        operation,
        ExecutionFailure(
          code: 'TYPE_FAILURE',
          message: 'Simulated failure for operation type ${operation.type.name}',
        ),
      );
    }

    // Check for sequence-based failure
    final injection = scenario.injectionAt(operation.sequenceOrder);
    if (injection != null) {
      return ExecutionResult.failed(
        operation,
        ExecutionFailure(
          code: injection.failureResult.type.code,
          message: injection.failureResult.message,
        ),
      );
    }

    // No failure configured, return success
    return ExecutionResult.success(operation);
  }
}
