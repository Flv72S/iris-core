import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/channel/stub_intent_channel.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/intents/action_intent.dart';
import 'package:iris_flutter_app/bridge/intents/mode_change_intent.dart';

void main() {
  late StubIntentChannel channel;

  setUp(() => channel = StubIntentChannel());

  group('Idempotency', () {
    test('same ActionIntent yields same DecisionTraceDto', () async {
      const intent = ActionIntent(
        intentId: 'id1',
        actionType: 'act',
        parameters: <String, dynamic>{},
        timestamp: '2025-01-01T00:00:00Z',
      );
      final r1 = await channel.sendAction(intent);
      final r2 = await channel.sendAction(intent);
      expect(r1, r2);
    });
    test('same ModeChangeIntent yields same DecisionTraceDto', () async {
      const intent = ModeChangeIntent(
        intentId: 'id2',
        targetModeId: 'mode-x',
        timestamp: '2025-01-01T00:00:00Z',
      );
      final r1 = await channel.sendModeChange(intent);
      final r2 = await channel.sendModeChange(intent);
      expect(r1, r2);
    });
    test('multiple calls identical', () async {
      const action = ActionIntent(
        intentId: 'a',
        actionType: 'b',
        parameters: <String, dynamic>{},
        timestamp: 't',
      );
      final list = <DecisionTraceDto>[];
      for (var i = 0; i < 5; i++) {
        list.add(await channel.sendAction(action));
      }
      for (var i = 1; i < list.length; i++) {
        expect(list[i], list[0]);
      }
    });
  });
}
