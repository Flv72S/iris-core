/**
 * Microstep 14N — Covenant DSL. Safe expression evaluator.
 * NO eval(), NO Function(). Parse and interpret only.
 */

import type { CovenantContext } from '../covenants/index.js';
import { parseCondition } from './covenant_parser.js';

/** Safe view for expression evaluation. */
function buildView(ctx: CovenantContext): Record<string, unknown> {
  const stateView = (s: CovenantContext['current_state']) => ({
    value: s.accepted_proposals.length,
    accepted_proposals_count: s.accepted_proposals.length,
    last_accepted_proposal_id: s.last_accepted_proposal_id,
  });
  const consensusView = ctx.consensus_result
    ? {
        accepted: ctx.consensus_result.accepted,
        proposal_id: ctx.consensus_result.proposal_id,
        quorum_reached: ctx.consensus_result.quorum_reached,
        total_votes: ctx.consensus_result.total_votes,
      }
    : undefined;
  return {
    state: stateView(ctx.current_state),
    prev: ctx.previous_state ? stateView(ctx.previous_state) : undefined,
    consensus: consensusView,
    replay: ctx.replay_result ? { valid: ctx.replay_result.valid } : undefined,
    log: { length: ctx.log_entries?.length ?? 0 },
  };
}

function resolve(view: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = view;
  for (const key of path) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

type ASTNode =
  | { type: 'member'; path: string[] }
  | { type: 'literal'; value: number | string | boolean }
  | { type: 'binary'; op: string; left: ASTNode; right: ASTNode }
  | { type: 'unary'; op: '!'; argument: ASTNode };

function interpret(node: ASTNode, view: Record<string, unknown>): unknown {
  switch (node.type) {
    case 'member':
      return resolve(view, node.path);
    case 'literal':
      return node.value;
    case 'unary':
      if (node.op === '!') return !interpret(node.argument, view);
      return undefined;
    case 'binary': {
      const l = interpret(node.left, view);
      const r = interpret(node.right, view);
      switch (node.op) {
        case '==': return l === r;
        case '!=': return l !== r;
        case '<': return typeof l === 'number' && typeof r === 'number' ? l < r : false;
        case '<=': return typeof l === 'number' && typeof r === 'number' ? l <= r : false;
        case '>': return typeof l === 'number' && typeof r === 'number' ? l > r : false;
        case '>=': return typeof l === 'number' && typeof r === 'number' ? l >= r : false;
        case '&&': return Boolean(l && r);
        case '||': return Boolean(l || r);
        default: return false;
      }
    }
    default:
      return undefined;
  }
}

/**
 * Evaluate a condition string against context. Uses parser (no eval).
 * Returns boolean; throws CovenantDSLError on invalid/unsafe expression.
 */
export function evaluate(condition: string, context: CovenantContext): boolean {
  const ast = parseCondition(condition);
  const view = buildView(context);
  const result = interpret(ast as unknown as ASTNode, view);
  return Boolean(result);
}
