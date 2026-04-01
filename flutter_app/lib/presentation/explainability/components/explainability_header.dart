import 'package:flutter/material.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/spacing.dart';

class ExplainabilityHeader extends StatelessWidget {
  const ExplainabilityHeader({super.key, required this.title, required this.summary});

  final String title;
  final String summary;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: IrisSpacing.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(title, style: theme.textTheme.titleLarge),
          const SizedBox(height: IrisSpacing.xs),
          Text(summary, style: theme.textTheme.bodyMedium),
        ],
      ),
    );
  }
}
