/**
 * No-Execution Guarantee — Verifica che nessuna killer feature sia eseguita/attivata/decisa.
 * Boundary enforcement: scan import e keyword exclusion.
 */

import type { KillerFeatureId } from '../types';
import { KILLER_FEATURE_IDS } from '../types';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export interface KillerFeatureSafetyGuarantee {
  readonly feature: KillerFeatureId;
  readonly executionFree: boolean;
  readonly decisionFree: boolean;
  readonly uxFree: boolean;
}

const FORBIDDEN_IMPORTS = ['execution', 'ux-contract', 'orchestration', 'demo', 'product/'];
const FORBIDDEN_KEYWORDS = ['.execute(', 'activateFeature', 'makeDecision', 'UXContract'];

/** Verifica che il modulo verification non importi execution/ux/demo e non usi keyword proibite */
function runBoundaryCheck(): { executionFree: boolean; decisionFree: boolean; uxFree: boolean } {
  const root = join(process.cwd(), 'src', 'core', 'verification');
  let executionFree = true;
  let decisionFree = true;
  let uxFree = true;

  const scan = (dir: string): string[] => {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory() && e.name !== 'tests') files.push(...scan(full));
      else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts'))
        files.push(full);
    }
    return files;
  };

  const files = scan(root);
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('import ')) {
        if (line.includes('execution')) executionFree = false;
        if (line.includes('ux-contract') || line.includes('ux-experience')) uxFree = false;
        if (line.includes('orchestration') || line.includes('demo')) executionFree = false;
      }
      if (line.includes('.execute(')) executionFree = false;
      if (line.includes('makeDecision')) decisionFree = false;
      if (line.includes('UXContract')) uxFree = false;
    }
  }
  return { executionFree, decisionFree, uxFree };
}

export function verifySafetyGuarantees(): readonly KillerFeatureSafetyGuarantee[] {
  const g = runBoundaryCheck();
  const result: KillerFeatureSafetyGuarantee[] = [];
  for (const feature of KILLER_FEATURE_IDS) {
    result.push(
      Object.freeze({
        feature,
        executionFree: g.executionFree,
        decisionFree: g.decisionFree,
        uxFree: g.uxFree,
      })
    );
  }
  return Object.freeze(result);
}
