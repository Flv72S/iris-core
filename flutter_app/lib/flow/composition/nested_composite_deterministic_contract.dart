// M7 — Nested composite: list of ComposableDeterministicUnit. Implements same unit interface for recursion.

import 'dart:typed_data';

import 'package:iris_flutter_app/flow/composition/composable_deterministic_unit.dart';
import 'package:iris_flutter_app/flow/composition/composite_hash_strategy.dart';

/// Immutable composite of [ComposableDeterministicUnit] (DEC, CDC, or nested). Layout: unitCount then per unit (hash, length, bytes). Big-endian.
class NestedCompositeDeterministicContract implements ComposableDeterministicUnit {
  NestedCompositeDeterministicContract(List<ComposableDeterministicUnit> units) {
    if (units.isEmpty) {
      throw ArgumentError('units must not be empty');
    }
    _units = List<ComposableDeterministicUnit>.unmodifiable(
      List<ComposableDeterministicUnit>.from(units),
    );
    _canonicalBytes = _buildCanonicalBytes();
    _deterministicHash = CompositeHashStrategy.compute(_canonicalBytes);
  }

  late final List<ComposableDeterministicUnit> _units;
  late final Uint8List _canonicalBytes;
  late final int _deterministicHash;

  /// Read-only list of units (defensive copy at construction).
  List<ComposableDeterministicUnit> get units =>
      List<ComposableDeterministicUnit>.unmodifiable(_units);

  @override
  int get deterministicHash => _deterministicHash;

  @override
  Uint8List get canonicalBytes =>
      Uint8List.fromList(_canonicalBytes).asUnmodifiableView();

  /// Layout: [ unitCount (4 BE) ] then per unit: [ hash (4 BE) ] [ length (4 BE) ] [ bytes ].
  Uint8List _buildCanonicalBytes() {
    final out = <int>[];
    _appendU32Be(out, _units.length);
    for (final u in _units) {
      _appendU32Be(out, u.deterministicHash);
      _appendU32Be(out, u.canonicalBytes.length);
      for (var i = 0; i < u.canonicalBytes.length; i++) {
        out.add(u.canonicalBytes[i] & 0xff);
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
