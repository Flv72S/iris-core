// Phase 11.3.2 — Pure sections. No logic, direct mapping only.

import 'package:flutter/material.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/colors.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/spacing.dart';

class SafetyBadgeSection extends StatelessWidget {
  const SafetyBadgeSection({super.key, required this.safetyLevel});
  final String safetyLevel;

  static Color _color(String level) {
    switch (level) {
      case 'neutral':
        return IrisColors.safetyNeutral;
      case 'caution':
        return IrisColors.safetyCaution;
      case 'block':
        return IrisColors.safetyBlock;
      default:
        return IrisColors.safetyNeutral;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _color(safetyLevel);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: IrisSpacing.sm, vertical: IrisSpacing.xxs),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color),
      ),
      child: Text(safetyLevel, style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 14)),
    );
  }
}

class StateResolutionSection extends StatelessWidget {
  const StateResolutionSection({super.key, required this.state, required this.resolution});
  final String state;
  final String resolution;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('State', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: IrisSpacing.xxs),
        Text(state, style: Theme.of(context).textTheme.bodyMedium),
        const SizedBox(height: IrisSpacing.sm),
        Text('Resolution', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: IrisSpacing.xxs),
        Text(resolution, style: Theme.of(context).textTheme.bodyMedium),
      ],
    );
  }
}

class OutcomeSection extends StatelessWidget {
  const OutcomeSection({super.key, required this.outcomeStatus, required this.outcomeEffects});
  final String outcomeStatus;
  final List<String> outcomeEffects;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('Outcome', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: IrisSpacing.xxs),
        Text(outcomeStatus, style: Theme.of(context).textTheme.bodyMedium),
        ...outcomeEffects.map((e) => Padding(
              padding: const EdgeInsets.only(top: IrisSpacing.xxs),
              child: Text(e, style: Theme.of(context).textTheme.bodySmall),
            )),
      ],
    );
  }
}

class DetailsSection extends StatelessWidget {
  const DetailsSection({super.key, required this.explanationDetails});
  final String explanationDetails;
  static const double _fixedHeight = 120.0;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: _fixedHeight,
      child: SingleChildScrollView(
        child: Text(explanationDetails, style: Theme.of(context).textTheme.bodyMedium),
      ),
    );
  }
}

class TimestampFooter extends StatelessWidget {
  const TimestampFooter({super.key, required this.timestamp});
  final String timestamp;

  @override
  Widget build(BuildContext context) {
    return Text(timestamp, style: Theme.of(context).textTheme.bodySmall);
  }
}
