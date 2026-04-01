// Phase 13.6 — Audit chain. Append-only; verification pure; no IO.

import 'freeze_seal.dart';
import 'freeze_seal_engine.dart';

/// Sentinel for the first seal in the chain. No predecessor.
const String kGenesisFreezeSeal = 'GENESIS';

/// IRIS Core Freeze structural hash from Microstep 13.3. Immutable.
const String kGenesisStructuralHash =
    '7df6eba3c96039113db3fb609e2524b4ccd14fec5b29937bad66618de1fe1fff';

/// Freeze version for the first IRIS freeze (13.4).
const String kGenesisFreezeVersion = '13.4';

/// First real freeze seal of the system. Computed deterministically.
FreezeSeal get genesisSeal => computeFreezeSeal(
      freezeVersion: kGenesisFreezeVersion,
      structuralHash: kGenesisStructuralHash,
      previousSeal: kGenesisFreezeSeal,
    );

/// Audit chain with the first IRIS freeze only.
FreezeAuditChain get genesisChain => FreezeAuditChain([genesisSeal]);

/// Immutable append-only audit chain. Chronological order; deterministic.
final class FreezeAuditChain {
  FreezeAuditChain(this.seals) {
    if (seals.isEmpty) throw ArgumentError('seals must not be empty');
  }

  final List<FreezeSeal> seals;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FreezeAuditChain &&
          runtimeType == other.runtimeType &&
          _listEquals(seals, other.seals);

  @override
  int get hashCode => Object.hashAll(seals);

  static bool _listEquals(List<FreezeSeal> a, List<FreezeSeal> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}

/// Verifies the full chain: each seal hash matches recomputed hash and previousSeal links.
bool verifyFreezeAuditChain(FreezeAuditChain chain) {
  final seals = chain.seals;
  if (seals.isEmpty) return false;
  for (var i = 0; i < seals.length; i++) {
    final seal = seals[i];
    if (seal.freezeVersion.isEmpty || seal.structuralHash.isEmpty || seal.sealHash.isEmpty) {
      return false;
    }
    final expectedPrevious = i == 0 ? kGenesisFreezeSeal : seals[i - 1].sealHash;
    if (seal.previousSeal != expectedPrevious) return false;
    final computed = computeFreezeSeal(
      freezeVersion: seal.freezeVersion,
      structuralHash: seal.structuralHash,
      previousSeal: seal.previousSeal,
    );
    if (computed.sealHash != seal.sealHash) return false;
  }
  return true;
}
