// J2
class PersistedGovernanceSnapshot {
  PersistedGovernanceSnapshot({
    required this.executionId,
    required this.schemaVersion,
    required this.governanceHash,
    required this.lifecycleHash,
    required Map<String, Object> governanceData,
    required Map<String, Object> lifecycleData,
    required this.logicalTimestamp,
  })  : governanceData = Map.unmodifiable(Map<String, Object>.from(governanceData)),
        lifecycleData = Map.unmodifiable(Map<String, Object>.from(lifecycleData));
  final String executionId;
  final String schemaVersion;
  final String governanceHash;
  final String lifecycleHash;
  final Map<String, Object> governanceData;
  final Map<String, Object> lifecycleData;
  final int logicalTimestamp;
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PersistedGovernanceSnapshot &&
          executionId == other.executionId &&
          schemaVersion == other.schemaVersion &&
          governanceHash == other.governanceHash &&
          lifecycleHash == other.lifecycleHash &&
          logicalTimestamp == other.logicalTimestamp);
  @override
  int get hashCode =>
      Object.hash(executionId, schemaVersion, governanceHash, lifecycleHash, logicalTimestamp);
  Map<String, Object> toMap() => {
        'executionId': executionId,
        'schemaVersion': schemaVersion,
        'governanceHash': governanceHash,
        'lifecycleHash': lifecycleHash,
        'governanceData': Map<String, Object>.from(governanceData),
        'lifecycleData': Map<String, Object>.from(lifecycleData),
        'logicalTimestamp': logicalTimestamp,
      };
  factory PersistedGovernanceSnapshot.fromMap(Map<String, dynamic> map) {
    return PersistedGovernanceSnapshot(
      executionId: map['executionId'] as String,
      schemaVersion: map['schemaVersion'] as String,
      governanceHash: map['governanceHash'] as String,
      lifecycleHash: map['lifecycleHash'] as String,
      governanceData: Map.unmodifiable(Map<String, Object>.from(map['governanceData'] as Map? ?? {})),
      lifecycleData: Map.unmodifiable(Map<String, Object>.from(map['lifecycleData'] as Map? ?? {})),
      logicalTimestamp: map['logicalTimestamp'] as int,
    );
  }
}
