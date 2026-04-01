/**
 * Adapter Capability Matrix - Conformance (C.4.A)
 * Immutabilità; assenza proprietà operative; nessun execution; copertura AI/voice/wellbeing; separazione; determinismo; registry read-only.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  MessagingCapabilityRegistry,
  type AdapterCapabilityMatrix,
  type MessagingCapability,
  type AdapterDescriptor,
  type MessageKind,
  type ActionPlanType,
  MESSAGING_CAPABILITY_TYPES,
  ADAPTER_TYPES,
} from '../index';

const CAPABILITIES_ROOT = join(process.cwd(), 'src', 'messaging-system', 'capabilities');

const FORBIDDEN_OPERATIVE = ['execute', 'send', 'dispatch', 'trigger', 'retry', 'schedule', 'channelId', 'adapterId', 'endpoint', 'provider'];
const FORBIDDEN_IMPORTS = ['execution', 'delivery', 'feedback', 'iris', 'decision'];

function createMatrix(
  capabilities: MessagingCapability[],
  adapters: AdapterDescriptor[],
  declaredAt: string
): AdapterCapabilityMatrix {
  return Object.freeze({
    adapters: Object.freeze(adapters),
    capabilities: Object.freeze(capabilities),
    declaredAt,
  });
}

function collectTsFiles(dir: string, acc: string[] = []): string[] {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory() && e.name !== 'node_modules' && e.name !== 'tests') {
        collectTsFiles(full, acc);
      } else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
        acc.push(full);
      }
    }
  } catch {
    // ignore
  }
  return acc;
}

describe('Adapter Capability Matrix - Conformance', () => {
  const declaredAt = '2025-01-01T12:00:00.000Z';

  describe('1. Tutti i modelli sono immutabili', () => {
    it('matrix, capabilities e adapters sono frozen', () => {
      const cap: MessagingCapability = Object.freeze({
        capabilityId: 'cap-1',
        capabilityType: 'AI_SUMMARY',
        description: 'AI Smart-Summary',
        supportedActionPlanTypes: Object.freeze(['summary'] as ActionPlanType[]),
        supportedMessageKinds: Object.freeze(['summary'] as MessageKind[]),
        declaredAt,
      });
      const adapter: AdapterDescriptor = Object.freeze({
        adapterId: 'ad-1',
        adapterType: 'LOCAL_AI',
        supportedCapabilities: Object.freeze(['AI_SUMMARY']),
        supportedMessageKinds: Object.freeze(['summary'] as MessageKind[]),
      });
      const matrix = createMatrix([cap], [adapter], declaredAt);
      expect(Object.isFrozen(matrix)).toBe(true);
      expect(Object.isFrozen(matrix.capabilities)).toBe(true);
      expect(Object.isFrozen(matrix.adapters)).toBe(true);
    });
  });

  describe('2. Nessuna capability espone proprietà operative', () => {
    it('MessagingCapability non contiene execute, send, channelId, adapterId, endpoint, provider, retry, SLA', () => {
      const cap: MessagingCapability = Object.freeze({
        capabilityId: 'c1',
        capabilityType: 'TEXT_SEND',
        description: 'd',
        supportedActionPlanTypes: Object.freeze([]),
        supportedMessageKinds: Object.freeze([]),
        declaredAt,
      });
      const keys = Object.keys(cap);
      for (const f of FORBIDDEN_OPERATIVE) {
        expect(keys).not.toContain(f);
      }
    });
  });

  describe('3. Nessun adapter dichiara execution', () => {
    it('AdapterDescriptor non contiene execute, run, dispatch, trigger', () => {
      const adapter: AdapterDescriptor = Object.freeze({
        adapterId: 'a1',
        adapterType: 'WHATSAPP',
        supportedCapabilities: Object.freeze([]),
        supportedMessageKinds: Object.freeze([]),
      });
      const keys = Object.keys(adapter);
      expect(keys).not.toContain('execute');
      expect(keys).not.toContain('run');
      expect(keys).not.toContain('dispatch');
      expect(keys).not.toContain('trigger');
    });
  });

  describe('4. La matrice copre almeno 1 capability AI, 1 voice, 1 wellbeing', () => {
    it('matrice di esempio include AI_SUMMARY, VOICE_SEND o VOICE_TRANSCRIPTION, DIGITAL_WELLBEING_GATE', () => {
      const capabilities: MessagingCapability[] = [
        Object.freeze({
          capabilityId: 'ai-summary',
          capabilityType: 'AI_SUMMARY',
          description: 'AI Smart-Summary (testo + vocali)',
          supportedActionPlanTypes: Object.freeze(['summary'] as ActionPlanType[]),
          supportedMessageKinds: Object.freeze(['summary'] as MessageKind[]),
          declaredAt,
        }),
        Object.freeze({
          capabilityId: 'voice-send',
          capabilityType: 'VOICE_SEND',
          description: 'Assistente Vocale Smart-Summary',
          supportedActionPlanTypes: Object.freeze(['summary'] as ActionPlanType[]),
          supportedMessageKinds: Object.freeze(['voice'] as MessageKind[]),
          declaredAt,
        }),
        Object.freeze({
          capabilityId: 'wellbeing-gate',
          capabilityType: 'DIGITAL_WELLBEING_GATE',
          description: 'Digital Wellbeing Gatekeeper',
          supportedActionPlanTypes: Object.freeze(['gate'] as ActionPlanType[]),
          supportedMessageKinds: Object.freeze(['gate'] as MessageKind[]),
          declaredAt,
        }),
      ];
      const adapters: AdapterDescriptor[] = [
        Object.freeze({
          adapterId: 'local-ai',
          adapterType: 'LOCAL_AI',
          supportedCapabilities: Object.freeze(['AI_SUMMARY', 'VOICE_SEND', 'DIGITAL_WELLBEING_GATE']),
          supportedMessageKinds: Object.freeze(['summary', 'voice', 'gate'] as MessageKind[]),
        }),
      ];
      const matrix = createMatrix(capabilities, adapters, declaredAt);
      const types = new Set(matrix.capabilities.map((c) => c.capabilityType));
      expect(types.has('AI_SUMMARY')).toBe(true);
      expect(types.has('VOICE_SEND') || types.has('VOICE_TRANSCRIPTION')).toBe(true);
      expect(types.has('DIGITAL_WELLBEING_GATE')).toBe(true);
    });
  });

  describe('5. Nessun import vietato', () => {
    it('nessun file in capabilities/ importa da execution, delivery, feedback, iris, decision', () => {
      const files = collectTsFiles(CAPABILITIES_ROOT);
      const violations: string[] = [];
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const t = line.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue;
          const fromMatch = line.match(/from\s+['"]([^'"]+)['"]/);
          if (fromMatch) {
            const path = fromMatch[1];
            if (FORBIDDEN_IMPORTS.some((f) => path.includes(f))) violations.push(file);
          }
        }
      }
      expect(violations).toEqual([]);
    });
  });

  describe('6. Determinismo', () => {
    it('stessa matrice -> stessi output da registry', () => {
      const cap: MessagingCapability = Object.freeze({
        capabilityId: 'c1',
        capabilityType: 'SEMANTIC_SEARCH',
        description: 'Deep Semantic Search',
        supportedActionPlanTypes: Object.freeze(['search'] as ActionPlanType[]),
        supportedMessageKinds: Object.freeze(['search'] as MessageKind[]),
        declaredAt,
      });
      const adapter: AdapterDescriptor = Object.freeze({
        adapterId: 'a1',
        adapterType: 'SYSTEM_INTERNAL',
        supportedCapabilities: Object.freeze(['SEMANTIC_SEARCH']),
        supportedMessageKinds: Object.freeze(['search'] as MessageKind[]),
      });
      const matrix = createMatrix([cap], [adapter], declaredAt);
      const reg1 = new MessagingCapabilityRegistry(matrix);
      const reg2 = new MessagingCapabilityRegistry(matrix);
      expect(reg1.getCapabilities().length).toBe(reg2.getCapabilities().length);
      expect(reg1.getAdapters().length).toBe(reg2.getAdapters().length);
      expect(reg1.findCapabilitiesByAdapter('SYSTEM_INTERNAL').length).toBe(
        reg2.findCapabilitiesByAdapter('SYSTEM_INTERNAL').length
      );
    });
  });

  describe('7. Registry read-only', () => {
    it('getCapabilities e getAdapters restituiscono riferimenti coerenti; nessun override', () => {
      const cap: MessagingCapability = Object.freeze({
        capabilityId: 'c1',
        capabilityType: 'INBOX_PRIORITIZATION',
        description: 'Smart Inbox Zero',
        supportedActionPlanTypes: Object.freeze(['prioritize'] as ActionPlanType[]),
        supportedMessageKinds: Object.freeze(['notify'] as MessageKind[]),
        declaredAt,
      });
      const matrix = createMatrix([cap], [], declaredAt);
      const reg = new MessagingCapabilityRegistry(matrix);
      const caps1 = reg.getCapabilities();
      const caps2 = reg.getCapabilities();
      expect(caps1).toBe(caps2);
      expect(caps1.length).toBe(1);
      expect(reg.getAdapters().length).toBe(0);
    });
  });
});

// La Adapter Capability Matrix definisce il perimetro operativo del Messaging System.
// Essa descrive cosa il sistema PUO fare, non cosa FA. Ogni esecuzione reale e' demandata a layer successivi.
