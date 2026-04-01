/**
 * Phase 10.3 — Explainability Panel render: all sections, correct order, content identical
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ExplainabilityPanel } from '../ux/ExplainabilityPanel';
import type { Explanation } from '../explanation/explanation.types';

function makeExplanation(overrides?: Partial<Explanation>): Explanation {
  return {
    explanationId: 'ex-1',
    traceId: 'trace-1',
    summary: 'Trace trace-1: RESOLVED_ALLOWED. EXECUTION_SUCCESS. Mode: DEFAULT.',
    sections: [
      { sectionType: 'WHAT', content: 'The action was executed because it was allowed.', sourceSteps: [2, 4] },
      { sectionType: 'WHY', content: 'Resolution state allowed the action.', sourceSteps: [1, 2] },
      { sectionType: 'WHY_NOT', content: 'The action was performed. No block applied.', sourceSteps: [2] },
      { sectionType: 'MODE', content: 'Active mode is DEFAULT.', sourceSteps: [3] },
      { sectionType: 'SAFETY', content: 'Safety checklist outcome was recorded.', sourceSteps: [5] },
      { sectionType: 'OUTCOME', content: 'Outcome was appended to the certified outcome log.', sourceSteps: [5] },
    ],
    explanationHash: 'abc123',
    ...overrides,
  };
}

describe('Explainability Panel render', () => {
  it('renders all sections', () => {
    const explanation = makeExplanation();
    const { container } = render(<ExplainabilityPanel explanation={explanation} />);
    expect(container.querySelector('[data-testid="section-WHAT"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="section-WHY"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="section-WHY_NOT"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="section-MODE"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="section-SAFETY"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="section-OUTCOME"]')).toBeTruthy();
  });

  it('sections are in fixed order WHAT, WHY, WHY_NOT, MODE, SAFETY, OUTCOME', () => {
    const explanation = makeExplanation();
    const { container } = render(<ExplainabilityPanel explanation={explanation} />);
    const sections = container.querySelectorAll('[data-section-type]');
    expect(sections[0].getAttribute('data-section-type')).toBe('WHAT');
    expect(sections[1].getAttribute('data-section-type')).toBe('WHY');
    expect(sections[2].getAttribute('data-section-type')).toBe('WHY_NOT');
    expect(sections[3].getAttribute('data-section-type')).toBe('MODE');
    expect(sections[4].getAttribute('data-section-type')).toBe('SAFETY');
    expect(sections[5].getAttribute('data-section-type')).toBe('OUTCOME');
  });

  it('content is identical to Explanation', () => {
    const explanation = makeExplanation();
    const { container } = render(<ExplainabilityPanel explanation={explanation} />);
    expect(container.textContent).toContain('The action was executed because it was allowed.');
    expect(container.textContent).toContain('Resolution state allowed the action.');
    expect(container.textContent).toContain('Active mode is DEFAULT.');
  });

  it('header shows explanation ID and trace ID', () => {
    const explanation = makeExplanation();
    const { container } = render(<ExplainabilityPanel explanation={explanation} />);
    expect(container.querySelector('[data-testid="explanation-id"]')?.textContent).toContain('ex-1');
    expect(container.querySelector('[data-testid="trace-id"]')?.textContent).toContain('trace-1');
  });

  it('footer shows explanation hash', () => {
    const explanation = makeExplanation();
    const { container } = render(<ExplainabilityPanel explanation={explanation} />);
    expect(container.querySelector('[data-testid="explanation-hash"]')?.textContent).toContain('abc123');
  });
});

