'use client';

import Image from 'next/image';
import type { Panel } from '../lib/types';

export type PanelGridProps = {
  panels: Panel[];
};

export function PanelGrid({ panels }: PanelGridProps) {
  if (!panels.length) {
    return null;
  }
  return (
    <section className="space-y-2">
      <header className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Extracted Panels</h3>
        <span className="text-xs text-ink-500">{panels.length} regions detected</span>
      </header>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {panels.map((panel) => (
          <figure
            key={panel.id}
            className="group relative overflow-hidden rounded-xl border border-ink-800/80 bg-ink-800/40"
          >
            <Image
              src={panel.dataUrl}
              alt={`Panel ${panel.id}`}
              width={panel.width}
              height={panel.height}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <figcaption className="absolute bottom-2 left-2 rounded-full bg-ink-900/80 px-3 py-1 text-xs text-ink-200 shadow-lg">
              Focus {(panel.emphasis * 100).toFixed(0)}%
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
