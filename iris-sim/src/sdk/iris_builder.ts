/**
 * Microstep 16A — IRIS Builder (fluent + dev-friendly).
 */

import type { IrisConfig, TransportConfig } from './iris_config.js';
import type { IrisNode as IrisNodeType } from './iris_node.js';
import { IrisNode as IrisNodeImpl } from './iris_node.js';

export class IrisBuilder {
  private cfg: Partial<IrisConfig> = {};

  static create(): IrisBuilder {
    return new IrisBuilder();
  }

  enableDefaults(): IrisBuilder {
    this.cfg.dev_mode = true;
    this.cfg.features = {
      encryption: false,
      replay_protection: false,
      covenants: true,
    };
    return this;
  }

  enableDevMode(): IrisBuilder {
    this.cfg.dev_mode = true;
    return this;
  }

  enableDebug(): IrisBuilder {
    this.cfg.dev_mode = true;
    return this;
  }

  enableEncryption(enabled: boolean): IrisBuilder {
    this.cfg.features = { ...(this.cfg.features ?? {}), encryption: enabled };
    return this;
  }

  enableReplayProtection(enabled: boolean): IrisBuilder {
    this.cfg.features = { ...(this.cfg.features ?? {}), replay_protection: enabled };
    return this;
  }

  withNodeId(node_id: string): IrisBuilder {
    this.cfg.node_id = node_id;
    return this;
  }

  withTransport(type: TransportConfig['type']): IrisBuilder {
    const t: TransportConfig = { type, options: {} };
    this.cfg.transport = t;
    return this;
  }

  build(): IrisNodeType {
    return new IrisNodeImpl(this.cfg);
  }
}

