import { spawn, type ChildProcess } from 'node:child_process';

import { RuntimeLogger } from './logger';

export interface SupervisedNodeConfig {
  readonly nodeId: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
}

export class NodeSupervisor {
  private child: ChildProcess | undefined;
  private stopping = false;
  private readonly logger: RuntimeLogger;

  constructor(private readonly config: SupervisedNodeConfig) {
    this.logger = new RuntimeLogger(config.nodeId);
  }

  start(): void {
    if (this.child !== undefined) return;
    this.stopping = false;
    this.child = spawn(this.config.command, [...this.config.args], {
      cwd: this.config.cwd,
      stdio: 'pipe',
    });
    this.child.stdout?.on('data', (buf) => {
      this.logger.log('INFO', 'NODE_STDOUT', {}, undefined, { line: String(buf).trim() });
    });
    this.child.stderr?.on('data', (buf) => {
      this.logger.log('WARN', 'NODE_STDERR', {}, undefined, { line: String(buf).trim() });
    });
    this.child.on('exit', (code) => {
      const crashed = !this.stopping && code !== 0;
      this.logger.log(crashed ? 'ERROR' : 'INFO', 'NODE_EXIT', {}, undefined, { code });
      this.child = undefined;
      if (crashed) this.start();
    });
  }

  stop(): void {
    this.stopping = true;
    this.child?.kill('SIGTERM');
    this.child = undefined;
  }
}
