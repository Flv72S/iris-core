// Phase 11.3.3 — Pure pages from traces. Order = store order.

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/explanation_dto.dart';
import 'package:iris_flutter_app/ui/explainability_contract/explainability_mapper.dart';
import 'package:iris_flutter_app/ui/explainability_contract/explainability_view_model.dart';
import 'package:iris_flutter_app/ui/explainability_screen/deterministic_explainability_screen.dart';
import 'trace_route_mapper.dart';

/// Builds Navigator pages from trace list. One trace → one Page. Deterministic.
List<Page<dynamic>> buildPagesFromTraces(List<DecisionTraceDto> traces) {
  final pages = <Page<dynamic>>[];
  for (var i = 0; i < traces.length; i++) {
    final trace = traces[i];
    final route = mapTraceToRoute(trace);
    if (route == 'explainability') {
      final vm = _viewModelFromTrace(trace);
      pages.add(
        MaterialPage<dynamic>(
          key: ValueKey<String>(trace.traceId),
          name: 'explainability_${trace.traceId}',
          child: DeterministicExplainabilityScreen(viewModel: vm),
        ),
      );
    } else {
      pages.add(
        MaterialPage<dynamic>(
          key: ValueKey<String>(trace.traceId),
          name: 'unknown_trace_${trace.traceId}',
          child: Scaffold(
            appBar: AppBar(title: Text('Trace: ${trace.traceId}')),
            body: Center(child: Text('Unknown trace: ${trace.traceId}')),
          ),
        ),
      );
    }
  }
  return pages;
}

ExplainabilityViewModel _viewModelFromTrace(DecisionTraceDto trace) {
  final explanation = ExplanationDto(
    title: trace.traceId,
    summary: trace.resolution,
    details: _canonicalMapString(trace.state),
    safetyLevel: trace.outcome.status,
    traceId: trace.traceId,
  );
  return mapTraceToExplainability(trace, explanation);
}

String _canonicalMapString(Map<String, dynamic> map) {
  final keys = map.keys.toList()..sort();
  final parts = <String>[];
  for (final k in keys) {
    parts.add('${jsonEncode(k)}:${_valueString(map[k])}');
  }
  return '{${parts.join(',')}}';
}

String _valueString(dynamic v) {
  if (v == null) return 'null';
  if (v is String) return jsonEncode(v);
  if (v is num || v is bool) return v.toString();
  if (v is Map) return _canonicalMapString(Map<String, dynamic>.from(v));
  if (v is List) return '[${v.map(_valueString).join(',')}]';
  return jsonEncode(v).toString();
}
