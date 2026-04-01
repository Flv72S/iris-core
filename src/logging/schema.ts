import type { InvariantId, LogLevel, NonDeterministicMarker, OnFailurePolicy, RuntimePhase } from './types';

const LOG_LEVELS: readonly LogLevel[] = ['INFO', 'WARN', 'ERROR', 'DEBUG'] as const;
const RUNTIME_PHASES: readonly RuntimePhase[] = ['INIT', 'RUNTIME', 'SNAPSHOT', 'VALIDATION', 'TEST'] as const;
const INVARIANT_IDS: readonly InvariantId[] = [
  'INV-001',
  'INV-002',
  'INV-003',
  'INV-004',
  'INV-005',
  'INV-006',
  'INV-007',
  'INV-008',
  'INV-009',
  'INV-010',
  'INV-011',
  'INV-012',
  'INV-013',
  'INV-014',
  'INV-015',
  'INV-016',
  'INV-017',
  'INV-018',
  'INV-019',
  'INV-020',
] as const;
const ND_MARKERS: readonly NonDeterministicMarker[] = ['ND-001', 'ND-002', 'ND-003', 'ND-004', 'ND-005', 'ND-006'] as const;
const ON_FAILURE_POLICIES: readonly OnFailurePolicy[] = ['LOG_ONLY', 'WARN', 'FAIL_FAST', 'BLOCK_RUNTIME', 'AUDIT_FLAG'] as const;

// Strict UTC ISO8601: requires trailing Z.
const UTC_ISO8601_PATTERN = '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?Z$';

export const LOG_ENTRY_SCHEMA_ID = 'https://iris.core/schemas/log-entry.schema.json';

export const logEntrySchema = {
  $id: LOG_ENTRY_SCHEMA_ID,
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  additionalProperties: false,
  required: ['timestamp', 'runtimeId', 'correlationId', 'level', 'phase', 'message', 'audit'],
  properties: {
    timestamp: {
      type: 'string',
      format: 'date-time',
      pattern: UTC_ISO8601_PATTERN,
      minLength: 20,
    },
    runtimeId: {
      type: 'string',
      minLength: 1,
    },
    correlationId: {
      type: 'string',
      minLength: 1,
    },
    level: {
      type: 'string',
      enum: [...LOG_LEVELS],
    },
    phase: {
      type: 'string',
      enum: [...RUNTIME_PHASES],
    },
    invariantId: {
      type: 'string',
      enum: [...INVARIANT_IDS],
    },
    nondeterministicMarker: {
      type: 'string',
      enum: [...ND_MARKERS],
    },
    message: {
      type: 'string',
      minLength: 1,
    },
    metadata: {
      type: 'object',
      additionalProperties: true,
    },
    audit: {
      type: 'object',
      additionalProperties: false,
      required: ['compliant'],
      properties: {
        compliant: { type: 'boolean' },
        onFailure: {
          type: 'string',
          enum: [...ON_FAILURE_POLICIES],
        },
      },
      allOf: [
        {
          if: {
            properties: { compliant: { const: false } },
            required: ['compliant'],
          },
          then: {
            properties: {
              onFailure: { type: 'string' },
            },
            required: ['onFailure'],
          },
        },
      ],
    },
  },
  allOf: [
    {
      if: {
        type: 'object',
        properties: { invariantId: { type: 'string' } },
        required: ['invariantId'],
      },
      then: {
        properties: {
          invariantId: {
            type: 'string',
            pattern: '^INV-\\d{3}$',
          },
        },
      },
    },
    {
      if: {
        type: 'object',
        properties: { nondeterministicMarker: { type: 'string' } },
        required: ['nondeterministicMarker'],
      },
      then: {
        properties: {
          nondeterministicMarker: {
            type: 'string',
            pattern: '^ND-\\d{3}$',
          },
        },
      },
    },
  ],
} as const;

