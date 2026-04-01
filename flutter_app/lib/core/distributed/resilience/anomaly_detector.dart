// ODA-9 — Deterministic anomaly detection. Pure; side-effect free.

class Anomaly {
  const Anomaly({
    required this.anomalyId,
    required this.threatType,
    required this.entityId,
    this.details,
  });
  final String anomalyId;
  final String threatType;
  final String entityId;
  final Map<String, dynamic>? details;
}

class AnomalyDetector {
  AnomalyDetector._();

  /// Pure deterministic detection. [systemState] only; no side effects.
  static List<Anomaly> detectAnomalies(
    Map<String, dynamic> systemState,
    List<Anomaly Function(Map<String, dynamic>)> detectors,
  ) {
    final list = <Anomaly>[];
    for (final fn in detectors) {
      final a = fn(systemState);
      list.add(a);
    }
    return list.where((a) => a.anomalyId.isNotEmpty).toList();
  }

  static String classifyIncident(Anomaly anomaly) {
    return anomaly.threatType;
  }
}
