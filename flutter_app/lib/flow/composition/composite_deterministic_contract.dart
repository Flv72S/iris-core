// M1 — Structural composite contract. Algebra over DeterministicExecutionContract; no L modification.
// M2 — Hash delegated to CompositeHashStrategy.

import 'dart:typed_data';

import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/composition/composite_hash_strategy.dart';

/// Immutable composite of ordered DeterministicExecutionContract. Purely structural; no I/O, no validation.
class CompositeDeterministicContract {
  CompositeDeterministicContract(List<DeterministicExecutionContract> contracts) {
    if (contracts.isEmpty) {
      throw ArgumentError('contracts must not be empty');
    }
    _contracts = List<DeterministicExecutionContract>.unmodifiable(
      List<DeterministicExecutionContract>.from(contracts),
    );
    _canonicalCompositeBytes = _buildCanonicalCompositeBytes();
    _compositeDeterministicHash = CompositeHashStrategy.compute(_canonicalCompositeBytes);
  }

  late final List<DeterministicExecutionContract> _contracts;
  late final Uint8List _canonicalCompositeBytes;
  late final int _compositeDeterministicHash;

  /// Read-only list of contracts (defensive copy at construction).
  List<DeterministicExecutionContract> get contracts =>
      List<DeterministicExecutionContract>.unmodifiable(_contracts);

  /// Canonical composite bytes (defensive copy; immutable).
  Uint8List get canonicalCompositeBytes =>
      Uint8List.fromList(_canonicalCompositeBytes).asUnmodifiableView();

  /// Composite hash derived only from canonical composite bytes. FNV-1a 32-bit.
  int get compositeDeterministicHash => _compositeDeterministicHash;

  /// Layout: [ contractCount (4 BE) ] then per contract: [ hash (4 BE) ] [ length (4 BE) ] [ bytes ].
  Uint8List _buildCanonicalCompositeBytes() {
    final out = <int>[];
    _appendU32Be(out, _contracts.length);
    for (final c in _contracts) {
      _appendU32Be(out, c.deterministicHash);
      _appendU32Be(out, c.canonicalBytes.length);
      for (var i = 0; i < c.canonicalBytes.length; i++) {
        out.add(c.canonicalBytes[i] & 0xff);
      }
    }
    return Uint8List.fromList(out).asUnmodifiableView();
  }

  static void _appendU32Be(List<int> out, int value) {
    out.add((value >> 24) & 0xff);
    out.add((value >> 16) & 0xff);
    out.add((value >> 8) & 0xff);
    out.add(value & 0xff);
  }
}
