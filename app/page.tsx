'use client';

import { useCallback } from 'react';
import { FileDropZone } from '../components/file-dropzone';
import { AgentLog } from '../components/agent-log';
import { PanelGrid } from '../components/panel-grid';
import { Storyboard } from '../components/storyboard';
import { AnimePlayer } from '../components/anime-player';
import { useMangaAgent } from '../lib/agent';

export default function HomePage() {
  const { state, processFiles, reset, summary } = useMangaAgent();

  const onFiles = useCallback(
    (files: File[]) => {
      processFiles(files);
    },
    [processFiles],
  );

  const hasResults = state.panels.length > 0;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-16 pt-10">
      <section className="rounded-3xl border border-ink-800 bg-gradient-to-br from-ink-900/90 via-ink-900/70 to-indigo-950/40 p-10 shadow-2xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4 lg:max-w-2xl">
            <span className="rounded-full bg-indigo-500/20 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-200">
              Autonomous Vision-to-Animation Agent
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-ink-50 md:text-5xl">
              Transform static manga chapters into animated anime previews.
            </h1>
            <p className="text-base text-ink-300">
              Drop in manga page scans and let the agent segment panels, craft narrative beats, and composite motion sweeps
              into a cinematic WebM render ready for Vercel delivery.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-ink-400">
              <span className="rounded-full border border-ink-700 px-3 py-1">Panel segmentation</span>
              <span className="rounded-full border border-ink-700 px-3 py-1">Story pacing</span>
              <span className="rounded-full border border-ink-700 px-3 py-1">Canvas renderer</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-ink-800 bg-ink-900/80 p-6 text-sm text-ink-200">
            <div className="flex items-center justify-between">
              <span className="text-ink-400">Agent stage</span>
              <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-200">
                {state.stage}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-400">Status</span>
              <span className="font-semibold text-ink-100">
                {state.isProcessing ? 'Synthesizing sequence…' : hasResults ? 'Ready' : 'Idle'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-400">Summary</span>
              <span className="text-ink-100">{summary}</span>
            </div>
            <button
              onClick={reset}
              className="mt-3 rounded-full border border-ink-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-300 transition hover:border-rose-400 hover:text-rose-200"
              disabled={!hasResults && !state.logs.length}
            >
              Reset Agent State
            </button>
            {state.error ? <p className="text-xs text-rose-300">{state.error}</p> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FileDropZone onFiles={onFiles} disabled={state.isProcessing} />
        </div>
        <div>
          <AgentLog entries={state.logs} />
        </div>
      </section>

      {hasResults ? (
        <section className="space-y-10">
          <PanelGrid panels={state.panels} />
          <Storyboard beats={state.beats} panels={state.panels} />
          <AnimePlayer clips={state.clips} panels={state.panels} beats={state.beats} />
        </section>
      ) : null}
    </main>
  );
}
