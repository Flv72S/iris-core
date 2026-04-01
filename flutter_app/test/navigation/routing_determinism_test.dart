// Phase 11.1.3 — Routing determinism. Same route → same screen. No implicit redirects.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/main.dart';
import 'package:iris_flutter_app/presentation/navigation/iris_routes.dart';
import 'package:iris_flutter_app/presentation/navigation/iris_router.dart';
import 'package:iris_flutter_app/presentation/navigation/route_params.dart';
import 'package:iris_flutter_app/presentation/screens/decision_detail_screen.dart';
import 'package:iris_flutter_app/presentation/explainability/screens/explainability_screen.dart';
import 'package:iris_flutter_app/presentation/explainability/viewmodels/explainability_view_model.dart';
import 'package:iris_flutter_app/presentation/screens/history_screen.dart';
import 'package:iris_flutter_app/presentation/screens/home_screen.dart';
import 'package:iris_flutter_app/presentation/screens/settings_mode_screen.dart';

void main() {
  testWidgets('Initial route is Home', (tester) async {
    await tester.pumpWidget(const IrisApp());
    expect(find.byType(HomeScreen), findsOneWidget);
  });

  testWidgets('Home route yields HomeScreen', (tester) async {
    await tester.pumpWidget(MaterialApp(
      onGenerateRoute: IrisRouter.onGenerateRoute,
      initialRoute: IrisRoutes.home,
    ));
    await tester.pumpAndSettle();
    expect(find.byType(HomeScreen), findsOneWidget);
  });

  testWidgets('History route yields HistoryScreen', (tester) async {
    await tester.pumpWidget(MaterialApp(
      onGenerateRoute: IrisRouter.onGenerateRoute,
      initialRoute: IrisRoutes.history,
    ));
    await tester.pumpAndSettle();
    expect(find.byType(HistoryScreen), findsOneWidget);
  });

  testWidgets('SettingsMode route yields SettingsModeScreen', (tester) async {
    await tester.pumpWidget(MaterialApp(
      onGenerateRoute: IrisRouter.onGenerateRoute,
      initialRoute: IrisRoutes.settingsMode,
    ));
    await tester.pumpAndSettle();
    expect(find.byType(SettingsModeScreen), findsOneWidget);
  });

  testWidgets('Route names are stable', (tester) async {
    expect(IrisRoutes.home, 'home');
    expect(IrisRoutes.decisionDetail, 'decisionDetail');
    expect(IrisRoutes.explainabilityPanel, 'explainabilityPanel');
    expect(IrisRoutes.history, 'history');
    expect(IrisRoutes.settingsMode, 'settingsMode');
    expect(IrisRoutes.all.length, 5);
  });

  test('DecisionDetailParams equality is deterministic', () {
    const a = DecisionDetailParams(traceId: 't1');
    const b = DecisionDetailParams(traceId: 't1');
    expect(a, b);
    expect(a.hashCode, b.hashCode);
  });

  test('ExplainabilityParams equality is deterministic', () {
    const a = ExplainabilityParams(explanationId: 'ex1', traceId: 't1');
    const b = ExplainabilityParams(explanationId: 'ex1', traceId: 't1');
    expect(a, b);
    expect(a.hashCode, b.hashCode);
  });

  testWidgets('ExplainabilityScreen renders with ViewModel', (tester) async {
    const vm = ExplainabilityViewModel(
      title: 'Explainability',
      summary: 'Trace: t-1',
      details: 'ex-1 / t-1',
      safetyLevel: SafetyLevel.neutral,
      timestampLabel: '',
    );
    await tester.pumpWidget(MaterialApp(
      home: ExplainabilityScreen(viewModel: vm),
    ));
    expect(find.byType(ExplainabilityScreen), findsOneWidget);
    expect(find.text('ex-1 / t-1'), findsOneWidget);
  });
}
