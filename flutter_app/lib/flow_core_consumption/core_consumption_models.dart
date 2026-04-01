// F1 — Flow-side consumption DTOs. Immutable; distinct from Core models.

/// Flow-side snapshot of Core structural state. Read-only.
class FlowCoreSnapshot {
  const FlowCoreSnapshot({
    required this.structuralHash,
    required this.manifestVersion,
  });

  final String structuralHash;
  final String manifestVersion;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FlowCoreSnapshot &&
          structuralHash == other.structuralHash &&
          manifestVersion == other.manifestVersion;

  @override
  int get hashCode => Object.hash(structuralHash, manifestVersion);

  Map<String, dynamic> toJson() => <String, dynamic>{
        'structuralHash': structuralHash,
        'manifestVersion': manifestVersion,
      };
}

/// Flow-side trust state exposure. Observable signals only; no evaluation.
class FlowTrustState {
  const FlowTrustState({
    required this.snapshotHashPresent,
    required this.traceabilityPresent,
    required this.availableTrustSignals,
  });

  final bool snapshotHashPresent;
  final bool traceabilityPresent;
  final List<String> availableTrustSignals;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FlowTrustState &&
          snapshotHashPresent == other.snapshotHashPresent &&
          traceabilityPresent == other.traceabilityPresent &&
          _listEquals(availableTrustSignals, other.availableTrustSignals);

  @override
  int get hashCode => Object.hash(
        snapshotHashPresent,
        traceabilityPresent,
        Object.hashAll(availableTrustSignals),
      );

  Map<String, dynamic> toJson() => <String, dynamic>{
        'snapshotHashPresent': snapshotHashPresent,
        'traceabilityPresent': traceabilityPresent,
        'availableTrustSignals': List<String>.from(availableTrustSignals),
      };

  static bool _listEquals<T>(List<T> a, List<T> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}

/// Flow-side certification context. Reference data only; no interpretation.
class FlowCertificationContext {
  const FlowCertificationContext({
    required this.manifestVersion,
    required this.structuralHash,
    required this.packageHash,
    required this.evidenceEntryIds,
  });

  final String manifestVersion;
  final String structuralHash;
  final String packageHash;
  final List<String> evidenceEntryIds;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FlowCertificationContext &&
          manifestVersion == other.manifestVersion &&
          structuralHash == other.structuralHash &&
          packageHash == other.packageHash &&
          _listEquals(evidenceEntryIds, other.evidenceEntryIds);

  @override
  int get hashCode => Object.hash(
        manifestVersion,
        structuralHash,
        packageHash,
        Object.hashAll(evidenceEntryIds),
      );

  Map<String, dynamic> toJson() => <String, dynamic>{
        'manifestVersion': manifestVersion,
        'structuralHash': structuralHash,
        'packageHash': packageHash,
        'evidenceEntryIds': List<String>.from(evidenceEntryIds),
      };

  static bool _listEquals<T>(List<T> a, List<T> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}
