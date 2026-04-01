// I7 - Observability serializer. JSON serialization and deterministic hashing.

import 'dart:convert';

import 'package:iris_flutter_app/flow_media/failure_semantics/failure_result.dart';
import 'package:iris_flutter_app/flow_media/media_enforcement_decision.dart';
import 'package:iris_flutter_app/flow_media/media_reference.dart';
import 'package:iris_flutter_app/flow_media/physical_location.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';

import 'observability_event.dart';

/// Utility class for serializing observability data and computing hashes.
class ObservabilitySerializer {
  ObservabilitySerializer._();

  /// Computes a deterministic hash of a string.
  /// Uses a simple but deterministic algorithm suitable for audit purposes.
  static String computeHash(String input) {
    var hash = 0;
    for (var i = 0; i < input.length; i++) {
      final char = input.codeUnitAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & 0xFFFFFFFF;
    }
    return hash.toRadixString(16).padLeft(8, '0');
  }

  /// Computes a deterministic hash of an ObservabilityEvent.
  static String computeEventHash(ObservabilityEvent event) {
    final canonicalJson = _canonicalizeJson(event.toJson());
    return computeHash(canonicalJson);
  }

  /// Produces a canonical JSON string with sorted keys.
  static String _canonicalizeJson(Map<String, dynamic> json) {
    return jsonEncode(_sortedMap(json));
  }

  /// Recursively sorts map keys for deterministic serialization.
  static dynamic _sortedMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      final sortedKeys = value.keys.toList()..sort();
      final sorted = <String, dynamic>{};
      for (final key in sortedKeys) {
        sorted[key] = _sortedMap(value[key]);
      }
      return sorted;
    } else if (value is List) {
      return value.map(_sortedMap).toList();
    }
    return value;
  }

  /// Serializes an ObservabilityEvent to canonical JSON string.
  static String eventToJsonString(ObservabilityEvent event) {
    return _canonicalizeJson(event.toJson());
  }

  /// Deserializes an ObservabilityEvent from JSON map.
  static ObservabilityEvent eventFromJson(Map<String, dynamic> json) {
    final eventTypeStr = json['eventType'] as String;
    final eventType = ObservabilityEventType.values.firstWhere(
      (t) => t.name == eventTypeStr,
      orElse: () => ObservabilityEventType.operationFailed,
    );

    final mediaRefJson = json['mediaRef'] as Map<String, dynamic>;
    final mediaRef = MediaReference.fromJson(mediaRefJson);

    final tierBindingJson = json['tierBinding'] as Map<String, dynamic>;
    final tierBinding = _tierBindingFromJson(tierBindingJson);

    final decisionJson = json['decision'] as Map<String, dynamic>;
    final decision = _decisionFromJson(decisionJson);

    final failureJson = json['failure'] as Map<String, dynamic>?;
    final failure = failureJson != null ? FailureResult.fromJson(failureJson) : null;

    final metadataJson = json['metadata'] as Map<String, dynamic>? ?? {};

    return ObservabilityEvent(
      eventId: json['eventId'] as String,
      eventType: eventType,
      mediaRef: mediaRef,
      tierBinding: tierBinding,
      decision: decision,
      logicalStep: json['logicalStep'] as int,
      failure: failure,
      metadata: metadataJson,
    );
  }

  static UserTierBinding _tierBindingFromJson(Map<String, dynamic> json) {
    final tierStr = json['tier'] as String;
    final tier = UserTier.values.firstWhere(
      (t) => t.name == tierStr,
      orElse: () => UserTier.free,
    );
    return UserTierBinding(
      tier: tier,
      mediaPolicyId: json['mediaPolicyId'] as String,
    );
  }

  static MediaEnforcementDecision _decisionFromJson(Map<String, dynamic> json) {
    return MediaEnforcementDecision(
      uploadAllowed: json['uploadAllowed'] as bool,
      localOnly: json['localOnly'] as bool,
      cloudAllowed: json['cloudAllowed'] as bool,
      compressionRequired: json['compressionRequired'] as bool,
      coldArchiveAllowed: json['coldArchiveAllowed'] as bool,
      multiDeviceSyncAllowed: json['multiDeviceSyncAllowed'] as bool,
      maxFileSizeBytes: json['maxFileSizeBytes'] as int,
    );
  }

  /// Computes a hash chain from multiple events.
  /// Each hash depends on the previous, creating a tamper-evident chain.
  static String computeHashChain(List<ObservabilityEvent> events) {
    var chainHash = '00000000';
    for (final event in events) {
      final eventHash = computeEventHash(event);
      chainHash = computeHash('$chainHash:$eventHash');
    }
    return chainHash;
  }

  /// Verifies that an event hash matches the event content.
  static bool verifyEventHash(ObservabilityEvent event, String expectedHash) {
    return computeEventHash(event) == expectedHash;
  }
}
