// Phase 11.1.3 — Decision detail. Design system only.

import 'package:flutter/material.dart';
import 'package:iris_flutter_app/presentation/design_system/components/iris_section.dart';
import 'package:iris_flutter_app/presentation/design_system/components/iris_text.dart';
import 'package:iris_flutter_app/presentation/navigation/route_params.dart';

class DecisionDetailScreen extends StatelessWidget {
  const DecisionDetailScreen({super.key, required this.params});

  final DecisionDetailParams params;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Decision Detail')),
      body: IrisSection(title: 'Trace', child: IrisText(params.traceId)),
    );
  }
}
