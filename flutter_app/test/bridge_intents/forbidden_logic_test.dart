import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/channel/stub_intent_channel.dart';
import 'package:iris_flutter_app/bridge/intents/action_intent.dart';

void main() {
  group('Forbidden logic', () {
    test('stub returns fixed trace regardless of intent content', () async {
      final channel = StubIntentChannel();
      const i1 = ActionIntent(
        intentId: 'x',
        actionType: 'y',
        parameters: <String, dynamic>{},
        timestamp: 't1',
      );
      const i2 = ActionIntent(
        intentId: 'other',
        actionType: 'other',
        parameters: <String, dynamic>{'a': 1},
        timestamp: 't2',
      );
      final r1 = await channel.sendAction(i1);
      final r2 = await channel.sendAction(i2);
      expect(r1.traceId, r2.traceId);
      expect(r1.timestamp, '1970-01-01T00:00:00Z');
    });

    test('intent/channel source does not use DateTime.now()', () {
      final dir = Directory('lib/bridge');
      if (!dir.existsSync()) return;
      for (final entity in dir.listSync(recursive: true)) {
        if (entity is File && entity.path.endsWith('.dart')) {
          final content = entity.readAsStringSync();
          expect(
            content.contains('DateTime.now()'),
            isFalse,
            reason: '${entity.path} must not use DateTime.now()',
          );
        }
      }
    });

    test('intent/channel source does not use Random()', () {
      final dir = Directory('lib/bridge');
      if (!dir.existsSync()) return;
      for (final entity in dir.listSync(recursive: true)) {
        if (entity is File && entity.path.endsWith('.dart')) {
          final content = entity.readAsStringSync();
          expect(
            content.contains('Random()'),
            isFalse,
            reason: '${entity.path} must not use Random()',
          );
        }
      }
    });
  });
}
