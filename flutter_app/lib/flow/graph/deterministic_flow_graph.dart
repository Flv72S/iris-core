// M9 — DAG model. Immutable node and graph; canonical layout; FNV-1a graph hash.

import 'dart:typed_data';

import 'package:iris_flutter_app/flow/composition/composite_hash_strategy.dart';

/// Immutable node in the flow graph. Children in deterministic order.
class DeterministicFlowNode {
  DeterministicFlowNode({
    required this.deterministicHash,
    required Uint8List canonicalBytes,
    required List<DeterministicFlowNode> children,
  })  : canonicalBytes = Uint8List.fromList(canonicalBytes).asUnmodifiableView(),
        children = List<DeterministicFlowNode>.unmodifiable(
          List<DeterministicFlowNode>.from(children),
        );

  final int deterministicHash;
  final Uint8List canonicalBytes;
  final List<DeterministicFlowNode> children;
}

/// Immutable DAG with canonical bytes and deterministic hash (FNV-1a 32-bit).
class DeterministicFlowGraph {
  DeterministicFlowGraph(this.root) {
    final bytes = _serializePreOrder(root);
    _canonicalBytes = Uint8List.fromList(bytes);
    deterministicHash = CompositeHashStrategy.compute(_canonicalBytes);
  }

  final DeterministicFlowNode root;
  late final Uint8List _canonicalBytes;
  late final int deterministicHash;

  /// Canonical layout of entire graph (pre-order, deterministic child order).
  Uint8List get canonicalBytes =>
      Uint8List.fromList(_canonicalBytes).asUnmodifiableView();

  /// Pre-order: for each node: hash(4), length(4), bytes, childCount(4). Children already sorted by builder.
  static List<int> _serializePreOrder(DeterministicFlowNode node) {
    final out = <int>[];
    _appendU32Be(out, node.deterministicHash);
    _appendU32Be(out, node.canonicalBytes.length);
    for (var i = 0; i < node.canonicalBytes.length; i++) {
      out.add(node.canonicalBytes[i] & 0xff);
    }
    _appendU32Be(out, node.children.length);
    for (final c in node.children) {
      out.addAll(_serializePreOrder(c));
    }
    return out;
  }

  static void _appendU32Be(List<int> out, int value) {
    out.add((value >> 24) & 0xff);
    out.add((value >> 16) & 0xff);
    out.add((value >> 8) & 0xff);
    out.add(value & 0xff);
  }
}
