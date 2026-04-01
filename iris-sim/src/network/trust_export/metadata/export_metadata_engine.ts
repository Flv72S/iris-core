/**
 * Microstep 10I — Governance Trust Export Engine. Export metadata.
 */

import type { ExportMetadata } from '../types/trust_export_types.js';

const DEFAULT_EXPORT_VERSION = '1.0.0';
const DEFAULT_IRIS_VERSION = '0.1.0';
const EXPORTED_COMPONENTS = ['snapshot', 'trust_graph', 'policies', 'decisions'] as const;

/**
 * Generate default export metadata.
 */
export function generateExportMetadata(): ExportMetadata {
  return Object.freeze({
    export_version: DEFAULT_EXPORT_VERSION,
    iris_version: DEFAULT_IRIS_VERSION,
    exported_components: [...EXPORTED_COMPONENTS],
  });
}
