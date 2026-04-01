// Phase 11.1.3 — Explainability panel. Always reachable.

import 'package:flutter/material.dart';
import 'package:iris_flutter_app/presentation/design_system/components/iris_text.dart';
import 'package:iris_flutter_app/presentation/navigation/route_params.dart';

class ExplainabilityPanelScreen extends StatelessWidget {
  const ExplainabilityPanelScreen({super.key, required this.params});

  final ExplainabilityParams params;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Explainability')),
      body: IrisText('${params.explanationId} / ${params.traceId}'),
    );
  }
}
