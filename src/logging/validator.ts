import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import { logEntrySchema } from './schema';

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  allowUnionTypes: false,
  validateFormats: true,
});

addFormats(ajv, ['date-time']);

const validate = ajv.compile(logEntrySchema);

function normalizeErrors(): string[] {
  const errors = validate.errors ?? [];
  const flattened = errors.map((err) => {
    const path = err.instancePath && err.instancePath.length > 0 ? err.instancePath : '/';
    return `${path} ${err.message ?? 'validation error'}`;
  });
  return [...flattened].sort();
}

export function validateLogEntry(entry: unknown): { valid: boolean; errors?: string[] } {
  const valid = validate(entry);
  if (valid) {
    return { valid: true };
  }
  return { valid: false, errors: normalizeErrors() };
}

