// Phase 11.2.2 — Stable key order for hash compatibility. No semantics.

import '../intents/action_intent.dart';
import '../intents/mode_change_intent.dart';

/// Serializes ActionIntent with stable key order for deterministic hash.
Map<String, dynamic> serializeActionIntent(ActionIntent intent) {
  return <String, dynamic>{
    'intentId': intent.intentId,
    'actionType': intent.actionType,
    'parameters': Map<String, dynamic>.from(intent.parameters),
    'timestamp': intent.timestamp,
  };
}

/// Serializes ModeChangeIntent with stable key order for deterministic hash.
Map<String, dynamic> serializeModeIntent(ModeChangeIntent intent) {
  return <String, dynamic>{
    'intentId': intent.intentId,
    'targetModeId': intent.targetModeId,
    'timestamp': intent.timestamp,
  };
}
