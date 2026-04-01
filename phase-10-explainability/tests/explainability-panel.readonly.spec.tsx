/**
 * Phase 10.3 — Explainability Panel read-only: no input handlers, no mutative events
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ExplainabilityPanel } from '../ux/ExplainabilityPanel';
import type { Explanation } from '../explanation/explanation.types';

function makeExplanation(): Explanation {
  return {
    explanationId: 'ex-1',
    traceId: 'trace-1',
    summary: 'Summary.',
    sections: [
      { sectionType: 'WHAT', content: 'What.', sourceSteps: [0] },
      { sectionType: 'WHY', content: 'Why.', sourceSteps: [] },
      { sectionType: 'WHY_NOT', content: 'Why not.', sourceSteps: [] },
      { sectionType: 'MODE', content: 'Mode.', sourceSteps: [] },
      { sectionType: 'SAFETY', content: 'Safety.', sourceSteps: [] },
      { sectionType: 'OUTCOME', content: 'Outcome.', sourceSteps: [] },
    ],
    explanationHash: 'hash',
  };
}

describe('Explainability Panel read-only', () => {
  it('panel has no buttons or form controls', () => {
    const explanation = makeExplanation();
    const { container } = render(<ExplainabilityPanel explanation={explanation} />);
    expect(container.querySelectorAll('button').length).toBe(0);
    expect(container.querySelectorAll('input, select, textarea').length).toBe(0);
  });

  it('same explanation produces same structure', () => {
    const explanation = makeExplanation();
    const { container } = render(<ExplainabilityPanel explanation={explanation} />);
    const html = container.innerHTML;
    const { container: c2 } = render(<ExplainabilityPanel explanation={explanation} />);
    expect(c2.innerHTML).toBe(html);
  });
});
