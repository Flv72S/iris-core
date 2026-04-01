import { err, ok, warn } from './cli_output.js';

export const cliLogger = {
  info(msg: string): void {
    console.log(`[IRIS] ${msg}`);
  },
  success(msg: string): void {
    console.log(ok(`[IRIS] ${msg}`));
  },
  warning(msg: string): void {
    console.log(warn(`[IRIS WARNING] ${msg}`));
  },
  error(msg: string): void {
    console.error(err(`[IRIS ERROR] ${msg}`));
  },
};

