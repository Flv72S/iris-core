// OX6 — Deterministic identity model. Ledger-driven; no random IDs.

import 'package:iris_flutter_app/core/deterministic/utils/canonical_serializer.dart';
import 'package:iris_flutter_app/core/deterministic/utils/deterministic_hash.dart';

/// Deterministic identity ID from publicKey. No random UUID.
String deterministicIdentityId(String publicKey) {
  final envelope = <String, dynamic>{'type': 'identity', 'publicKey': publicKey};
  final bytes = CanonicalSerializer.canonicalSerialize(envelope);
  final h = DeterministicHash.computeDeterministicHash(bytes);
  final unsigned = h >= 0 ? h : (h + 0x100000000) & 0xffffffff;
  return 'identity_${unsigned.toRadixString(16)}';
}

/// Identity is authoritative only through ledger events.
class Identity {
  const Identity({
    required this.id,
    required this.publicKey,
    required this.displayName,
    required this.roles,
    required this.version,
    required this.isActive,
    required this.createdAtHeight,
    this.deactivatedAtHeight,
  });

  final String id;
  final String publicKey;
  final String displayName;
  final List<String> roles;
  final int version;
  final bool isActive;
  final int createdAtHeight;
  final int? deactivatedAtHeight;

  Identity copyWith({
    String? id,
    String? publicKey,
    String? displayName,
    List<String>? roles,
    int? version,
    bool? isActive,
    int? createdAtHeight,
    int? deactivatedAtHeight,
  }) {
    return Identity(
      id: id ?? this.id,
      publicKey: publicKey ?? this.publicKey,
      displayName: displayName ?? this.displayName,
      roles: roles ?? List<String>.from(this.roles),
      version: version ?? this.version,
      isActive: isActive ?? this.isActive,
      createdAtHeight: createdAtHeight ?? this.createdAtHeight,
      deactivatedAtHeight: deactivatedAtHeight ?? this.deactivatedAtHeight,
    );
  }
}
