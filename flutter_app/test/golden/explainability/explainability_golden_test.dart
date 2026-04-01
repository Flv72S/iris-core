import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/presentation/design_system/theme/iris_theme.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/colors.dart';
import 'package:iris_flutter_app/presentation/explainability/components/explainability_header.dart';
import 'package:iris_flutter_app/presentation/explainability/components/explainability_safety_badge.dart';
import 'package:iris_flutter_app/presentation/explainability/screens/explainability_screen.dart';
import 'package:iris_flutter_app/presentation/explainability/viewmodels/explainability_view_model.dart';
import '../../_infrastructure/test_app_wrapper.dart';

void main() {
  testWidgets('ExplainabilityHeader renders stably', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
        home: Scaffold(
          body: ExplainabilityHeader(
            title: 'Explainability',
            summary: 'Trace: t-1',
          ),
        ),
      ),
    );
    expect(find.text('Explainability'), findsOneWidget);
    expect(find.text('Trace: t-1'), findsOneWidget);
  });

  testWidgets('Safety badge neutral', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
        home: const Scaffold(
          body: ExplainabilitySafetyBadge(safetyLevel: SafetyLevel.neutral),
        ),
      ),
    );
    expect(find.text('Neutral'), findsOneWidget);
  });

  testWidgets('Safety badge caution and block', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
        home: const Scaffold(
          body: ExplainabilitySafetyBadge(safetyLevel: SafetyLevel.caution),
        ),
      ),
    );
    expect(find.text('Caution'), findsOneWidget);

    await tester.pumpWidget(
      MaterialApp(
        theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
        home: const Scaffold(
          body: ExplainabilitySafetyBadge(safetyLevel: SafetyLevel.block),
        ),
      ),
    );
    expect(find.text('Block'), findsOneWidget);
  });

  testWidgets('ExplainabilityScreen full layout', (tester) async {
    const vm = ExplainabilityViewModel(
      title: 'Explainability',
      summary: 'Summary',
      details: 'Details text',
      safetyLevel: SafetyLevel.neutral,
      timestampLabel: '',
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
        home: ExplainabilityScreen(viewModel: vm),
      ),
    );
    expect(find.text('Explainability'), findsWidgets);
    expect(find.text('Summary'), findsOneWidget);
    expect(find.text('Neutral'), findsOneWidget);
    expect(find.text('Details text'), findsOneWidget);
  });
}
