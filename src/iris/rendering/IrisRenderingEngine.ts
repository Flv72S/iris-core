/**
 * IrisRenderingEngine — IRIS 9.3
 * Consuma IrisMessageBinding[] (9.2); produce artefatti UX renderizzati per canale.
 * Puramente trasformativo e terminale. Nessuna selezione o deduplicazione.
 */

import type { IrisMessageBinding } from '../messaging';
import type { IrisRenderResult } from './IrisRenderResult';
import type { IrisRenderTemplate } from './IrisRenderTemplate';
import type { RenderingRegistry } from './IrisRenderingKillSwitch';
import { isRenderingEnabled } from './IrisRenderingKillSwitch';

export class IrisRenderingEngine {
  constructor(private readonly templates: readonly IrisRenderTemplate[]) {}

  /**
   * Per ogni binding: template compatibili per channel.type → applica tutti → accumula.
   * Nessuna selezione, nessuna deduplicazione. Output frozen.
   */
  render(
    bindings: readonly IrisMessageBinding[],
    registry: RenderingRegistry
  ): readonly IrisRenderResult[] {
    if (!isRenderingEnabled(registry)) {
      return Object.freeze([]);
    }
    const results: IrisRenderResult[] = [];
    for (const binding of bindings) {
      const compatible = this.templates.filter(
        (t) => t.channelType === binding.channel.type
      );
      const renderedContents = compatible.map((t) => {
        const content = t.render(binding.envelope);
        return Object.freeze({
          templateId: content.templateId,
          channelType: content.channelType,
          content: content.content,
          ...(content.metadata != null && { metadata: Object.freeze({ ...content.metadata }) }),
        });
      });
      const result: IrisRenderResult = Object.freeze({
        channelId: binding.channel.id,
        renderedContents: Object.freeze(renderedContents),
        derivedAt: new Date().toISOString(),
      });
      results.push(result);
    }
    return Object.freeze(results);
  }
}
