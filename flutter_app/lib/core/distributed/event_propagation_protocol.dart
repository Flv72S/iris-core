// ODA-1 — Deterministic propagation: ledger order; request by index; no gossip.

/// Events propagated in ledger order. Request missing by index; no time-based batching.
class EventPropagationProtocol {
  EventPropagationProtocol({
    required this.requestEvents,
    required this.validateReceivedEvents,
  });

  /// Request events from [fromIndex] (inclusive). Returns ordered list.
  final List<Map<String, dynamic>> Function(int fromIndex) requestEvents;

  /// Validate: signature, hash chain continuity, membership at time of event.
  final bool Function(List<Map<String, dynamic>> events) validateReceivedEvents;

  /// Receive events (in ledger order). Validates then returns true if ok.
  bool receiveEvents(List<Map<String, dynamic>> events) {
    return validateReceivedEvents(events);
  }

  /// Acknowledge sync completed. No-op in protocol; stub for network layer.
  void acknowledgeSync() {}
}
