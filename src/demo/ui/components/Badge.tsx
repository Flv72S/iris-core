/**
 * Badge — Per label, priority, visibility, mode. Varianti: neutro, accent, warning.
 */

import React from 'react';

export type BadgeVariant = 'neutral' | 'accent' | 'warning';
export type BadgeSize = 'small' | 'medium' | 'large';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'medium',
}: BadgeProps): React.ReactElement {
  return (
    <span className={`demo-badge demo-badge--${size} demo-badge--${variant}`}>
      {children}
    </span>
  );
}
