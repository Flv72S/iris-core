/**
 * Card — Contenitore standard. Border sottile, padding consistente.
 */

import React from 'react';

interface CardProps {
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export function Card({ title, className, children }: CardProps): React.ReactElement {
  return (
    <div className={className ? `demo-card ${className}` : 'demo-card'}>
      {title != null && (
        <h2 className="demo-h2" style={{ marginBottom: '0.75rem' }}>
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
