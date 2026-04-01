// J2
class PersistedObservabilityEvent {
  PersistedObservabilityEvent({
    required this.executionId,
    required this.eventId,
    required this.eventType,
    required Map<String, Object> payload,
    required this.logicalTimestamp,
    required this.eventHash,
    required this.schemaVersion,
  }) : payload = Map.unmodifiable(Map<String, Object>.from(payload));
  final String executionId;
  final String eventId;
  final String eventType;
  final Map<String, Object> payload;
  final int logicalTimestamp;
  final String eventHash;
  final String schemaVersion;
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PersistedObservabilityEvent &&
          executionId == other.executionId &&
          eventId == other.eventId &&
          eventType == other.eventType &&
          logicalTimestamp == other.logicalTimestamp &&
          eventHash == other.eventHash &&
          schemaVersion == other.schemaVersion);
  @override
  int get hashCode =>
      Object.hash(executionId, eventId, eventType, logicalTimestamp, eventHash, schemaVersion);
  Map<String, Object> toMap() => {
        'executionId': executionId,
        'eventId': eventId,
        'eventType': eventType,
        'payload': Map<String, Object>.from(payload),
        'logicalTimestamp': logicalTimestamp,
        'eventHash': eventHash,
        'schemaVersion': schemaVersion,
      };
  factory PersistedObservabilityEvent.fromMap(Map<String, dynamic> map) {
    return PersistedObservabilityEvent(
      executionId: map['executionId'] as String,
      eventId: map['eventId'] as String,
      eventType: map['eventType'] as String,
      payload: Map.unmodifiable(Map<String, Object>.from(map['payload'] as Map? ?? {})),
      logicalTimestamp: map['logicalTimestamp'] as int,
      eventHash: map['eventHash'] as String,
      schemaVersion: map['schemaVersion'] as String,
    );
  }
}
