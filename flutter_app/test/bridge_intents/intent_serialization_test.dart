import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/intents/action_intent.dart';
import 'package:iris_flutter_app/bridge/intents/mode_change_intent.dart';
import 'package:iris_flutter_app/bridge/mappers/hash_utils.dart';
import 'package:iris_flutter_app/bridge/mappers/intent_serialization.dart';

void main() {
  test('ActionIntent round-trip', () {
    const intent = ActionIntent(
      intentId: 'i1',
      actionType: 'execute',
      parameters: <String, dynamic>{'k': 'v'},
      timestamp: '2025-01-01T00:00:00Z',
    );
    final json = serializeActionIntent(intent);
    final restored = ActionIntent.fromJson(Map<String, dynamic>.from(json));
    expect(restored, intent);
  });
  test('ModeChangeIntent round-trip', () {
    const intent = ModeChangeIntent(
      intentId: 'm1',
      targetModeId: 'focus',
      timestamp: '2025-01-01T00:00:00Z',
    );
    final json = serializeModeIntent(intent);
    final restored = ModeChangeIntent.fromJson(Map<String, dynamic>.from(json));
    expect(restored, intent);
  });
  test('ActionIntent hash stable', () {
    const intent = ActionIntent(
      intentId: 'a',
      actionType: 'x',
      parameters: <String, dynamic>{'p': 1},
      timestamp: 't',
    );
    final h1 = computeDeterministicHash(serializeActionIntent(intent));
    final h2 = computeDeterministicHash(serializeActionIntent(intent));
    expect(h1, h2);
  });
  test('ModeChangeIntent hash stable', () {
    const intent = ModeChangeIntent(
      intentId: 'a',
      targetModeId: 'b',
      timestamp: 't',
    );
    final h1 = computeDeterministicHash(serializeModeIntent(intent));
    final h2 = computeDeterministicHash(serializeModeIntent(intent));
    expect(h1, h2);
  });
}
