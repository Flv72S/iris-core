/**
 * Microstep 16A — IRIS SDK logger.
 */

export type IrisLogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface IrisLogger {
  log(level: IrisLogLevel, msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  debug(msg: string): void;
}

export class ConsoleIrisLogger implements IrisLogger {
  constructor(private readonly mode: 'DEVELOPMENT' | 'PRODUCTION' = 'PRODUCTION') {}

  log(level: IrisLogLevel, msg: string): void {
    const prefix = '[IRIS]';
    const final = `${prefix} ${msg}`;
    // Keep simple DX-friendly output.
    if (level === 'error') console.error(final);
    else if (level === 'warn') console.warn(final);
    else console.log(final);
  }

  info(msg: string): void {
    this.log('info', msg);
  }
  warn(msg: string): void {
    this.log('warn', msg);
  }
  error(msg: string): void {
    this.log('error', msg);
  }
  debug(msg: string): void {
    if (this.mode === 'DEVELOPMENT') this.log('debug', msg);
  }
}

