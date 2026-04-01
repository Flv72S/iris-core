/// O6 — Deferred sync operation. Immutable payload; no dynamic mutation.

/// Type of deferred sync operation (network operation, not deterministic event).
enum DeferredOperationType {
  requestSnapshot,
  requestLedgerSegment,
  sendLedgerSegment,
  sendStatus,
}

/// Single deferred operation. [payload] must not be mutated after creation.
class DeferredOperation {
  const DeferredOperation({
    required this.id,
    required this.type,
    required this.payload,
    required this.createdAt,
    this.retryCount = 0,
  });

  /// UUID v4.
  final String id;

  final DeferredOperationType type;

  /// Canonical-serializable map. Must not be mutated.
  final Map<String, dynamic> payload;

  /// Informational only (e.g. ISO 8601 string).
  final String createdAt;

  /// Incremented on each failed attempt.
  final int retryCount;

  DeferredOperation copyWith({
    String? id,
    DeferredOperationType? type,
    Map<String, dynamic>? payload,
    String? createdAt,
    int? retryCount,
  }) {
    return DeferredOperation(
      id: id ?? this.id,
      type: type ?? this.type,
      payload: payload ?? Map<String, dynamic>.from(this.payload),
      createdAt: createdAt ?? this.createdAt,
      retryCount: retryCount ?? this.retryCount,
    );
  }

  /// Increment retry count (used on failed attempt). Returns new instance.
  DeferredOperation withIncrementedRetry() =>
      copyWith(retryCount: retryCount + 1);

  static String typeToString(DeferredOperationType t) {
    switch (t) {
      case DeferredOperationType.requestSnapshot:
        return 'REQUEST_SNAPSHOT';
      case DeferredOperationType.requestLedgerSegment:
        return 'REQUEST_LEDGER_SEGMENT';
      case DeferredOperationType.sendLedgerSegment:
        return 'SEND_LEDGER_SEGMENT';
      case DeferredOperationType.sendStatus:
        return 'SEND_STATUS';
    }
  }

  static DeferredOperationType typeFromString(String s) {
    switch (s) {
      case 'REQUEST_SNAPSHOT':
        return DeferredOperationType.requestSnapshot;
      case 'REQUEST_LEDGER_SEGMENT':
        return DeferredOperationType.requestLedgerSegment;
      case 'SEND_LEDGER_SEGMENT':
        return DeferredOperationType.sendLedgerSegment;
      case 'SEND_STATUS':
        return DeferredOperationType.sendStatus;
      default:
        throw ArgumentError('Unknown DeferredOperationType: $s');
    }
  }
}
