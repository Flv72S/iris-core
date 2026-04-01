/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/core/deterministic/base/event_source.dart';
import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';
import 'package:iris_flutter_app/core/deterministic/utils/canonical_serializer.dart';
import 'package:iris_flutter_app/core/deterministic/utils/deterministic_hash.dart';

abstract class BaseDeterministicEvent implements DeterministicEvent {
  @override
  final int eventIndex;

  final EventSource _source;

  BaseDeterministicEvent({
    required this.eventIndex,
    required EventSource source,
  })  : _source = source {
    if (eventIndex < 0) {
      throw DeterministicViolation('eventIndex must be >= 0');
    }
  }

  Map<String, dynamic> toDeterministicPayload();

  late final int _deterministicHash = DeterministicHash.computeDeterministicHash(
    CanonicalSerializer.canonicalSerialize(toDeterministicPayload()),
  );

  @override
  int get deterministicHash => _deterministicHash;

  @override
  String get source => _source.name;
}
