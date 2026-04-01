/**
 * Demo Scenarios — Conformance.
 * Determinismo, freeze, kill-switch, contratto valido, import boundary.
 */

// Demo Scenarios forniscono input deterministici al UX Contract.
// Non introducono logica, decisione o adattamento.
// Servono esclusivamente a rendere la demo affidabile e riproducibile.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { UxContract } from '../../ux-contract';
import {
  buildDemoUxContract,
  DEMO_SCENARIOS,
  DEMO_SCENARIO_COMPONENT_ID,
  isDemoScenarioEnabled,
  type DemoScenarioId,
} from '../index';

const SCENARIO_IDS: DemoScenarioId[] = [
  'FOCUS_ACTIVE',
  'WAITING_REPLY',
  'WELLBEING_BLOCKED',
  'NEUTRAL_IDLE',
  'OVERLOADED',
];

const MODES = ['DEFAULT', 'FOCUS', 'WELLBEING'] as const;

function contractWithoutGeneratedAt(c: UxContract): Omit<UxContract, 'meta'> & { meta: Omit<UxContract['meta'], 'generatedAt'> } {
  const { meta, ...rest } = c;
  const { generatedAt: _, ...metaRest } = meta;
  return { ...rest, meta: metaRest };
}

describe('Demo Scenarios — Conformance', () => {
  describe('1. Determinismo', () => {
    it('stesso scenario + mode → stesso contract (eccetto generatedAt)', () => {
      const now1 = 1000;
      const now2 = 2000;
      for (const id of SCENARIO_IDS) {
        for (const mode of MODES) {
          const c1 = buildDemoUxContract(id, mode, now1);
          const c2 = buildDemoUxContract(id, mode, now2);
          expect(c1.meta.generatedAt).toBe(now1);
          expect(c2.meta.generatedAt).toBe(now2);
          expect(contractWithoutGeneratedAt(c1)).toEqual(contractWithoutGeneratedAt(c2));
        }
      }
    });
  });

  describe('2. Freeze', () => {
    it('scenario dal catalogo non è mutabile', () => {
      const scenario = DEMO_SCENARIOS.FOCUS_ACTIVE;
      expect(Object.isFrozen(scenario)).toBe(true);
      expect(Object.isFrozen(scenario.uxState)).toBe(true);
      expect(Object.isFrozen(scenario.experience)).toBe(true);
      expect(Object.isFrozen(scenario.features)).toBe(true);
    });

    it('contract restituito non è mutabile', () => {
      const c = buildDemoUxContract('NEUTRAL_IDLE', 'DEFAULT', 0);
      expect(Object.isFrozen(c)).toBe(true);
      expect(Object.isFrozen(c.meta)).toBe(true);
    });
  });

  describe('3. Kill-switch', () => {
    it('OFF → scenario NEUTRAL_IDLE', () => {
      const registryOff = Object.freeze({ [DEMO_SCENARIO_COMPONENT_ID]: false });
      const cFocus = buildDemoUxContract('FOCUS_ACTIVE', 'DEFAULT', 0, registryOff);
      const cOverload = buildDemoUxContract('OVERLOADED', 'FOCUS', 0, registryOff);
      expect(cFocus.uxState).toBe(DEMO_SCENARIOS.NEUTRAL_IDLE.uxState);
      expect(cFocus.experience.label).toBe('IDLE');
      expect(cOverload.uxState).toBe(DEMO_SCENARIOS.NEUTRAL_IDLE.uxState);
    });

    it('ON o registry assente → scenario richiesto', () => {
      const registryOn = Object.freeze({ [DEMO_SCENARIO_COMPONENT_ID]: true });
      const c = buildDemoUxContract('FOCUS_ACTIVE', 'DEFAULT', 0, registryOn);
      expect(c.experience.label).toBe('FOCUSED');
      const cNoReg = buildDemoUxContract('OVERLOADED', 'DEFAULT', 0);
      expect(cNoReg.experience.label).toBe('OVERLOADED');
    });

    it('isDemoScenarioEnabled rispetta registry', () => {
      expect(isDemoScenarioEnabled({ [DEMO_SCENARIO_COMPONENT_ID]: true })).toBe(true);
      expect(isDemoScenarioEnabled({ [DEMO_SCENARIO_COMPONENT_ID]: false })).toBe(false);
    });
  });

  describe('4. Contratto valido', () => {
    it('UxContract ha campi obbligatori', () => {
      const c = buildDemoUxContract('NEUTRAL_IDLE', 'DEFAULT', 0);
      expect(c).toHaveProperty('uxState');
      expect(c).toHaveProperty('experience');
      expect(c).toHaveProperty('features');
      expect(c).toHaveProperty('meta');
      expect(c.meta).toHaveProperty('productMode');
      expect(c.meta).toHaveProperty('generatedAt');
      expect(c.meta).toHaveProperty('contractVersion');
    });

    it('experience ha label e explanation', () => {
      const c = buildDemoUxContract('FOCUS_ACTIVE', 'DEFAULT', 0);
      expect(c.experience.label).toBeDefined();
      expect(c.experience.explanation).toBeDefined();
    });
  });

  describe('5. Import boundary', () => {
    it('nessun import da messaging-system, iris, execution nei file scenario', () => {
      const root = join(process.cwd(), 'src', 'product', 'demo-scenarios');
      const forbidden = ['messaging-system', 'messagingSystem', 'iris/', 'Iris', 'execution', 'Execution'];
      const files = readdirSync(root, { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts'))
        .map((e) => join(root, e.name));

      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const importLines = content.split('\n').filter((l) => l.trim().startsWith('import'));
        for (const line of importLines) {
          for (const path of forbidden) {
            expect(line, `File ${file} should not import from ${path}`).not.toMatch(
              new RegExp(path.replace('/', '\\/'), 'i')
            );
          }
        }
      }
    });
  });
});
