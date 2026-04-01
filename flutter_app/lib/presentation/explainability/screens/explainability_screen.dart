// Phase 11.1.5 — Explainability screen. ViewModel only. Deterministic layout.

import 'package:flutter/material.dart';
import 'package:iris_flutter_app/presentation/design_system/components/iris_section.dart';
import 'package:iris_flutter_app/presentation/explainability/components/explainability_details_section.dart';
import 'package:iris_flutter_app/presentation/explainability/components/explainability_header.dart';
import 'package:iris_flutter_app/presentation/explainability/components/explainability_safety_badge.dart';
import 'package:iris_flutter_app/presentation/explainability/viewmodels/explainability_view_model.dart';

class ExplainabilityScreen extends StatelessWidget {
  const ExplainabilityScreen({super.key, required this.viewModel});

  final ExplainabilityViewModel viewModel;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(viewModel.title)),
      body: IrisSection(
        title: viewModel.title,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            ExplainabilityHeader(
              title: viewModel.title,
              summary: viewModel.summary,
            ),
            ExplainabilitySafetyBadge(safetyLevel: viewModel.safetyLevel),
            if (viewModel.timestampLabel.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  viewModel.timestampLabel,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ExplainabilityDetailsSection(details: viewModel.details),
          ],
        ),
      ),
    );
  }
}
