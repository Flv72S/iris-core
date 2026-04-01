import { securityLog } from '../security/security_logger.js';

export class NodeIsolationManager {
  private readonly isolated = new Set<string>();

  isolate(nodeId: string): void {
    if (this.isolated.has(nodeId)) return;
    this.isolated.add(nodeId);
    securityLog('NODE_ISOLATED', { nodeId });
  }

  isIsolated(nodeId: string): boolean {
    return this.isolated.has(nodeId);
  }

  reintegrate(nodeId: string): void {
    if (!this.isolated.delete(nodeId)) return;
    securityLog('NODE_REINTEGRATED', { nodeId });
  }
}
