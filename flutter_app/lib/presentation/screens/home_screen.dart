// Phase 11.1.3 — HomeScreen. Design system. Navigation to all screens.

import 'package:flutter/material.dart';
import 'package:iris_flutter_app/presentation/design_system/components/iris_text.dart';
import 'package:iris_flutter_app/presentation/navigation/iris_routes.dart';
import 'package:iris_flutter_app/presentation/navigation/route_params.dart';

/// Home. Deterministic. Links to Decision, Explainability, History, Settings.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('IRIS')),
      body: ListView(
        children: [
          ListTile(
            title: const IrisText('Decision Detail'),
            onTap: () => Navigator.pushNamed(
              context,
              IrisRoutes.decisionDetail,
              arguments: const DecisionDetailParams(traceId: 'trace-1'),
            ),
          ),
          ListTile(
            title: const IrisText('Explainability'),
            onTap: () => Navigator.pushNamed(
              context,
              IrisRoutes.explainabilityPanel,
              arguments: const ExplainabilityParams(
                explanationId: 'ex-1',
                traceId: 'trace-1',
              ),
            ),
          ),
          ListTile(
            title: const IrisText('History'),
            onTap: () => Navigator.pushNamed(context, IrisRoutes.history),
          ),
          ListTile(
            title: const IrisText('Settings'),
            onTap: () => Navigator.pushNamed(context, IrisRoutes.settingsMode),
          ),
        ],
      ),
    );
  }
}
