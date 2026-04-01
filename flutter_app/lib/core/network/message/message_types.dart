/// O2 — Allowed message types. No dynamic types; reject unknown payloadType.

class MessageTypes {
  MessageTypes._();

  static const String snapshotRequest = 'SNAPSHOT_REQUEST';
  static const String snapshotResponse = 'SNAPSHOT_RESPONSE';
  static const String ledgerSegmentRequest = 'LEDGER_SEGMENT_REQUEST';
  static const String ledgerSegmentResponse = 'LEDGER_SEGMENT_RESPONSE';
  static const String syncStatus = 'SYNC_STATUS';
  static const String nodePing = 'NODE_PING';

  static const List<String> all = [
    snapshotRequest,
    snapshotResponse,
    ledgerSegmentRequest,
    ledgerSegmentResponse,
    syncStatus,
    nodePing,
  ];

  static bool isAllowed(String payloadType) => all.contains(payloadType);
}
