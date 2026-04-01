import type { IrisNode } from '../sdk/index.js';

export type CliContext = {
  node: IrisNode | null;
  cwd: string;
};

export type CliCommandResult = {
  exitCode: number;
  message?: string;
};

