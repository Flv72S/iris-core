import 'package:flutter/material.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/colors.dart';
import 'package:iris_flutter_app/presentation/explainability/viewmodels/explainability_view_model.dart';

class ExplainabilitySafetyBadge extends StatelessWidget {
  const ExplainabilitySafetyBadge({super.key, required this.safetyLevel});

  final SafetyLevel safetyLevel;

  static Color _color(SafetyLevel level) {
    switch (level) {
      case SafetyLevel.neutral:
        return IrisColors.safetyNeutral;
      case SafetyLevel.caution:
        return IrisColors.safetyCaution;
      case SafetyLevel.block:
        return IrisColors.safetyBlock;
    }
  }

  static String _label(SafetyLevel level) {
    switch (level) {
      case SafetyLevel.neutral:
        return 'Neutral';
      case SafetyLevel.caution:
        return 'Caution';
      case SafetyLevel.block:
        return 'Block';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: _color(safetyLevel).withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _color(safetyLevel)),
      ),
      child: Text(
        _label(safetyLevel),
        style: TextStyle(
          color: _color(safetyLevel),
          fontWeight: FontWeight.w600,
          fontSize: 14,
        ),
      ),
    );
  }
}
