// Phase 11.6.1 — Immutable forensic export bundle. Deterministic, hash-verifiable.

import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';
import 'package:iris_flutter_app/ui/time_model/logical_time.dart';

/// Immutable forensic export bundle. Read-only; no wall-clock.
class ForensicBundle {
  const ForensicBundle({
    required this.bundleVersion,
    required this.appVersion,
    required this.exportedAtLogicalTime,
    required this.sessionId,
    required this.records,
    required this.bundleHash,
  });

  final String bundleVersion;
  final String appVersion;
  final LogicalTime exportedAtLogicalTime;
  final String sessionId;
  final List<PersistenceRecord> records;
  final String bundleHash;

  /// Parses from map (e.g. from JSON file). For replay and verification.
  static ForensicBundle fromJson(Map<String, dynamic> json) {
    final lt = json['exportedAtLogicalTime'] as Map<String, dynamic>;
    final recordsJson = json['records'] as List<dynamic>;
    final records = recordsJson
        .map((e) => PersistenceRecord.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
    return ForensicBundle(
      bundleVersion: json['bundleVersion'] as String,
      appVersion: json['appVersion'] as String,
      exportedAtLogicalTime: LogicalTime(
        tick: lt['tick'] as int,
        origin: lt['origin'] as String,
      ),
      sessionId: json['sessionId'] as String,
      records: records,
      bundleHash: json['bundleHash'] as String,
    );
  }
}
