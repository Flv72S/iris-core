// Phase 11.5.2 — Golden: step 0, step N/2, step final. Pixel-identical.

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/ui/explainability/explainability_controller.dart';
import 'package:iris_flutter_app/ui/explainability/explainability_view.dart';
import 'package:iris_flutter_app/ui/persistence/local_file_persistence_store.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_store.dart';
import 'package:iris_flutter_app/presentation/design_system/theme/iris_theme.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/colors.dart';
import '../_infrastructure/golden_test_config.dart';

String _tempPath() =>
    '${Directory.systemTemp.path}/iris_explainability_golden_test.jsonl';

Future<void> _populate(PersistenceStore store, int traceCount) async {
  await store.clearAll();
  await store.append(SessionStartRecord(sessionId: 'session-1'));
  for (var i = 0; i < traceCount; i++) {
    await store.append(TraceRecord.fromTrace(_trace('g$i')));
    await store.append(TimeContextRecord(sessionId: 'session-1', tick: i + 1, origin: 'trace'));
  }
}

DecisionTraceDto _trace(String id) => DecisionTraceDto(
      traceId: id,
      signals: <String, dynamic>{},
      state: <String, dynamic>{},
      resolution: 'r',
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
      timestamp: '1970-01-01T00:00:00Z',
    );

void main() {
  testWidgets('golden step 0', (tester) async {
    final store = LocalFilePersistenceStore(filePath: _tempPath());
    await _populate(store, 2);
    final controller = ExplainabilityController(store: store);
    await controller.load();
    await tester.pumpWidget(
      MediaQuery(
        data: MediaQueryData(
          size: kGoldenSurfaceSize,
          devicePixelRatio: 2.0,
          textScaler: TextScaler.linear(1.0),
        ),
        child: MaterialApp(
          theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
          home: ExplainabilityView(controller: controller),
        ),
      ),
    );
    await expectLater(
      find.byType(ExplainabilityView),
      matchesGoldenFile('golden/explainability_step_0.png'),
    );
  });

  testWidgets('golden step N/2', (tester) async {
    final store = LocalFilePersistenceStore(filePath: _tempPath());
    await _populate(store, 4);
    final controller = ExplainabilityController(store: store);
    await controller.load();
    controller.jumpTo(2);
    await tester.pumpWidget(
      MediaQuery(
        data: MediaQueryData(
          size: kGoldenSurfaceSize,
          devicePixelRatio: 2.0,
          textScaler: TextScaler.linear(1.0),
        ),
        child: MaterialApp(
          theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
          home: ExplainabilityView(controller: controller),
        ),
      ),
    );
    await expectLater(
      find.byType(ExplainabilityView),
      matchesGoldenFile('golden/explainability_step_mid.png'),
    );
  });

  testWidgets('golden step final', (tester) async {
    final store = LocalFilePersistenceStore(filePath: _tempPath());
    await _populate(store, 2);
    final controller = ExplainabilityController(store: store);
    await controller.load();
    controller.jumpTo(controller.current!.totalSteps - 1);
    await tester.pumpWidget(
      MediaQuery(
        data: MediaQueryData(
          size: kGoldenSurfaceSize,
          devicePixelRatio: 2.0,
          textScaler: TextScaler.linear(1.0),
        ),
        child: MaterialApp(
          theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
          home: ExplainabilityView(controller: controller),
        ),
      ),
    );
    await expectLater(
      find.byType(ExplainabilityView),
      matchesGoldenFile('golden/explainability_step_final.png'),
    );
  });
}
