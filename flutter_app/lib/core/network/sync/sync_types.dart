/// O4 — Sync payload structures. All canonical-serializable.

/// SNAPSHOT_REQUEST payload: { targetNodeId: string }
Map<String, dynamic> snapshotRequestPayload(String targetNodeId) =>
    {'targetNodeId': targetNodeId};

String parseSnapshotRequestTargetNodeId(Map<String, dynamic> map) =>
    map['targetNodeId'] as String;

/// SNAPSHOT_RESPONSE payload: { snapshotHash, snapshotData, ledgerHeight }
Map<String, dynamic> snapshotResponsePayload({
  required String snapshotHash,
  required String snapshotData,
  required int ledgerHeight,
}) =>
    {
      'snapshotHash': snapshotHash,
      'snapshotData': snapshotData,
      'ledgerHeight': ledgerHeight,
    };

String parseSnapshotResponseHash(Map<String, dynamic> map) =>
    map['snapshotHash'] as String;

String parseSnapshotResponseData(Map<String, dynamic> map) =>
    map['snapshotData'] as String;

int parseSnapshotResponseLedgerHeight(Map<String, dynamic> map) =>
    map['ledgerHeight'] as int;

/// LEDGER_SEGMENT_REQUEST payload: { fromHeight: number }
Map<String, dynamic> ledgerSegmentRequestPayload(int fromHeight) =>
    {'fromHeight': fromHeight};

int parseLedgerSegmentRequestFromHeight(Map<String, dynamic> map) =>
    map['fromHeight'] as int;

/// LEDGER_SEGMENT_RESPONSE payload: { events: list of canonical event maps, segmentHash: string }
Map<String, dynamic> ledgerSegmentResponsePayload({
  required List<Map<String, dynamic>> events,
  required String segmentHash,
}) =>
    {'events': events, 'segmentHash': segmentHash};

List<Map<String, dynamic>> parseLedgerSegmentResponseEvents(Map<String, dynamic> map) =>
    List<Map<String, dynamic>>.from(
      (map['events'] as List).map((e) => Map<String, dynamic>.from(e as Map)),
    );

String parseLedgerSegmentResponseSegmentHash(Map<String, dynamic> map) =>
    map['segmentHash'] as String;
