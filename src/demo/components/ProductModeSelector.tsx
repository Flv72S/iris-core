/**
 * ProductModeSelector — Toggle DEFAULT / FOCUS / WELLBEING. Read-only UI.
 */

import React from 'react';
import type { ProductMode } from '../../product/orchestration/ProductMode';

const MODES: ProductMode[] = ['DEFAULT', 'FOCUS', 'WELLBEING'];

interface ProductModeSelectorProps {
  selected: ProductMode;
  onSelect: (mode: ProductMode) => void;
}

export function ProductModeSelector({
  selected,
  onSelect,
}: ProductModeSelectorProps): React.ReactElement {
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ marginRight: 8 }}>Product Mode</span>
      {MODES.map((mode) => (
        <label key={mode} style={{ marginRight: 12 }}>
          <input
            type="radio"
            name="product-mode"
            value={mode}
            checked={selected === mode}
            onChange={() => onSelect(mode)}
          />
          {mode}
        </label>
      ))}
    </div>
  );
}
