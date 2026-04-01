import fs from 'node:fs';
import path from 'node:path';
import { cliLogger } from '../utils/cli_logger.js';
import type { CliCommandResult } from '../cli_types.js';
import type { ObservabilityConfig } from '../../sdk/iris_config.js';

export type EffectiveCliConfig = {
  node_id: string | undefined;
  transport: {
    type: 'ws';
    options: {
      host: string;
      port: number;
    };
  };
  features: {
    encryption: boolean;
    replay_protection: boolean;
    covenants: boolean;
  };
  dev_mode: boolean;
  observability?: ObservabilityConfig;
};

export function resolveConfig(cwd: string): EffectiveCliConfig {
  const defaults: EffectiveCliConfig = {
    node_id: undefined,
    transport: { type: 'ws', options: { host: '127.0.0.1', port: 4000 } },
    features: { encryption: false, replay_protection: false, covenants: true },
    dev_mode: true,
    observability: { logging: true, metrics: true, tracing: true, logLevel: 'info' },
  };

  const file = path.join(cwd, 'iris.config.json');
  let fileCfg: Partial<EffectiveCliConfig> = {};
  if (fs.existsSync(file)) {
    try {
      fileCfg = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<EffectiveCliConfig>;
    } catch {
      // keep defaults
    }
  }

  const envPort = process.env.IRIS_PORT ? Number(process.env.IRIS_PORT) : undefined;
  const envNode = process.env.IRIS_NODE_ID;

  const node_id = envNode ?? fileCfg.node_id ?? defaults.node_id;
  const obsFile = fileCfg.observability;
  const obsDefaults = defaults.observability ?? {};
  return {
    ...defaults,
    ...fileCfg,
    node_id,
    transport: {
      type: 'ws',
      options: {
        host: fileCfg.transport?.options?.host ?? defaults.transport.options.host,
        port: Number.isFinite(envPort) ? (envPort as number) : (fileCfg.transport?.options?.port ?? defaults.transport.options.port),
      },
    },
    features: {
      encryption: fileCfg.features?.encryption ?? defaults.features.encryption,
      replay_protection: fileCfg.features?.replay_protection ?? defaults.features.replay_protection,
      covenants: fileCfg.features?.covenants ?? defaults.features.covenants,
    },
    dev_mode: fileCfg.dev_mode ?? defaults.dev_mode,
    observability: {
      ...obsDefaults,
      ...obsFile,
      logging: obsFile?.logging ?? obsDefaults.logging ?? true,
      metrics: obsFile?.metrics ?? obsDefaults.metrics ?? true,
      tracing: obsFile?.tracing ?? obsDefaults.tracing ?? true,
      logLevel: obsFile?.logLevel ?? obsDefaults.logLevel ?? 'info',
    },
  };
}

export async function runConfig(cwd: string): Promise<CliCommandResult> {
  const cfg = resolveConfig(cwd);
  cliLogger.info('Current effective configuration:');
  console.log(JSON.stringify(cfg, null, 2));
  return { exitCode: 0 };
}

