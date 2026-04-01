import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/presentation/design_system/theme/iris_theme.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/colors.dart';
import 'package:iris_flutter_app/ui/explainability_contract/explainability_view_model.dart';
import 'package:iris_flutter_app/ui/explainability_screen/deterministic_explainability_screen.dart';

void main() {
  const vm = ExplainabilityViewModel(
    traceId: 'id',
    state: 's',
    resolution: 'r',
    outcomeStatus: 'o',
    outcomeEffects: <String>['e'],
    explanationTitle: 'T',
    explanationSummary: 'S',
    explanationDetails: 'D',
    safetyLevel: 'neutral',
    timestamp: 'ts',
  );

  testWidgets('same ViewModel same tree', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
        home: DeterministicExplainabilityScreen(viewModel: vm),
      ),
    );
    expect(find.byType(Scaffold), findsOneWidget);
    await tester.pump();
    expect(find.byType(Scaffold), findsOneWidget);
  });

  testWidgets('rebuild identical', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
        home: DeterministicExplainabilityScreen(viewModel: vm),
      ),
    );
    await tester.pump();
    await tester.pump();
    expect(find.text('T'), findsOneWidget);
    expect(find.text('S'), findsOneWidget);
  });

  test('no DateTime.now in explainability_screen', () {
    final dir = Directory('lib/ui/explainability_screen');
    for (final f in dir.listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        expect(f.readAsStringSync().contains('DateTime.now()'), isFalse);
      }
    }
  });

  test('no Random in explainability_screen', () {
    final dir = Directory('lib/ui/explainability_screen');
    for (final f in dir.listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        expect(f.readAsStringSync().contains('Random()'), isFalse);
      }
    }
  });
}
