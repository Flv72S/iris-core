// ODA-3 — Filtered event list with global head and deterministic filtered head.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';
import 'package:iris_flutter_app/core/distributed/replication/filtering/deterministic_filter_engine.dart';

/// Filtered view: subset of events, global head reference, local projection state.
class FilteredLedgerView {
  FilteredLedgerView({
    required this.filteredEvents,
    required this.globalHeadHash,
    required this.globalHeight,
    required this.scopeHash,
  }) : filteredHeadHash = _computeFilteredHeadHash(filteredEvents, globalHeadHash, scopeHash);

  final List<FilterableEvent> filteredEvents;
  final String globalHeadHash;
  final int globalHeight;
  final String scopeHash;
  final String filteredHeadHash;

  static String _computeFilteredHeadHash(
    List<FilterableEvent> events,
    String globalHeadHash,
    String scopeHash,
  ) {
    final payload = <String, dynamic>{
      'globalHeadHash': globalHeadHash,
      'scopeHash': scopeHash,
      'filteredCount': events.length,
      'lastGlobalIndex': events.isEmpty ? -1 : events.last.index,
      'filteredChain': events.map((e) => e.eventHash).toList(),
    };
    return CanonicalPayload.hash(payload);
  }

  /// Filtered events in global index order.
  List<FilterableEvent> getFilteredEvents() => List.unmodifiable(filteredEvents);

  String getGlobalHeadHash() => globalHeadHash;

  /// Deterministically derived from filtered chain and global head.
  String getFilteredHeadHash() => filteredHeadHash;

  /// Global indices of included events.
  List<int> get globalIndices => filteredEvents.map((e) => e.index).toList();
}
