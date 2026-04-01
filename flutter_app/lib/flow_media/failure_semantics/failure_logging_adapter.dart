// I6 - Failure logging adapter. Immutable audit log; no DateTime dependency.

import 'dart:convert';

import 'failure_policy.dart';
import 'failure_result.dart';
import 'failure_type.dart';

/// Immutable log entry for a failure event.
class FailureLogEntry {
  const FailureLogEntry({
    required this.stepNumber,
    required this.operationId,
    required this.failureResult,
    required this.actionTaken,
  });

  /// Logical step number (not timestamp-based).
  final int stepNumber;

  /// Identifier of the operation that failed.
  final String operationId;

  /// The failure result.
  final FailureResult failureResult;

  /// The action taken in response.
  final ExecutionAction actionTaken;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FailureLogEntry &&
          stepNumber == other.stepNumber &&
          operationId == other.operationId &&
          failureResult == other.failureResult &&
          actionTaken == other.actionTaken);

  @override
  int get hashCode => Object.hash(stepNumber, operationId, failureResult, actionTaken);

  Map<String, dynamic> toJson() => {
        'stepNumber': stepNumber,
        'operationId': operationId,
        'failureResult': failureResult.toJson(),
        'actionTaken': actionTaken.code,
      };

  factory FailureLogEntry.fromJson(Map<String, dynamic> json) {
    return FailureLogEntry(
      stepNumber: json['stepNumber'] as int,
      operationId: json['operationId'] as String,
      failureResult: FailureResult.fromJson(json['failureResult'] as Map<String, dynamic>),
      actionTaken: ExecutionAction.values.firstWhere(
        (a) => a.code == json['actionTaken'],
        orElse: () => ExecutionAction.abort,
      ),
    );
  }

  @override
  String toString() =>
      'FailureLogEntry(step: $stepNumber, op: $operationId, type: ${failureResult.type}, action: $actionTaken)';
}

/// Immutable failure log containing all failure events.
class FailureLog {
  const FailureLog(this._entries);

  /// Creates an empty failure log.
  const FailureLog.empty() : _entries = const [];

  final List<FailureLogEntry> _entries;

  /// Returns an unmodifiable view of all entries.
  List<FailureLogEntry> get entries => List.unmodifiable(_entries);

  /// Returns the number of entries.
  int get length => _entries.length;

  /// Returns true if the log is empty.
  bool get isEmpty => _entries.isEmpty;

  /// Returns true if the log is not empty.
  bool get isNotEmpty => _entries.isNotEmpty;

  /// Returns all entries with the given failure type.
  List<FailureLogEntry> entriesWithType(FailureType type) {
    return _entries.where((e) => e.failureResult.type == type).toList();
  }

  /// Returns all entries with the given action.
  List<FailureLogEntry> entriesWithAction(ExecutionAction action) {
    return _entries.where((e) => e.actionTaken == action).toList();
  }

  /// Returns true if any entry has the given failure type.
  bool hasFailureType(FailureType type) {
    return _entries.any((e) => e.failureResult.type == type);
  }

  /// Returns true if execution was aborted.
  bool get wasAborted {
    return _entries.any((e) => e.actionTaken == ExecutionAction.abort);
  }

  /// Returns the entry that caused abortion, if any.
  FailureLogEntry? get abortingEntry {
    for (final entry in _entries) {
      if (entry.actionTaken == ExecutionAction.abort) {
        return entry;
      }
    }
    return null;
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FailureLog && _listEquals(_entries, other._entries));

  static bool _listEquals(List<FailureLogEntry> a, List<FailureLogEntry> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hashAll(_entries);

  Map<String, dynamic> toJson() => {
        'entries': _entries.map((e) => e.toJson()).toList(),
      };

  factory FailureLog.fromJson(Map<String, dynamic> json) {
    final entriesJson = json['entries'] as List;
    return FailureLog(
      entriesJson
          .map((e) => FailureLogEntry.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  String toJsonString() => jsonEncode(toJson());
}

/// Builder for creating FailureLog immutably.
class FailureLogBuilder {
  FailureLogBuilder() : _entries = [];

  final List<FailureLogEntry> _entries;
  int _stepCounter = 0;

  /// Logs a failure event.
  void log({
    required String operationId,
    required FailureResult failureResult,
    required ExecutionAction actionTaken,
  }) {
    _entries.add(FailureLogEntry(
      stepNumber: _stepCounter++,
      operationId: operationId,
      failureResult: failureResult,
      actionTaken: actionTaken,
    ));
  }

  /// Logs a failure and determines action using the provided policy.
  ExecutionAction logWithPolicy({
    required String operationId,
    required FailureResult failureResult,
    required FailurePolicy policy,
  }) {
    final action = policy.actionFor(failureResult.type);
    log(
      operationId: operationId,
      failureResult: failureResult,
      actionTaken: action,
    );
    return action;
  }

  /// Builds an immutable FailureLog.
  FailureLog build() => FailureLog(List.unmodifiable(_entries));

  /// Returns the current step count.
  int get currentStep => _stepCounter;
}

/// Adapter that wraps execution and logs failures.
class FailureLoggingAdapter {
  const FailureLoggingAdapter({
    required this.policy,
  });

  /// The failure policy to use.
  final FailurePolicy policy;

  /// Processes a failure result and returns the action to take.
  /// Does not maintain state; use FailureLogBuilder for stateful logging.
  ExecutionAction processFailure(FailureResult failure) {
    return policy.actionFor(failure.type);
  }

  /// Determines if execution should continue after a failure.
  bool shouldContinue(FailureResult failure) {
    final action = policy.actionFor(failure.type);
    return action.allowsContinuation;
  }

  /// Determines if the failure should be retried.
  bool shouldRetry(FailureResult failure) {
    return policy.actionFor(failure.type) == ExecutionAction.retry && failure.retryable;
  }
}
