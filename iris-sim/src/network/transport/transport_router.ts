/**
 * Microstep 15E — Transport Abstraction Layer. Router.
 */

import type { TransportMessage } from './transport_types.js';

export class TransportRouter {
  private readonly handlers = new Map<string, (message: TransportMessage) => void>();
  private defaultHandler: ((message: TransportMessage) => void) | null = null;

  registerHandler(type: string, handler: (message: TransportMessage) => void): void {
    this.handlers.set(type, handler);
  }

  registerDefaultHandler(handler: (message: TransportMessage) => void): void {
    this.defaultHandler = handler;
  }

  private detectType(message: TransportMessage): string {
    const metaType = message.metadata.type;
    if (typeof metaType === 'string' && metaType.trim().length > 0) return metaType;
    const raw = message.raw as Record<string, unknown> | null;
    const rawType = raw != null && typeof raw === 'object' ? raw.type : undefined;
    if (typeof rawType === 'string' && rawType.trim().length > 0) return rawType;
    return 'default';
  }

  dispatch(message: TransportMessage): void {
    const type = this.detectType(message);
    const handler = this.handlers.get(type) ?? this.defaultHandler;
    if (handler) handler(message);
  }
}

