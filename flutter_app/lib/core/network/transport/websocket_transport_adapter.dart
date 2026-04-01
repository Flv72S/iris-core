/// O3 — WebSocket transport. Transparent pipe; does not validate or modify envelopes.

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:iris_flutter_app/core/network/message/deterministic_message_envelope.dart';
import 'package:iris_flutter_app/core/network/message/message_envelope_serializer.dart';
import 'package:iris_flutter_app/core/network/transport/transport_adapter.dart';

/// Connects to [uri], sends serialized envelope as text frame, receives and parses to envelope.
/// No validation, no retry, no mutation. Errors propagated via onError.
class WebSocketTransportAdapter implements TransportAdapter {
  WebSocketTransportAdapter(this.uri);

  final Uri uri;
  WebSocket? _socket;
  void Function(DeterministicMessageEnvelope)? _messageHandler;
  void Function(Object)? _errorHandler;
  StreamSubscription<dynamic>? _subscription;

  @override
  Future<void> connect() async {
    _socket = await WebSocket.connect(uri.toString());
    _subscription = _socket!.listen(
      _onData,
      onError: (e) => _errorHandler?.call(e),
      onDone: () => _subscription?.cancel(),
    );
  }

  void _onData(dynamic data) {
    if (data is! String) {
      _errorHandler?.call(ArgumentError('Expected text frame, got ${data.runtimeType}'));
      return;
    }
    try {
      final bytes = utf8.encode(data);
      final envelope = MessageEnvelopeSerializer.fromCanonicalBytes(bytes);
      _messageHandler?.call(envelope);
    } catch (e, st) {
      _errorHandler?.call(_WrapError('Envelope parse error: $e', st));
    }
  }

  @override
  Future<void> disconnect() async {
    await _subscription?.cancel();
    await _socket?.close();
    _socket = null;
    _subscription = null;
  }

  @override
  Future<void> send(DeterministicMessageEnvelope message) async {
    final socket = _socket;
    if (socket == null) {
      _errorHandler?.call(StateError('Not connected'));
      return;
    }
    final bytes = MessageEnvelopeSerializer.toCanonicalBytes(message);
    socket.add(utf8.decode(bytes));
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

class _WrapError implements Error {
  _WrapError(this.message, [this.stackTrace]);
  final String message;
  @override
  final StackTrace? stackTrace;
  @override
  String toString() => message;
}
