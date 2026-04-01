/// Deterministic ledger save/load. No entropy; canonical bytes only.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';
import 'package:iris_flutter_app/core/deterministic/chain/snapshot_chain_hasher.dart';
import 'package:iris_flutter_app/core/deterministic/compatibility/protocol_version.dart';
import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';
import 'package:iris_flutter_app/core/deterministic/ledger/deterministic_ledger.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';
import 'package:iris_flutter_app/core/deterministic/utils/canonical_serializer.dart';
import 'package:iris_flutter_app/core/storage/storage_adapter.dart';

class LedgerPersistence<S extends DeterministicState> {
  LedgerPersistence(this.storage);

  final StorageAdapter storage;

  static void _appendU32Be(List<int> out, int n) {
    out.add((n >> 24) & 0xff);
    out.add((n >> 16) & 0xff);
    out.add((n >> 8) & 0xff);
    out.add(n & 0xff);
  }

  static void _appendInt64(List<int> out, int n) {
    for (var i = 7; i >= 0; i--) {
      out.add((n >> (i * 8)) & 0xff);
    }
  }

  static int _readU32Be(List<int> bytes, int offset) {
    return (bytes[offset] << 24) |
        (bytes[offset + 1] << 16) |
        (bytes[offset + 2] << 8) |
        bytes[offset + 3];
  }

  static int _readInt64(List<int> bytes, int offset) {
    var n = 0;
    for (var i = 0; i < 8; i++) {
      n = (n << 8) | (bytes[offset + i] & 0xff);
    }
    return n.toSigned(64);
  }

  void saveLedger(String key, DeterministicLedger<S> ledger) {
    final out = <int>[];
    final count = ledger.length;
    _appendU32Be(out, count);
    for (var i = 0; i < count; i++) {
      final snap = ledger.getSnapshotAt(i)!;
      _appendU32Be(out, snap.protocolVersion.major & 0xffffffff);
      _appendU32Be(out, snap.protocolVersion.minor & 0xffffffff);
      final stateBytes = CanonicalSerializer.canonicalSerialize(snap.state.toCanonicalMap());
      _appendU32Be(out, stateBytes.length);
      out.addAll(stateBytes);
      _appendInt64(out, snap.stateHash);
      _appendU32Be(out, snap.stateVersion & 0xffffffff);
      _appendU32Be(out, snap.transitionIndex & 0xffffffff);
      _appendInt64(out, snap.chainHash);
    }
    storage.saveBytes(key, out);
  }

  DeterministicLedger<S> loadLedger(
    String key,
    S Function(Map<String, dynamic>) stateDeserializer, {
    DeterministicProtocolVersion currentVersion = DeterministicProtocolVersion.initial,
  }) {
    try {
      return _loadLedgerImpl(key, stateDeserializer, currentVersion);
    } on ArgumentError catch (e) {
      throw DeterministicViolation('Load failed: ${e.message}');
    }
  }

  DeterministicLedger<S> _loadLedgerImpl(
    String key,
    S Function(Map<String, dynamic>) stateDeserializer,
    DeterministicProtocolVersion currentVersion,
  ) {
    final bytes = storage.loadBytes(key);
    if (bytes == null || bytes.isEmpty) {
      throw DeterministicViolation('No data for key: $key');
    }
    var offset = 0;
    if (bytes.length < 4) {
      throw DeterministicViolation('Ledger data truncated (count)');
    }
    final count = _readU32Be(bytes, offset);
    offset += 4;
    final ledger = DeterministicLedger<S>();
    for (var i = 0; i < count; i++) {
      if (offset + 4 + 4 > bytes.length) {
        throw DeterministicViolation('Ledger data truncated (protocol at snapshot $i)');
      }
      final protocolMajor = _readU32Be(bytes, offset);
      offset += 4;
      final protocolMinor = _readU32Be(bytes, offset);
      offset += 4;
      final snapshotVersion = DeterministicProtocolVersion(major: protocolMajor, minor: protocolMinor);
      DeterministicSchemaGuard.validateSchemaCompatibility(
        snapshotVersion: snapshotVersion,
        currentVersion: currentVersion,
      );
      if (offset + 4 > bytes.length) {
        throw DeterministicViolation('Ledger data truncated (length at snapshot $i)');
      }
      final stateLen = _readU32Be(bytes, offset);
      offset += 4;
      if (offset + stateLen + 8 + 4 + 4 + 8 > bytes.length) {
        throw DeterministicViolation('Ledger data truncated (snapshot $i)');
      }
      final stateBytes = bytes.sublist(offset, offset + stateLen);
      offset += stateLen;
      final stateMap = CanonicalSerializer.canonicalDeserialize(stateBytes);
      final state = stateDeserializer(stateMap);
      final stateHash = _readInt64(bytes, offset);
      offset += 8;
      final stateVersion = _readU32Be(bytes, offset);
      offset += 4;
      final transitionIndex = _readU32Be(bytes, offset);
      offset += 4;
      final chainHash = _readInt64(bytes, offset);
      offset += 8;
      if (state.deterministicHash != stateHash) {
        throw DeterministicViolation(
          'Snapshot $i: stateHash mismatch (loaded $stateHash != computed ${state.deterministicHash})',
        );
      }
      final expectedChainHash = ledger.length == 0
          ? SnapshotChainHasher.computeNextChainHash(
              previousChainHash: SnapshotChainHasher.genesisChainHash,
              stateHash: stateHash,
              stateVersion: stateVersion,
              transitionIndex: transitionIndex,
              protocolVersion: snapshotVersion,
            )
          : SnapshotChainHasher.computeNextChainHash(
              previousChainHash: ledger.latestSnapshot!.chainHash,
              stateHash: stateHash,
              stateVersion: stateVersion,
              transitionIndex: transitionIndex,
              protocolVersion: snapshotVersion,
            );
      if (chainHash != expectedChainHash) {
        throw DeterministicViolation(
          'Snapshot $i: chainHash mismatch (loaded $chainHash != expected $expectedChainHash)',
        );
      }
      final snapshot = StateSnapshot<S>(
        state: state,
        stateHash: stateHash,
        stateVersion: stateVersion,
        transitionIndex: transitionIndex,
        chainHash: chainHash,
        protocolVersion: snapshotVersion,
      );
      ledger.append(snapshot);
    }
    return ledger;
  }
}

