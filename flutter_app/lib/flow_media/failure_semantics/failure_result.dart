// I6 - Failure result value object. Immutable; hashable; serializable.

import 'dart:convert';

import 'failure_type.dart';

/// Immutable value object representing a failure in the execution pipeline.
/// Contains type, message, metadata, and retryable flag.
class FailureResult {
  const FailureResult({
    required this.type,
    required this.message,
    this.metadata = const {},
    required this.retryable,
  });

  /// The type of failure.
  final FailureType type;

  /// Human-readable message describing the failure.
  final String message;

  /// Additional metadata about the failure (immutable map).
  final Map<String, dynamic> metadata;

  /// Whether this failure is potentially retryable.
  final bool retryable;

  /// Creates a validation error result.
  factory FailureResult.validationError(String message, {Map<String, dynamic>? metadata}) {
    return FailureResult(
      type: FailureType.validationError,
      message: message,
      metadata: metadata ?? const {},
      retryable: false,
    );
  }

  /// Creates a policy violation result.
  factory FailureResult.policyViolation(String message, {Map<String, dynamic>? metadata}) {
    return FailureResult(
      type: FailureType.policyViolation,
      message: message,
      metadata: metadata ?? const {},
      retryable: false,
    );
  }

  /// Creates a storage unavailable result.
  factory FailureResult.storageUnavailable(String message, {Map<String, dynamic>? metadata}) {
    return FailureResult(
      type: FailureType.storageUnavailable,
      message: message,
      metadata: metadata ?? const {},
      retryable: true,
    );
  }

  /// Creates a network error result.
  factory FailureResult.networkError(String message, {Map<String, dynamic>? metadata}) {
    return FailureResult(
      type: FailureType.networkError,
      message: message,
      metadata: metadata ?? const {},
      retryable: true,
    );
  }

  /// Creates a timeout result.
  factory FailureResult.timeout(String message, {Map<String, dynamic>? metadata}) {
    return FailureResult(
      type: FailureType.timeout,
      message: message,
      metadata: metadata ?? const {},
      retryable: true,
    );
  }

  /// Creates an execution exception result.
  factory FailureResult.executionException(String message, {Map<String, dynamic>? metadata}) {
    return FailureResult(
      type: FailureType.executionException,
      message: message,
      metadata: metadata ?? const {},
      retryable: false,
    );
  }

  /// Creates an unknown error result.
  factory FailureResult.unknown(String message, {Map<String, dynamic>? metadata}) {
    return FailureResult(
      type: FailureType.unknown,
      message: message,
      metadata: metadata ?? const {},
      retryable: false,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FailureResult &&
          type == other.type &&
          message == other.message &&
          _mapEquals(metadata, other.metadata) &&
          retryable == other.retryable);

  static bool _mapEquals(Map<String, dynamic> a, Map<String, dynamic> b) {
    if (a.length != b.length) return false;
    for (final key in a.keys) {
      if (!b.containsKey(key) || a[key] != b[key]) return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final sortedKeys = metadata.keys.toList()..sort();
    final metadataHash = Object.hashAll(
      sortedKeys.map((k) => Object.hash(k, metadata[k])),
    );
    return Object.hash(type, message, metadataHash, retryable);
  }

  /// Serializes to JSON map.
  Map<String, dynamic> toJson() => {
        'type': type.code,
        'message': message,
        'metadata': metadata,
        'retryable': retryable,
      };

  /// Deserializes from JSON map.
  factory FailureResult.fromJson(Map<String, dynamic> json) {
    final typeCode = json['type'] as String;
    final type = FailureType.values.firstWhere(
      (t) => t.code == typeCode,
      orElse: () => FailureType.unknown,
    );
    return FailureResult(
      type: type,
      message: json['message'] as String,
      metadata: Map<String, dynamic>.from(json['metadata'] as Map? ?? {}),
      retryable: json['retryable'] as bool,
    );
  }

  /// Serializes to JSON string.
  String toJsonString() => jsonEncode(toJson());

  @override
  String toString() => 'FailureResult(type: $type, message: $message, retryable: $retryable)';
}
