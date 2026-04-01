// J2
class PersistedExecutionResult {
  PersistedExecutionResult({
    required this.executionId,
    required this.schemaVersion,
    required this.resultHash,
    required Map<String, Object> resultData,
    required this.logicalTimestamp,
  }) : resultData = Map.unmodifiable(Map<String, Object>.from(resultData));
  final String executionId;
  final String schemaVersion;
  final String resultHash;
  final Map<String, Object> resultData;
  final int logicalTimestamp;
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PersistedExecutionResult &&
          executionId == other.executionId &&
          schemaVersion == other.schemaVersion &&
          resultHash == other.resultHash &&
          logicalTimestamp == other.logicalTimestamp);
  @override
  int get hashCode => Object.hash(executionId, schemaVersion, resultHash, logicalTimestamp);
  Map<String, Object> toMap() => {
        'executionId': executionId,
        'schemaVersion': schemaVersion,
        'resultHash': resultHash,
        'resultData': Map<String, Object>.from(resultData),
        'logicalTimestamp': logicalTimestamp,
      };
  factory PersistedExecutionResult.fromMap(Map<String, dynamic> map) {
    return PersistedExecutionResult(
      executionId: map['executionId'] as String,
      schemaVersion: map['schemaVersion'] as String,
      resultHash: map['resultHash'] as String,
      resultData: Map.unmodifiable(Map<String, Object>.from(map['resultData'] as Map? ?? {})),
      logicalTimestamp: map['logicalTimestamp'] as int,
    );
  }
}
