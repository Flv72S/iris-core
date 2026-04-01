// Phase 11.5.1 — Immutable persistence records. Serializable, deterministic hash. Append-only.

import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/mappers/hash_utils.dart';

/// Base for all persisted records. Immutable, canonical JSON, SHA-256 hash.
abstract class PersistenceRecord {
  const PersistenceRecord();

  String get recordId;
  String get contentHash;
  String get recordType;

  Map<String, dynamic> toJson();

  static PersistenceRecord fromJson(Map<String, dynamic> json) {
    final type = json['recordType'] as String?;
    if (type == 'trace') return TraceRecord.fromJson(json);
    if (type == 'time_context') return TimeContextRecord.fromJson(json);
    if (type == 'session_start') return SessionStartRecord.fromJson(json);
    throw ArgumentError('Unknown recordType: $type');
  }
}

/// Persisted trace. recordId = traceId.
class TraceRecord extends PersistenceRecord {
  const TraceRecord({required this.traceJson});

  final Map<String, dynamic> traceJson;

  @override
  String get recordId => traceJson['traceId'] as String;

  @override
  String get recordType => 'trace';

  @override
  String get contentHash => computeDeterministicHash(toJson());

  @override
  Map<String, dynamic> toJson() => <String, dynamic>{
        'recordType': recordType,
        'traceJson': Map<String, dynamic>.from(traceJson),
      };

  static TraceRecord fromJson(Map<String, dynamic> json) {
    return TraceRecord(
      traceJson: Map<String, dynamic>.from(json['traceJson'] as Map),
    );
  }

  static TraceRecord fromTrace(DecisionTraceDto trace) {
    return TraceRecord(traceJson: trace.toJson());
  }
}

/// Persisted time context snapshot. recordId = time_<sessionId>_<tick>.
class TimeContextRecord extends PersistenceRecord {
  const TimeContextRecord({
    required this.sessionId,
    required this.tick,
    required this.origin,
  });

  final String sessionId;
  final int tick;
  final String origin;

  @override
  String get recordId => 'time_${sessionId}_$tick';

  @override
  String get recordType => 'time_context';

  @override
  String get contentHash => computeDeterministicHash(toJson());

  @override
  Map<String, dynamic> toJson() => <String, dynamic>{
        'recordType': recordType,
        'sessionId': sessionId,
        'tick': tick,
        'origin': origin,
      };

  static TimeContextRecord fromJson(Map<String, dynamic> json) {
    return TimeContextRecord(
      sessionId: json['sessionId'] as String,
      tick: json['tick'] as int,
      origin: json['origin'] as String,
    );
  }

  static TimeContextRecord fromContext(
    String sessionIdValue,
    int tick,
    String origin,
  ) {
    return TimeContextRecord(
      sessionId: sessionIdValue,
      tick: tick,
      origin: origin,
    );
  }
}

/// Persisted session start event. recordId = session_start_<sessionId>.
class SessionStartRecord extends PersistenceRecord {
  const SessionStartRecord({required this.sessionId});

  final String sessionId;

  @override
  String get recordId => 'session_start_$sessionId';

  @override
  String get recordType => 'session_start';

  @override
  String get contentHash => computeDeterministicHash(toJson());

  @override
  Map<String, dynamic> toJson() => <String, dynamic>{
        'recordType': recordType,
        'sessionId': sessionId,
      };

  static SessionStartRecord fromJson(Map<String, dynamic> json) {
    return SessionStartRecord(sessionId: json['sessionId'] as String);
  }
}
