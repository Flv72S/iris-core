// Phase 11.2.4 — In-memory replay-safe store. No DateTime, no Random, no I/O.

import '../dto/decision_trace_dto.dart';
import '../mappers/hash_utils.dart';
import '../validation/validated_trace_result.dart';
import 'replay_store_exception.dart';
import 'replay_store_snapshot.dart';

/// Store accepts only validated traces. Order by traceId. Hash deterministic.
class ReplayTraceStore {
  ReplayTraceStore() : _traces = <DecisionTraceDto>[];

  final List<DecisionTraceDto> _traces;

  /// Saves only if result.isValid. Throws on invalid or duplicate inconsistent.
  void save(ValidatedTraceResult result) {
    if (!result.isValid) {
      throw ReplayStoreException('cannot save invalid trace');
    }
    final trace = result.trace;
    final idx = _indexOfTraceId(trace.traceId);
    if (idx >= 0) {
      if (_traces[idx] != trace) {
        throw ReplayStoreException('duplicate traceId with inconsistent content');
      }
      return;
    }
    _traces.add(trace);
    _sortByTraceId();
  }

  /// Returns traces in stable lexicographic order by traceId.
  List<DecisionTraceDto> getAll() => List<DecisionTraceDto>.from(_traces);

  DecisionTraceDto? getByTraceId(String traceId) {
    final idx = _indexOfTraceId(traceId);
    return idx >= 0 ? _traces[idx] : null;
  }

  /// Deterministic SHA-256 hex of entire store (traces serialized in traceId order).
  String computeStoreHash() {
    final ordered = List<DecisionTraceDto>.from(_traces)..sort(_compareTraceId);
    final payload = <String, dynamic>{
      'traces': ordered.map((t) => t.toJson()).toList(),
    };
    return computeDeterministicHash(payload);
  }

  /// Immutable snapshot for audit/replay.
  ReplayStoreSnapshot getSnapshot() {
    final list = List<DecisionTraceDto>.unmodifiable(getAll());
    return ReplayStoreSnapshot(traces: list, storeHash: computeStoreHash());
  }

  void clear() {
    _traces.clear();
  }

  int _indexOfTraceId(String traceId) {
    for (var i = 0; i < _traces.length; i++) {
      if (_traces[i].traceId == traceId) return i;
    }
    return -1;
  }

  void _sortByTraceId() {
    _traces.sort(_compareTraceId);
  }

  static int _compareTraceId(DecisionTraceDto a, DecisionTraceDto b) =>
      a.traceId.compareTo(b.traceId);
}
