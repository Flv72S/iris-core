import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';
import 'package:iris_flutter_app/core/deterministic/base/event_source.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_increment_event.dart';
import 'package:iris_flutter_app/core/deterministic/utils/canonical_serializer.dart';

void main() {
  group('BaseDeterministicEvent hash consistency', () {
    test('eventIndex < 0 throws DeterministicViolation', () {
      expect(
        () => IncrementCounterEvent(
          amount: 1,
          eventIndex: -1,
          source: EventSource.internal,
        ),
        throwsA(isA<DeterministicViolation>()),
      );
    });

    test('same payload, different eventIndex → same deterministicHash', () {
      final a = IncrementCounterEvent(
        amount: 1,
        eventIndex: 0,
        source: EventSource.internal,
      );
      final b = IncrementCounterEvent(
        amount: 1,
        eventIndex: 10,
        source: EventSource.internal,
      );
      expect(a.deterministicHash, b.deterministicHash);
    });

    test('same payload, different source → same deterministicHash', () {
      final a = IncrementCounterEvent(
        amount: 2,
        eventIndex: 0,
        source: EventSource.internal,
      );
      final b = IncrementCounterEvent(
        amount: 2,
        eventIndex: 0,
        source: EventSource.gateway,
      );
      expect(a.deterministicHash, b.deterministicHash);
    });

    test('different payload → different deterministicHash', () {
      final a = IncrementCounterEvent(
        amount: 1,
        eventIndex: 0,
        source: EventSource.internal,
      );
      final b = IncrementCounterEvent(
        amount: 2,
        eventIndex: 0,
        source: EventSource.internal,
      );
      expect(a.deterministicHash, isNot(b.deterministicHash));
    });

    test('identical events → identical canonical payload bytes', () {
      final a = IncrementCounterEvent(
        amount: 3,
        eventIndex: 5,
        source: EventSource.external,
      );
      final b = IncrementCounterEvent(
        amount: 3,
        eventIndex: 5,
        source: EventSource.external,
      );
      final bytesA = CanonicalSerializer.canonicalSerialize(a.toDeterministicPayload());
      final bytesB = CanonicalSerializer.canonicalSerialize(b.toDeterministicPayload());
      expect(bytesA, bytesB);
    });
  });
}
