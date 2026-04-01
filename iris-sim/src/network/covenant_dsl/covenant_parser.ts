/**
 * Microstep 14N — Covenant DSL. Safe condition parser.
 * Tokenizes, validates syntax, rejects unsafe patterns.
 */

import { CovenantDSLError, CovenantDSLErrorCode } from './covenant_dsl_errors.js';
import type { ParsedExpression } from './covenant_dsl_types.js';

const ROOT_KEYS = new Set(['state', 'prev', 'consensus', 'replay', 'log']);
const ALLOWED_PROPS = new Set([
  'value', 'accepted_proposals_count', 'last_accepted_proposal_id',
  'accepted', 'proposal_id', 'quorum_reached', 'total_votes',
  'valid', 'length',
]);
const UNSAFE = new Set([
  'eval', 'Function', 'process', 'require', 'global', 'globalThis',
  '__proto__', 'constructor', 'prototype', 'window', 'document', 'import', 'export',
]);

type Token =
  | { type: 'ident'; value: string }
  | { type: 'num'; value: number }
  | { type: 'op'; value: string }
  | { type: 'dot' }
  | { type: 'lparen' }
  | { type: 'rparen' };

type ASTNode =
  | { type: 'member'; path: string[] }
  | { type: 'literal'; value: number | string | boolean }
  | { type: 'binary'; op: string; left: ASTNode; right: ASTNode }
  | { type: 'unary'; op: '!'; argument: ASTNode };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const skip = () => {
    while (i < input.length && /\s/.test(input[i]!)) i++;
  };
  const readIdent = () => {
    const start = i;
    while (i < input.length && /[a-zA-Z_][a-zA-Z0-9_]*/.test(input[i] ?? '')) i++;
    return input.slice(start, i);
  };
  const readNum = () => {
    const start = i;
    while (i < input.length && /[0-9.]/.test(input[i] ?? '')) i++;
    return input.slice(start, i);
  };

  while (i < input.length) {
    skip();
    if (i >= input.length) break;
    const c = input[i]!;
    if (c === '.') {
      tokens.push({ type: 'dot' });
      i++;
      continue;
    }
    if (c === '(') {
      tokens.push({ type: 'lparen' });
      i++;
      continue;
    }
    if (c === ')') {
      tokens.push({ type: 'rparen' });
      i++;
      continue;
    }
    if (c === '!') {
      if (input[i + 1] === '=') {
        tokens.push({ type: 'op', value: '!=' });
        i += 2;
      } else {
        tokens.push({ type: 'op', value: '!' });
        i++;
      }
      continue;
    }
    if (c === '=' && input[i + 1] === '=') {
      tokens.push({ type: 'op', value: '==' });
      i += 2;
      continue;
    }
    if (c === '<' && input[i + 1] === '=') {
      tokens.push({ type: 'op', value: '<=' });
      i += 2;
      continue;
    }
    if (c === '>' && input[i + 1] === '=') {
      tokens.push({ type: 'op', value: '>=' });
      i += 2;
      continue;
    }
    if (c === '<' || c === '>' || c === '&' || c === '|') {
      const two = input.slice(i, i + 2);
      if (two === '&&' || two === '||') {
        tokens.push({ type: 'op', value: two });
        i += 2;
      } else if (c === '<' || c === '>') {
        tokens.push({ type: 'op', value: c });
        i++;
      } else {
        throw new CovenantDSLError(CovenantDSLErrorCode.INVALID_SYNTAX, `Unexpected at ${i}: ${c}`);
      }
      continue;
    }
    if (/[0-9]/.test(c)) {
      const raw = readNum();
      const n = Number(raw);
      if (!Number.isFinite(n)) throw new CovenantDSLError(CovenantDSLErrorCode.INVALID_SYNTAX, 'Invalid number');
      tokens.push({ type: 'num', value: n });
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      const ident = readIdent();
      if (UNSAFE.has(ident)) {
        throw new CovenantDSLError(CovenantDSLErrorCode.UNSAFE_TOKEN, `Unsafe token: ${ident}`);
      }
      tokens.push({ type: 'ident', value: ident });
      continue;
    }
    throw new CovenantDSLError(CovenantDSLErrorCode.INVALID_SYNTAX, `Unexpected character at ${i}: ${c}`);
  }
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  private current(): Token | undefined {
    return this.tokens[this.pos];
  }

  hasRemaining(): boolean {
    return this.pos < this.tokens.length;
  }

  private consume(): Token | undefined {
    return this.tokens[this.pos++];
  }

  parseLogicalOr(): ASTNode {
    let left = this.parseLogicalAnd();
    while (this.current()?.type === 'op' && (this.current() as { type: 'op'; value: string }).value === '||') {
      this.consume();
      left = { type: 'binary', op: '||', left, right: this.parseLogicalAnd() };
    }
    return left;
  }

  parseLogicalAnd(): ASTNode {
    let left = this.parseComparison();
    while (this.current()?.type === 'op' && (this.current() as { type: 'op'; value: string }).value === '&&') {
      this.consume();
      left = { type: 'binary', op: '&&', left, right: this.parseComparison() };
    }
    return left;
  }

  parseComparison(): ASTNode {
    let left = this.parsePrimary();
    const t = this.current();
    const opVal = t?.type === 'op' ? (t as { type: 'op'; value: string }).value : undefined;
    if (opVal && ['==', '!=', '<', '<=', '>', '>='].includes(opVal)) {
      this.consume();
      left = { type: 'binary', op: opVal, left, right: this.parsePrimary() };
    }
    return left;
  }

  parsePrimary(): ASTNode {
    const t = this.current();
    if (!t) throw new CovenantDSLError(CovenantDSLErrorCode.INVALID_SYNTAX, 'Unexpected end of condition');
    if (t.type === 'op' && (t as { type: 'op'; value: string }).value === '!') {
      this.consume();
      return { type: 'unary', op: '!', argument: this.parsePrimary() };
    }
    if (t.type === 'lparen') {
      this.consume();
      const inner = this.parseLogicalOr();
      if (this.current()?.type !== 'rparen') {
        throw new CovenantDSLError(CovenantDSLErrorCode.INVALID_SYNTAX, 'Missing )');
      }
      this.consume();
      return inner;
    }
    if (t.type === 'num') {
      this.consume();
      return { type: 'literal', value: (t as { type: 'num'; value: number }).value };
    }
    if (t.type === 'ident') {
      const path: string[] = [];
      while (this.current()?.type === 'ident') {
        const ident = (this.consume() as { type: 'ident'; value: string }).value;
        if (path.length === 0 && !ROOT_KEYS.has(ident)) {
          throw new CovenantDSLError(CovenantDSLErrorCode.UNKNOWN_IDENTIFIER, `Unknown identifier: ${ident}`);
        }
        if (path.length > 0 && !ALLOWED_PROPS.has(ident)) {
          throw new CovenantDSLError(CovenantDSLErrorCode.UNKNOWN_IDENTIFIER, `Unknown property: ${ident}`);
        }
        path.push(ident);
        if (this.current()?.type === 'dot') {
          this.consume();
        } else {
          break;
        }
      }
      if (path.length === 0) throw new CovenantDSLError(CovenantDSLErrorCode.INVALID_SYNTAX, 'Empty member path');
      return { type: 'member', path };
    }
    throw new CovenantDSLError(CovenantDSLErrorCode.INVALID_SYNTAX, `Unexpected token at ${this.pos}`);
  }
}

/**
 * Parse and validate condition string. Returns AST for evaluator.
 * Throws CovenantDSLError on invalid syntax, unknown identifiers, or unsafe tokens.
 */
export function parseCondition(condition: string): ParsedExpression {
  const trimmed = condition.trim();
  if (trimmed.length === 0) {
    throw new CovenantDSLError(CovenantDSLErrorCode.INVALID_SYNTAX, 'Empty condition');
  }
  const tokens = tokenize(trimmed);
  const parser = new Parser(tokens);
  const ast = parser.parseLogicalOr();
  if (parser.hasRemaining()) {
    throw new CovenantDSLError(CovenantDSLErrorCode.INVALID_SYNTAX, 'Unexpected trailing tokens');
  }
  return ast as unknown as ParsedExpression;
}
