/**
 * S-3 Robustness Validation — Test matrix configuration. Mirrors S-2 scalability scenarios.
 */

import type { SimulationConfig } from '../../simulation/engine/SimulationConfig.js';
import type { ChaosConfig } from '../../chaos/engine/ChaosConfig.js';
import {
  getBaselineTestConfig,
  getNodeScalingTestConfig,
  getIntensityScalingTestConfig,
  getDurationScalingTestConfig,
} from '../../chaos/validation/SoftScalabilityTestConfig.js';
import type { ChaosScenarioParams } from '../../chaos/validation/SoftScalabilityTestConfig.js';

export interface S3StressTestConfig {
  readonly name: string;
  readonly simulationConfig: SimulationConfig;
  readonly chaosConfig: Partial<ChaosConfig>;
  readonly chaosScenarioParams: ChaosScenarioParams;
  readonly messageCount: number;
  readonly description: string;
}

function withDescription(
  config: {
    name: string;
    simulationConfig: SimulationConfig;
    chaosConfig: Partial<ChaosConfig>;
    chaosScenarioParams: ChaosScenarioParams;
    messageCount: number;
  },
  description: string,
): S3StressTestConfig {
  return Object.freeze({
    ...config,
    description,
  });
}

export function getS3BaselineConfig(): S3StressTestConfig {
  return withDescription(getBaselineTestConfig(), 'Baseline; reference soft event count.');
}

export function getS3NodeScalingConfig(): S3StressTestConfig {
  return withDescription(getNodeScalingTestConfig(), 'More nodes; increased soft event potential.');
}

export function getS3IntensityScalingConfig(): S3StressTestConfig {
  return withDescription(getIntensityScalingTestConfig(), 'Higher attack intensity; more soft events.');
}

export function getS3DurationScalingConfig(): S3StressTestConfig {
  return withDescription(getDurationScalingTestConfig(), 'Longer duration; more soft events.');
}

export function getAllS3StressConfigs(): S3StressTestConfig[] {
  return [
    getS3BaselineConfig(),
    getS3NodeScalingConfig(),
    getS3IntensityScalingConfig(),
    getS3DurationScalingConfig(),
  ];
}
