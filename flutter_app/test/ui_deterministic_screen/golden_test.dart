import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/presentation/design_system/theme/iris_theme.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/colors.dart';
import 'package:iris_flutter_app/ui/explainability_contract/explainability_view_model.dart';
import 'package:iris_flutter_app/ui/explainability_screen/deterministic_explainability_screen.dart';
import '../_infrastructure/golden_test_config.dart';

void main() {
  testWidgets('golden safety neutral', (tester) async {
    const vm = ExplainabilityViewModel(
      traceId: 't1',
      state: '{}',
      resolution: 'r',
      outcomeStatus: 'ok',
      outcomeEffects: <String>[],
      explanationTitle: 'Explainability',
      explanationSummary: 'Summary',
      explanationDetails: 'Details text',
      safetyLevel: 'neutral',
      timestamp: '2025-01-01T00:00:00Z',
    );
    await tester.pumpWidget(
      MediaQuery(
        data: MediaQueryData(
          size: kGoldenSurfaceSize,
          devicePixelRatio: 2.0,
          textScaler: TextScaler.linear(1.0),
        ),
        child: MaterialApp(
          theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
          home: DeterministicExplainabilityScreen(viewModel: vm),
        ),
      ),
    );
    await expectLater(
      find.byType(DeterministicExplainabilityScreen),
      matchesGoldenFile('golden/deterministic_explainability_neutral.png'),
    );
  });

  testWidgets('golden safety caution', (tester) async {
    const vm = ExplainabilityViewModel(
      traceId: 't2',
      state: '{}',
      resolution: 'r',
      outcomeStatus: 'ok',
      outcomeEffects: <String>[],
      explanationTitle: 'Explainability',
      explanationSummary: 'Summary',
      explanationDetails: 'Details',
      safetyLevel: 'caution',
      timestamp: '2025-01-01T00:00:00Z',
    );
    await tester.pumpWidget(
      MediaQuery(
        data: MediaQueryData(
          size: kGoldenSurfaceSize,
          devicePixelRatio: 2.0,
          textScaler: TextScaler.linear(1.0),
        ),
        child: MaterialApp(
          theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
          home: DeterministicExplainabilityScreen(viewModel: vm),
        ),
      ),
    );
    await expectLater(
      find.byType(DeterministicExplainabilityScreen),
      matchesGoldenFile('golden/deterministic_explainability_caution.png'),
    );
  });

  testWidgets('golden safety block', (tester) async {
    const vm = ExplainabilityViewModel(
      traceId: 't3',
      state: '{}',
      resolution: 'r',
      outcomeStatus: 'block',
      outcomeEffects: <String>[],
      explanationTitle: 'Explainability',
      explanationSummary: 'Summary',
      explanationDetails: 'Details',
      safetyLevel: 'block',
      timestamp: '2025-01-01T00:00:00Z',
    );
    await tester.pumpWidget(
      MediaQuery(
        data: MediaQueryData(
          size: kGoldenSurfaceSize,
          devicePixelRatio: 2.0,
          textScaler: TextScaler.linear(1.0),
        ),
        child: MaterialApp(
          theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
          home: DeterministicExplainabilityScreen(viewModel: vm),
        ),
      ),
    );
    await expectLater(
      find.byType(DeterministicExplainabilityScreen),
      matchesGoldenFile('golden/deterministic_explainability_block.png'),
    );
  });
}
