/// O3 — Local loopback transport. For testing and same-runtime simulation; no network stack.

import 'package:iris_flutter_app/core/network/message/deterministic_message_envelope.dart';
import 'package:iris_flutter_app/core/network/transport/transport_adapter.dart';

/// When [send] is called, delivers envelope to the linked adapter via microtask (simulated async).
class LocalLoopbackTransportAdapter implements TransportAdapter {
  LocalLoopbackTransportAdapter();

  LocalLoopbackTransportAdapter? _peer;
  void Function(DeterministicMessageEnvelope)? _messageHandler;
  void Function(Object)? _errorHandler;

  /// Links this adapter with [other]. After linking, send on one delivers to the other's onMessage.
  void link(LocalLoopbackTransportAdapter other) {
    _peer = other;
    other._peer = this;
  }

  @override
  Future<void> connect() async {}

  @override
  Future<void> disconnect() async {
    _peer = null;
  }

  @override
  Future<void> send(DeterministicMessageEnvelope message) async {
    final peer = _peer;
    if (peer != null) {
      final envelope = message;
      Future.microtask(() => peer._deliver(envelope));
    }
  }

  void _deliver(DeterministicMessageEnvelope message) {
    _messageHandler?.call(message);
  }

  @override
  void onMessage(void Function(DeterministicMessageEnvelope message) handler) {
    _messageHandler = handler;
  }

  @override
  void onError(void Function(Object error) handler) {
    _errorHandler = handler;
  }
}
