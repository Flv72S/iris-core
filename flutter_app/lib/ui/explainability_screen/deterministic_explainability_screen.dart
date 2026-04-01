// Phase 11.3.2 — First certified IRIS screen. No logic, mirror of trace.

import 'package:flutter/material.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/spacing.dart';
import 'package:iris_flutter_app/ui/explainability_contract/explainability_view_model.dart';
import 'package:iris_flutter_app/ui/explainability_screen/explainability_sections.dart';

/// Certified explainability screen. Accepts only contract ViewModel.
class DeterministicExplainabilityScreen extends StatelessWidget {
  const DeterministicExplainabilityScreen({
    super.key,
    required this.viewModel,
  });

  final ExplainabilityViewModel viewModel;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(viewModel.explanationTitle),
      ),
      body: Padding(
        padding: const EdgeInsets.all(IrisSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              viewModel.explanationSummary,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: IrisSpacing.sm),
            SafetyBadgeSection(safetyLevel: viewModel.safetyLevel),
            const SizedBox(height: IrisSpacing.sm),
            StateResolutionSection(
              state: viewModel.state,
              resolution: viewModel.resolution,
            ),
            const SizedBox(height: IrisSpacing.sm),
            OutcomeSection(
              outcomeStatus: viewModel.outcomeStatus,
              outcomeEffects: viewModel.outcomeEffects,
            ),
            const SizedBox(height: IrisSpacing.sm),
            DetailsSection(explanationDetails: viewModel.explanationDetails),
            const SizedBox(height: IrisSpacing.sm),
            TimestampFooter(timestamp: viewModel.timestamp),
          ],
        ),
      ),
    );
  }
}
