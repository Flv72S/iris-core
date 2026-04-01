import 'package:flutter/material.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/spacing.dart';

class ExplainabilityDetailsSection extends StatelessWidget {
  const ExplainabilityDetailsSection({super.key, required this.details});

  final String details;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      height: 200,
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.only(top: IrisSpacing.xs),
          child: Text(details, style: theme.textTheme.bodyMedium),
        ),
      ),
    );
  }
}
