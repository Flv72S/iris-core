// I6 - Failure policy. Maps FailureType to ExecutionAction. Deterministic; pure.

import 'failure_type.dart';

/// Actions that can be taken in response to a failure.
enum ExecutionAction {
  /// Retry the operation (if retryable)
  retry,

  /// Abort the entire execution plan
  abort,

  /// Skip the current operation and continue
  skip,

  /// Escalate for manual intervention (logged but continues)
  escalate,
}

/// Extension for ExecutionAction utilities.
extension ExecutionActionExtension on ExecutionAction {
  /// Returns true if this action stops execution.
  bool get stopsExecution => this == ExecutionAction.abort;

  /// Returns true if this action allows continuation.
  bool get allowsContinuation =>
      this == ExecutionAction.skip || this == ExecutionAction.escalate;

  /// Returns a stable string code for serialization.
  String get code => name;
}

/// Interface for determining the action to take for a given failure type.
abstract interface class FailurePolicy {
  /// Returns the action to take for the given failure type.
  ExecutionAction actionFor(FailureType type);
}

/// Default failure policy with deterministic behavior.
/// Provides a sensible default mapping for testing and production.
class DefaultFailurePolicy implements FailurePolicy {
  const DefaultFailurePolicy();

  @override
  ExecutionAction actionFor(FailureType type) {
    switch (type) {
      case FailureType.validationError:
        return ExecutionAction.abort;
      case FailureType.policyViolation:
        return ExecutionAction.abort;
      case FailureType.storageUnavailable:
        return ExecutionAction.retry;
      case FailureType.networkError:
        return ExecutionAction.retry;
      case FailureType.executionException:
        return ExecutionAction.abort;
      case FailureType.timeout:
        return ExecutionAction.retry;
      case FailureType.unknown:
        return ExecutionAction.escalate;
    }
  }
}

/// Strict failure policy that aborts on any failure.
class StrictFailurePolicy implements FailurePolicy {
  const StrictFailurePolicy();

  @override
  ExecutionAction actionFor(FailureType type) => ExecutionAction.abort;
}

/// Lenient failure policy that skips non-critical failures.
class LenientFailurePolicy implements FailurePolicy {
  const LenientFailurePolicy();

  @override
  ExecutionAction actionFor(FailureType type) {
    switch (type) {
      case FailureType.validationError:
      case FailureType.policyViolation:
        return ExecutionAction.abort;
      case FailureType.storageUnavailable:
      case FailureType.networkError:
      case FailureType.timeout:
        return ExecutionAction.skip;
      case FailureType.executionException:
        return ExecutionAction.escalate;
      case FailureType.unknown:
        return ExecutionAction.skip;
    }
  }
}

/// Custom failure policy with configurable mappings.
class CustomFailurePolicy implements FailurePolicy {
  const CustomFailurePolicy(this._mappings, {this.fallback = ExecutionAction.abort});

  final Map<FailureType, ExecutionAction> _mappings;
  final ExecutionAction fallback;

  @override
  ExecutionAction actionFor(FailureType type) => _mappings[type] ?? fallback;
}
