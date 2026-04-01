// F5 — Flow context snapshot. Immutable DTO; no internal logic.

import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart' show FlowStepId;

import 'flow_context_key.dart';

/// Flow-side context derived from Core. Observable data only.
class FlowContextSnapshot {
  const FlowContextSnapshot({
    required this.snapshotId,
    required this.boundAtStep,
    this.contextData = const <FlowContextKey, Object>{},
    this.sourceHashes = const <String, String>{},
  });

  final String snapshotId;
  final FlowStepId boundAtStep;
  final Map<FlowContextKey, Object> contextData;
  final Map<String, String> sourceHashes;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FlowContextSnapshot &&
          snapshotId == other.snapshotId &&
          boundAtStep == other.boundAtStep &&
          _mapEquals(contextData, other.contextData) &&
          _mapStrEquals(sourceHashes, other.sourceHashes));

  static bool _mapEquals(
      Map<FlowContextKey, Object> a, Map<FlowContextKey, Object> b) {
    if (a.length != b.length) return false;
    for (final k in a.keys) {
      if (!b.containsKey(k) || a[k] != b[k]) return false;
    }
    return true;
  }

  static bool _mapStrEquals(Map<String, String> a, Map<String, String> b) {
    if (a.length != b.length) return false;
    for (final k in a.keys) {
      if (!b.containsKey(k) || a[k] != b[k]) return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final sortedContext = contextData.entries.toList()
      ..sort((a, b) => a.key.value.compareTo(b.key.value));
    final sortedSource = sourceHashes.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));
    return Object.hash(
      snapshotId,
      boundAtStep,
      Object.hashAll(sortedContext),
      Object.hashAll(sortedSource),
    );
  }
}
