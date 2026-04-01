// Phase 13.6 — Freeze Seal. Immutable DTO; deterministic equality; no runtime logic.

/// Immutable cryptographic freeze seal. Deterministic; no external inputs.
final class FreezeSeal {
  const FreezeSeal({
    required this.freezeVersion,
    required this.structuralHash,
    required this.previousSeal,
    required this.sealHash,
  });

  final String freezeVersion;
  final String structuralHash;
  final String previousSeal;
  final String sealHash;

  /// JSON with keys in fixed order: freeze_version, previous_seal, seal_hash, structural_hash.
  Map<String, Object> toJson() {
    return <String, Object>{
      'freeze_version': freezeVersion,
      'previous_seal': previousSeal,
      'seal_hash': sealHash,
      'structural_hash': structuralHash,
    };
  }

  /// Parses and validates. Throws on invalid or missing fields.
  static FreezeSeal fromJson(Map<Object?, Object?> json) {
    final v = json['freeze_version'] as String?;
    final s = json['structural_hash'] as String?;
    final p = json['previous_seal'] as String?;
    final h = json['seal_hash'] as String?;
    if (v == null || v.isEmpty) throw ArgumentError('freeze_version required');
    if (s == null || s.isEmpty) throw ArgumentError('structural_hash required');
    if (p == null) throw ArgumentError('previous_seal required');
    if (h == null || h.isEmpty) throw ArgumentError('seal_hash required');
    return FreezeSeal(
      freezeVersion: v,
      structuralHash: s,
      previousSeal: p,
      sealHash: h,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FreezeSeal &&
          runtimeType == other.runtimeType &&
          freezeVersion == other.freezeVersion &&
          structuralHash == other.structuralHash &&
          previousSeal == other.previousSeal &&
          sealHash == other.sealHash;

  @override
  int get hashCode => Object.hash(freezeVersion, structuralHash, previousSeal, sealHash);
}
