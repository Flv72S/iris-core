/**
 * Header — Titolo e sottotitolo app. Solo presentazione.
 */

import React from 'react';

export function Header(): React.ReactElement {
  return (
    <header className="demo-header">
      <h1 className="demo-h1">IRIS — Product State Demo</h1>
      <p className="demo-header-subtitle">
        Read-only visualization of system state, experience and feature composition.
      </p>
    </header>
  );
}
