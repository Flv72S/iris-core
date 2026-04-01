/// O1 — Deterministic Node Identity. Device-level identity; not part of deterministic state.

import 'package:iris_flutter_app/core/deterministic/compatibility/protocol_version.dart';

/// Public node identity. Immutable; used for signing, sync auth, device recognition.
/// [createdAt] is informational only and must NOT influence deterministic logic.
class DeterministicNodeIdentity {
  const DeterministicNodeIdentity({
    required this.nodeId,
    required this.publicKey,
    required this.protocolVersion,
    required this.createdAt,
  });

  /// UUID v4 (generated once at identity creation).
  final String nodeId;

  /// Ed25519 public key, base64 or hex encoded.
  final String publicKey;

  /// Binds to deterministic core protocol version (e.g. "1.0").
  final String protocolVersion;

  /// ISO-8601 string; informational only. Not used in hashing or deterministic logic.
  final String createdAt;

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is DeterministicNodeIdentity &&
        other.nodeId == nodeId &&
        other.publicKey == publicKey &&
        other.protocolVersion == protocolVersion &&
        other.createdAt == createdAt;
  }

  @override
  int get hashCode => Object.hash(nodeId, publicKey, protocolVersion, createdAt);
}

/// Default protocol version string bound to deterministic core.
String get defaultNodeIdentityProtocolVersion =>
    DeterministicProtocolVersion.initial.toString();
