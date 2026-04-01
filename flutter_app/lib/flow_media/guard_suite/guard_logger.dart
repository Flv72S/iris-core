// I8 - Guard logger. Serialization and deterministic hashing of guard results.

import 'dart:convert';

import '../observability/observability_serializer.dart';
import 'guard_rules.dart';

/// Immutable record of a guard suite run.
class GuardRunRecord {
  const GuardRunRecord({
    required this.runId,
    required this.contextId,
    required this.violations,
    required this.runHash,
    required this.passed,
    this.metadata = const {},
  });

  final String runId;
  final String contextId;
  final List<GuardViolation> violations;
  final String runHash;
  final bool passed;
  final Map<String, dynamic> metadata;

  /// Number of violations.
  int get violationCount => violations.length;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GuardRunRecord &&
          runId == other.runId &&
          contextId == other.contextId &&
          runHash == other.runHash &&
          passed == other.passed &&
          violationCount == other.violationCount);

  @override
  int get hashCode =>
      Object.hash(runId, contextId, runHash, passed, violationCount);

  Map<String, dynamic> toJson() => {
        'runId': runId,
        'contextId': contextId,
        'violations': violations.map((v) => v.toJson()).toList(),
        'violationCount': violationCount,
        'runHash': runHash,
        'passed': passed,
        'metadata': metadata,
      };

  /// JSON string for CI/CD or audit.
  String toJsonString() => jsonEncode(toJson());
}

/// Computes a deterministic hash for a guard run.
String computeGuardRunHash(
  String runId,
  String contextId,
  List<GuardViolation> violations,
  Map<String, dynamic> metadata,
) {
  final parts = <String>[
    runId,
    contextId,
    violations.length.toString(),
    ...violations.map((v) => '${v.rule.id}:${v.location}:${v.message}'),
    jsonEncode(_sortedMap(metadata)),
  ];
  return ObservabilitySerializer.computeHash(parts.join('|'));
}

dynamic _sortedMap(dynamic value) {
  if (value is Map) {
    final sorted = <String, dynamic>{};
    final keys = (value as Map).keys.cast<String>().toList()..sort();
    for (final k in keys) {
      sorted[k] = _sortedMap((value as Map)[k]);
    }
    return sorted;
  }
  if (value is List) {
    return (value as List).map(_sortedMap).toList();
  }
  return value;
}

/// Builder for guard run records.
class GuardRunRecordBuilder {
  GuardRunRecordBuilder({
    required this.runId,
    required this.contextId,
    List<GuardViolation>? violations,
    Map<String, dynamic>? metadata,
  })  : _violations = List.from(violations ?? []),
        _metadata = Map.from(metadata ?? {});

  final String runId;
  final String contextId;
  final List<GuardViolation> _violations;
  final Map<String, dynamic> _metadata;

  void addViolation(GuardViolation v) {
    _violations.add(v);
  }

  void addMetadata(String key, dynamic value) {
    _metadata[key] = value;
  }

  GuardRunRecord build() {
    final passed = _violations.isEmpty;
    final runHash =
        computeGuardRunHash(runId, contextId, _violations, _metadata);
    return GuardRunRecord(
      runId: runId,
      contextId: contextId,
      violations: List.unmodifiable(_violations),
      runHash: runHash,
      passed: passed,
      metadata: Map.unmodifiable(_metadata),
    );
  }
}
