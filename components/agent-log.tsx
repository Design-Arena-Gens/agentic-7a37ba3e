'use client';

import { memo } from 'react';
import type { AgentLogEntry } from '../lib/types';

export type AgentLogProps = {
  entries: AgentLogEntry[];
};

const stageColor: Record<string, string> = {
  idle: 'bg-ink-700 text-ink-200',
  ingesting: 'bg-blue-500/20 text-blue-200',
  analyzing: 'bg-cyan-500/20 text-cyan-200',
  storyboarding: 'bg-indigo-500/20 text-indigo-200',
  compositing: 'bg-purple-500/20 text-purple-200',
  rendering: 'bg-emerald-500/20 text-emerald-200',
  complete: 'bg-amber-500/20 text-amber-200',
  error: 'bg-rose-500/20 text-rose-200',
};

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

export const AgentLog = memo(({ entries }: AgentLogProps) => {
  return (
    <div className="h-64 overflow-y-auto rounded-xl border border-ink-700 bg-ink-900/70 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">Agent Activity</h3>
      <ul className="space-y-3 text-sm text-ink-200">
        {entries.length === 0 ? (
          <li className="text-ink-500">Awaiting instructions...</li>
        ) : (
          entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3">
              <span className="mt-0.5 text-xs text-ink-500">{formatTimestamp(entry.timestamp)}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${stageColor[entry.stage] ?? ''}`}>
                {entry.stage}
              </span>
              <span className="flex-1 leading-tight">{entry.message}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
});

AgentLog.displayName = 'AgentLog';
