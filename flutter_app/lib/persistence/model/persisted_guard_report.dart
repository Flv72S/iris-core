// J2 — PersistedGuardReport. Immutable; schema-versioned.

/// Persistible form of Architectural Guard Suite report.
/// Immutable; no business logic; logical timestamp from outside.
class PersistedGuardReport {
  PersistedGuardReport({
    required this.executionId,
    required this.schemaVersion,
    required this.compliant,
    required List<String> violations,
    required this.guardHash,
    required this.logicalTimestamp,
  }) : violations = List.unmodifiable(List<String>.from(violations));

  final String executionId;
  final String schemaVersion;
  final bool compliant;
  final List<String> violations;
  final String guardHash;
  final int logicalTimestamp;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PersistedGuardReport &&
          executionId == other.executionId &&
          schemaVersion == other.schemaVersion &&
          compliant == other.compliant &&
          guardHash == other.guardHash &&
          logicalTimestamp == other.logicalTimestamp &&
          _listEquals(violations, other.violations));

  static bool _listEquals(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(
        executionId,
        schemaVersion,
        compliant,
        guardHash,
        logicalTimestamp,
        Object.hashAll(violations),
      );

  Map<String, Object> toMap() => {
        'executionId': executionId,
        'schemaVersion': schemaVersion,
        'compliant': compliant,
        'violations': List<String>.from(violations),
        'guardHash': guardHash,
        'logicalTimestamp': logicalTimestamp,
      };

  factory PersistedGuardReport.fromMap(Map<String, dynamic> map) {
    final violationsRaw = map['violations'];
    final violationsList = violationsRaw is List
        ? List<String>.from(violationsRaw.map((e) => e.toString()))
        : <String>[];
    return PersistedGuardReport(
      executionId: map['executionId'] as String,
      schemaVersion: map['schemaVersion'] as String,
      compliant: map['compliant'] as bool,
      violations: List.unmodifiable(violationsList),
      guardHash: map['guardHash'] as String,
      logicalTimestamp: map['logicalTimestamp'] as int,
    );
  }
}
