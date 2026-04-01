/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

import 'package:iris_flutter_app/core/deterministic/base/base_deterministic_event.dart';
import 'package:iris_flutter_app/core/deterministic/base/event_source.dart';

class IncrementCounterEvent extends BaseDeterministicEvent {
  IncrementCounterEvent({
    required this.amount,
    required int eventIndex,
    required EventSource source,
  }) : super(eventIndex: eventIndex, source: source);

  final int amount;

  @override
  Map<String, dynamic> toDeterministicPayload() => {
        'type': 'increment_counter',
        'amount': amount,
      };
}
