// J2 — PersistedFailureEvent. Immutable; schema-versioned.

class PersistedFailureEvent {
  PersistedFailureEvent({
    required this.executionId,
    required this.failureCode,
    required this.failureType,
    required this.severity,
    required Map<String, Object> details,
    required this.logicalTimestamp,
    required this.failureHash,
    required this.schemaVersion,
  }) : details = Map.unmodifiable(Map<String, Object>.from(details));

  final String executionId;
  final String failureCode;
  final String failureType;
  final String severity;
  final Map<String, Object> details;
  final int logicalTimestamp;
  final String failureHash;
  final String schemaVersion;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PersistedFailureEvent &&
          executionId == other.executionId &&
          failureCode == other.failureCode &&
          failureType == other.failureType &&
          severity == other.severity &&
          logicalTimestamp == other.logicalTimestamp &&
          failureHash == other.failureHash &&
          schemaVersion == other.schemaVersion);

  @override
  int get hashCode => Object.hash(
        executionId,
        failureCode,
        failureType,
        severity,
        logicalTimestamp,
        failureHash,
        schemaVersion,
      );

  Map<String, Object> toMap() => {
        'executionId': executionId,
        'failureCode': failureCode,
        'failureType': failureType,
        'severity': severity,
        'details': Map<String, Object>.from(details),
        'logicalTimestamp': logicalTimestamp,
        'failureHash': failureHash,
        'schemaVersion': schemaVersion,
      };

  factory PersistedFailureEvent.fromMap(Map<String, dynamic> map) {
    return PersistedFailureEvent(
      executionId: map['executionId'] as String,
      failureCode: map['failureCode'] as String,
      failureType: map['failureType'] as String,
      severity: map['severity'] as String,
      details: Map.unmodifiable(Map<String, Object>.from(map['details'] as Map? ?? {})),
      logicalTimestamp: map['logicalTimestamp'] as int,
      failureHash: map['failureHash'] as String,
      schemaVersion: map['schemaVersion'] as String,
    );
  }
}
