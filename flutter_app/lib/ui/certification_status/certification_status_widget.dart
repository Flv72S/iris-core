// Microstep 12.5 — Neutral presentational widget. No interpretation, no normative claim.

import 'package:flutter/material.dart';

import 'certification_status_view_model.dart';

/// Widget puramente presentazionale per visualizzare CertificationStatusViewModel.
/// Mostra solo dati; nessun colore semantico, nessuna icona, nessun giudizio.
class CertificationStatusWidget extends StatelessWidget {
  const CertificationStatusWidget({
    super.key,
    required this.viewModel,
  });

  final CertificationStatusViewModel viewModel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context).textTheme;
    final children = <Widget>[
      Text(viewModel.title, style: theme.titleMedium),
      if (viewModel.subtitle.isNotEmpty) ...[
        SizedBox(height: 4),
        Text(viewModel.subtitle, style: theme.bodySmall),
      ],
      SizedBox(height: 16),
    ];
    for (final cap in viewModel.capabilities) {
      children.add(Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(cap.label, style: theme.bodyMedium),
            SizedBox(height: 2),
            Text(cap.description, style: theme.bodySmall),
          ],
        ),
      ));
    }
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: children,
    );
  }
}
