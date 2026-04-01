// Phase 11.8.2 — Presentational widget. Read-only state; no controller, no clock.

import 'package:flutter/material.dart';

import 'runtime_trust_state.dart';

/// Displays current certification status. Certified: green badge + pack/session/tick. Uncertified: red badge only.
class RuntimeTrustIndicator extends StatelessWidget {
  const RuntimeTrustIndicator({super.key, required this.state});

  final RuntimeTrustState state;

  static String _abbreviateHash(String hash) {
    if (hash.length <= 12) return hash;
    return hash.substring(0, 12);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isCertified = state.isCertified;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: isCertified
            ? Colors.green.shade50
            : Colors.red.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isCertified ? Colors.green : Colors.red,
          width: 1,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isCertified ? Icons.check_circle : Icons.cancel,
                size: 20,
                color: isCertified ? Colors.green : Colors.red,
              ),
              const SizedBox(width: 6),
              Text(
                isCertified ? 'Certified Runtime' : 'Uncertified Runtime',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: isCertified ? Colors.green.shade800 : Colors.red.shade800,
                ),
              ),
            ],
          ),
          if (state.isCertified && state.compliancePackHash.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              'Pack: ${_abbreviateHash(state.compliancePackHash)}',
              style: theme.textTheme.bodySmall,
            ),
            Text(
              'Tick: ${state.logicalTick}',
              style: theme.textTheme.bodySmall,
            ),
            Text(
              'Session: ${state.sessionId}',
              style: theme.textTheme.bodySmall,
            ),
          ],
        ],
      ),
    );
  }
}
