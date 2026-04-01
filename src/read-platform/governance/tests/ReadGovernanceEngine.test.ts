/**
 * Read Governance Engine - unit test
 * Verifica: aggregazione decisioni, severita, reasons, ordine, immutabilita.
 */

import { describe, it, expect } from 'vitest';
import { ReadGovernanceEngine } from '../ReadGovernanceEngine';
import type { ReadGovernanceRule } from '../ReadGovernanceRule';

type SimpleInput = { value: number };

describe('ReadGovernanceEngine', () => {
  it('nessuna regola applicabile -> healthy', () => {
    const alwaysNull: ReadGovernanceRule<SimpleInput> = {
      evaluate: () => null,
    };
    const engine = new ReadGovernanceEngine<SimpleInput>([alwaysNull]);
    const result = engine.evaluate({ value: 1 });
    expect(result.status).toBe('healthy');
    expect(result.reasons).toEqual([]);
  });

  it('una regola degraded -> degraded', () => {
    const degradedRule: ReadGovernanceRule<SimpleInput> = {
      evaluate: () => ({ status: 'degraded', reasons: ['lag high'] }),
    };
    const engine = new ReadGovernanceEngine<SimpleInput>([degradedRule]);
    const result = engine.evaluate({ value: 1 });
    expect(result.status).toBe('degraded');
    expect(result.reasons).toEqual(['lag high']);
  });

  it('piu regole -> status piu severo vince', () => {
    const healthyRule: ReadGovernanceRule<SimpleInput> = {
      evaluate: () => ({ status: 'healthy', reasons: ['ok'] }),
    };
    const degradedRule: ReadGovernanceRule<SimpleInput> = {
      evaluate: () => ({ status: 'degraded', reasons: ['slow'] }),
    };
    const unreliableRule: ReadGovernanceRule<SimpleInput> = {
      evaluate: () => ({ status: 'unreliable', reasons: ['broken'] }),
    };
    const engine = new ReadGovernanceEngine<SimpleInput>([
      healthyRule,
      degradedRule,
      unreliableRule,
    ]);
    const result = engine.evaluate({ value: 1 });
    expect(result.status).toBe('unreliable');
  });

  it('le reasons sono aggregate correttamente', () => {
    const rule1: ReadGovernanceRule<SimpleInput> = {
      evaluate: () => ({ status: 'degraded', reasons: ['a', 'b'] }),
    };
    const rule2: ReadGovernanceRule<SimpleInput> = {
      evaluate: () => ({ status: 'healthy', reasons: ['c'] }),
    };
    const engine = new ReadGovernanceEngine<SimpleInput>([rule1, rule2]);
    const result = engine.evaluate({ value: 1 });
    expect(result.reasons).toEqual(['a', 'b', 'c']);
  });

  it('le regole vengono valutate in ordine', () => {
    const order: number[] = [];
    const rule1: ReadGovernanceRule<SimpleInput> = {
      evaluate: (input) => {
        order.push(1);
        return input.value > 0 ? { status: 'healthy', reasons: [] } : null;
      },
    };
    const rule2: ReadGovernanceRule<SimpleInput> = {
      evaluate: () => {
        order.push(2);
        return { status: 'degraded', reasons: ['x'] };
      },
    };
    const engine = new ReadGovernanceEngine<SimpleInput>([rule1, rule2]);
    engine.evaluate({ value: 1 });
    expect(order).toEqual([1, 2]);
  });

  it('engine non muta input ne decisioni', () => {
    const input = { value: 42 };
    const rule: ReadGovernanceRule<SimpleInput> = {
      evaluate: (i) => {
        expect(i).toBe(input);
        return { status: 'healthy', reasons: ['r1'] };
      },
    };
    const engine = new ReadGovernanceEngine<SimpleInput>([rule]);
    const result = engine.evaluate(input);
    expect(input.value).toBe(42);
    expect(result.reasons).toEqual(['r1']);
    expect(result.reasons[0]).toBe('r1');
  });
});
