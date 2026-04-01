/// O3 — Transport abstraction. Stateless relative to deterministic engine; does not mutate messages.

import 'package:iris_flutter_app/core/network/message/deterministic_message_envelope.dart';

/// Core transport interface. Replaceable; does not validate or modify envelopes.
abstract interface class TransportAdapter {
  Future<void> connect();
  Future<void> disconnect();
  Future<void> send(DeterministicMessageEnvelope message);

  /// Registers handler for received envelopes. Transport must not mutate envelope.
  void onMessage(void Function(DeterministicMessageEnvelope message) handler);

  /// Registers handler for transport errors (e.g. connection failure).
  void onError(void Function(Object error) handler);
}
