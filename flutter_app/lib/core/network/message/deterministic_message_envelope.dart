/// O2 — Canonical, signed, transport-independent message envelope.

/// Envelope for all node-to-node communication. Cryptographically signed; canonical serialization.
class DeterministicMessageEnvelope {
  const DeterministicMessageEnvelope({
    required this.messageId,
    required this.senderNodeId,
    required this.protocolVersion,
    required this.payloadType,
    required this.payloadHash,
    required this.payload,
    required this.signature,
  });

  /// UUID v4.
  final String messageId;

  /// Must match DeterministicNodeIdentity.nodeId of sender.
  final String senderNodeId;

  /// Must match deterministic core protocol version (e.g. "1.0").
  final String protocolVersion;

  /// From MessageTypes registry (e.g. SNAPSHOT_REQUEST).
  final String payloadType;

  /// Hash of canonical payload (hex lowercase); same algorithm as deterministic core.
  final String payloadHash;

  /// Canonical serialized payload.
  final String payload;

  /// Ed25519 signature of canonical envelope WITHOUT signature field (base64).
  final String signature;

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is DeterministicMessageEnvelope &&
        other.messageId == messageId &&
        other.senderNodeId == senderNodeId &&
        other.protocolVersion == protocolVersion &&
        other.payloadType == payloadType &&
        other.payloadHash == payloadHash &&
        other.payload == payload &&
        other.signature == signature;
  }

  @override
  int get hashCode => Object.hash(
        messageId,
        senderNodeId,
        protocolVersion,
        payloadType,
        payloadHash,
        payload,
        signature,
      );
}
