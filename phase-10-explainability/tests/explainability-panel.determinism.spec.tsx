/**
 * Phase 10.3 — Explainability Panel determinism: same Explanation → same DOM snapshot
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ExplainabilityPanel } from '../ux/ExplainabilityPanel';
import type { Explanation } from '../explanation/explanation.types';

function makeExplanation(): Explanation {
  return Object.freeze({
    explanationId: 'ex-1',
    traceId: 'trace-1',
    summary: 'Trace trace-1: RESOLVED_ALLOWED. EXECUTION_SUCCESS. Mode: DEFAULT.',
    sections: Object.freeze([
      Object.freeze({ sectionType: 'WHAT', content: 'The action was executed.', sourceSteps: [2, 4] }),
      Object.freeze({ sectionType: 'WHY', content: 'Resolution state allowed the action.', sourceSteps: [1, 2] }),
      Object.freeze({ sectionType: 'WHY_NOT', content: 'No block applied.', sourceSteps: [2] }),
      Object.freeze({ sectionType: 'MODE', content: 'Active mode is DEFAULT.', sourceSteps: [3] }),
      Object.freeze({ sectionType: 'SAFETY', content: 'Safety checklist outcome was recorded.', sourceSteps: [5] }),
      Object.freeze({ sectionType: 'OUTCOME', content: 'Outcome was appended to the certified outcome log.', sourceSteps: [5] }),
    ]),
    explanationHash: 'abc123',
  });
}

describe('Explainability Panel determinism', () => {
  it('same explanation produces same DOM snapshot', () => {
    const explanation = makeExplanation();
    const { container: c1 } = render(<ExplainabilityPanel explanation={explanation} />);
    const { container: c2 } = render(<ExplainabilityPanel explanation={explanation} />);
    expect(c1.innerHTML).toBe(c2.innerHTML);
  });

  it('no dependency on clock or random', () => {
    const explanation = makeExplanation();
    const { container } = render(<ExplainabilityPanel explanation={explanation} />);
    expect(container.innerHTML).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(container.textContent).not.toContain('random');
  });
});
