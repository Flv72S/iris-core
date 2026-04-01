/// O3 — Transport event types. For reporting only; must NOT affect deterministic engine.

/// Event types the transport layer may emit. Used for observability only.
enum TransportEventType {
  connected,
  disconnected,
  messageReceived,
  error,
}
