// Phase 11.1.3 — Deterministic routing. Route → screen only. No decision logic.

import 'package:flutter/material.dart';
import 'package:iris_flutter_app/presentation/navigation/iris_routes.dart';
import 'package:iris_flutter_app/presentation/navigation/route_params.dart';
import 'package:iris_flutter_app/presentation/screens/decision_detail_screen.dart';
import 'package:iris_flutter_app/presentation/explainability/screens/explainability_screen.dart';
import 'package:iris_flutter_app/presentation/explainability/viewmodels/explainability_view_model.dart';
import 'package:iris_flutter_app/presentation/screens/history_screen.dart';
import 'package:iris_flutter_app/presentation/screens/home_screen.dart';
import 'package:iris_flutter_app/presentation/screens/settings_mode_screen.dart';

/// Pure mapping: route name + args → screen. No redirects, no conditional logic.
class IrisRouter {
  IrisRouter._();

  static Route<dynamic>? onGenerateRoute(RouteSettings settings) {
    final name = settings.name;
    final args = settings.arguments;

    Widget screen;
    switch (name) {
      case IrisRoutes.home:
        screen = const HomeScreen();
        break;
      case IrisRoutes.decisionDetail:
        screen = DecisionDetailScreen(
          params: args is DecisionDetailParams
              ? args
              : DecisionDetailParams(traceId: args?.toString() ?? ''),
        );
        break;
      case IrisRoutes.explainabilityPanel:
        final vm = args is ExplainabilityViewModel
            ? args as ExplainabilityViewModel
            : _viewModelFromParams(
                args is ExplainabilityParams
                    ? args as ExplainabilityParams
                    : const ExplainabilityParams(
                        explanationId: '',
                        traceId: '',
                      ),
              );
        screen = ExplainabilityScreen(viewModel: vm);
        break;
      case IrisRoutes.history:
        screen = const HistoryScreen();
        break;
      case IrisRoutes.settingsMode:
        screen = const SettingsModeScreen();
        break;
      default:
        screen = const HomeScreen();
    }

    return MaterialPageRoute<dynamic>(
      settings: settings,
      builder: (_) => screen,
    );
  }

  static ExplainabilityViewModel _viewModelFromParams(ExplainabilityParams p) {
    return ExplainabilityViewModel(
      title: 'Explainability',
      summary: 'Trace: ${p.traceId}',
      details: 'Explanation ID: ${p.explanationId}\nTrace ID: ${p.traceId}',
      safetyLevel: SafetyLevel.neutral,
      timestampLabel: '',
    );
  }
}
