import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/presentation/design_system/theme/iris_theme.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/colors.dart';
import 'package:iris_flutter_app/ui/explainability_contract/explainability_view_model.dart';
import 'package:iris_flutter_app/ui/explainability_screen/deterministic_explainability_screen.dart';

const vm = ExplainabilityViewModel(
  traceId: 't1',
  state: '{}',
  resolution: 'res',
  outcomeStatus: 'ok',
  outcomeEffects: <String>['e1'],
  explanationTitle: 'Title',
  explanationSummary: 'Summary',
  explanationDetails: 'Details',
  safetyLevel: 'neutral',
  timestamp: '2025-01-01T00:00:00Z',
);

void main() {
  testWidgets('Scaffold and AppBar', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
        home: DeterministicExplainabilityScreen(viewModel: vm),
      ),
    );
    expect(find.byType(Scaffold), findsOneWidget);
    expect(find.byType(AppBar), findsOneWidget);
    expect(find.text('Title'), findsOneWidget);
  });
  testWidgets('sections present', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
        home: DeterministicExplainabilityScreen(viewModel: vm),
      ),
    );
    expect(find.text('Summary'), findsOneWidget);
    expect(find.text('State'), findsOneWidget);
    expect(find.text('Outcome'), findsOneWidget);
  });
}
