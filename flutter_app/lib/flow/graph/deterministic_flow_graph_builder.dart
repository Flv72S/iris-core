// M9 — DAG builder from ComposableDeterministicUnit. Recursive; cycle detection; deterministic child order.

import 'dart:typed_data';

import 'package:iris_flutter_app/flow/composition/composable_deterministic_unit.dart';
import 'package:iris_flutter_app/flow/composition/composite_deterministic_contract.dart';
import 'package:iris_flutter_app/flow/composition/nested_composite_deterministic_contract.dart';
import 'package:iris_flutter_app/flow/graph/deterministic_flow_graph.dart';

/// Builds a deterministic DAG from a root [ComposableDeterministicUnit]. Detects cycles; does not modify units.
class DeterministicFlowGraphBuilder {
  /// Optional override to resolve children (e.g. for cycle tests). If non-null and returns non-null, used instead of built-in rules.
  DeterministicFlowGraphBuilder({
    this.getChildUnitsOverride,
  });

  final List<ComposableDeterministicUnit>? Function(ComposableDeterministicUnit)? getChildUnitsOverride;

  /// Builds graph from [rootUnit]. Throws [StateError] if cycle detected. Children ordered by hash then bytes.
  DeterministicFlowGraph build(ComposableDeterministicUnit rootUnit) {
    final pathHashes = <int>{};
    final rootNode = _buildNode(rootUnit, pathHashes);
    return DeterministicFlowGraph(rootNode);
  }

  DeterministicFlowNode _buildNode(
    ComposableDeterministicUnit unit,
    Set<int> pathHashes,
  ) {
    final hash = unit.deterministicHash;
    if (pathHashes.contains(hash)) {
      throw StateError('Cycle detected');
    }
    pathHashes.add(hash);
    try {
    List<ComposableDeterministicUnit> childUnits;
    final custom = getChildUnitsOverride?.call(unit);
    if (custom != null) {
      childUnits = custom;
    } else {
      childUnits = _getChildUnits(unit);
    }
      final childNodes = childUnits
          .map((u) => _buildNode(u, pathHashes))
          .toList()
        ..sort(_compareNodes);
      return DeterministicFlowNode(
        deterministicHash: unit.deterministicHash,
        canonicalBytes: unit.canonicalBytes,
        children: childNodes,
      );
    } finally {
      pathHashes.remove(hash);
    }
  }

  /// Returns child units for composite types; empty for leaf (DecUnit).
  List<ComposableDeterministicUnit> _getChildUnits(ComposableDeterministicUnit unit) {
    if (unit is DecUnit) {
      return [];
    }
    if (unit is CdcUnit) {
      return unit.cdc.contracts.map((c) => DecUnit(c)).toList();
    }
    if (unit is NestedCompositeDeterministicContract) {
      return unit.units;
    }
    return [];
  }

  static int _compareNodes(DeterministicFlowNode a, DeterministicFlowNode b) {
    final h = a.deterministicHash.compareTo(b.deterministicHash);
    if (h != 0) return h;
    return _compareBytes(a.canonicalBytes, b.canonicalBytes);
  }

  static int _compareBytes(Uint8List a, Uint8List b) {
    final len = a.length < b.length ? a.length : b.length;
    for (var i = 0; i < len; i++) {
      final ai = a[i] & 0xff;
      final bi = b[i] & 0xff;
      if (ai != bi) return ai.compareTo(bi);
    }
    return a.length.compareTo(b.length);
  }
}
