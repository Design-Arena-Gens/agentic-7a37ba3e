'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { AnimeClip, Panel } from '../lib/types';
import type { StoryBeat } from '../lib/story-generator';

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function parseTransform(transform: string) {
  const translateMatch = /translate3d\(([-\d.]+)%?,\s*([-\d.]+)%?,\s*[-\d.]+\)/.exec(transform);
  const scaleMatch = /scale\(([-\d.]+)\)/.exec(transform);
  const tx = translateMatch ? parseFloat(translateMatch[1]) : 0;
  const ty = translateMatch ? parseFloat(translateMatch[2]) : 0;
  const scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
  return { tx, ty, scale };
}

function findKeyframeSpan(clip: AnimeClip, progress: number) {
  const frames = clip.keyframes.sort((a, b) => a.offset - b.offset);
  for (let i = 0; i < frames.length - 1; i += 1) {
    const current = frames[i];
    const next = frames[i + 1];
    if (progress >= current.offset && progress <= next.offset) {
      const span = Math.max(1e-6, next.offset - current.offset);
      const localT = (progress - current.offset) / span;
      const currentTransform = parseTransform(current.transform);
      const nextTransform = parseTransform(next.transform);
      return {
        current,
        next,
        localT,
        transform: {
          tx: lerp(currentTransform.tx, nextTransform.tx, localT),
          ty: lerp(currentTransform.ty, nextTransform.ty, localT),
          scale: lerp(currentTransform.scale, nextTransform.scale, localT),
        },
        opacity: lerp(current.opacity, next.opacity, localT),
      } as const;
    }
  }
  const last = frames[frames.length - 1];
  return {
    current: last,
    next: last,
    localT: 1,
    transform: parseTransform(last.transform),
    opacity: last.opacity,
  } as const;
}

function fitRect(width: number, height: number, maxWidth: number, maxHeight: number) {
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: width * ratio,
    height: height * ratio,
  };
}

export type AnimePlayerProps = {
  clips: AnimeClip[];
  panels: Panel[];
  beats: StoryBeat[];
};

export function AnimePlayer({ clips, panels, beats }: AnimePlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pauseOffsetRef = useRef<number>(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const beatLookup = useMemo(() => new Map(beats.map((beat) => [beat.panelId, beat])), [beats]);

  const totalDuration = useMemo(() => clips.reduce((acc, clip) => acc + clip.duration, 0), [clips]);

  useEffect(() => {
    const imageStore = imagesRef.current;
    if (!clips.length) {
      setImagesReady(false);
      imageStore.clear();
      return;
    }

    let cancelled = false;
    const uniquePanelIds = Array.from(new Set(clips.map((clip) => clip.panelId)));
    const assets = panels.filter((panel) => uniquePanelIds.includes(panel.id));

    Promise.all(
      assets.map(
        (panel) =>
          new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              if (!cancelled) {
                imageStore.set(panel.id, img);
                resolve();
              }
            };
            img.onerror = reject;
            img.src = panel.dataUrl;
          }),
      ),
    )
      .then(() => {
        if (!cancelled) {
          setImagesReady(true);
        }
      })
      .catch(() => {
        setImagesReady(false);
      });

    return () => {
      cancelled = true;
      imageStore.clear();
    };
  }, [clips, panels]);

  const stopPlayback = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startTimeRef.current = null;
    pauseOffsetRef.current = 0;
    setIsPlaying(false);
  }, []);

  const drawClip = useCallback(
    (clip: AnimeClip, panel: Panel, progress: number) => {
      const canvas = canvasRef.current;
      const image = imagesRef.current.get(panel.id);
      if (!canvas || !image) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const frame = findKeyframeSpan(clip, progress);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(5,8,15,0.85)');
      gradient.addColorStop(1, 'rgba(2,0,15,0.95)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.globalAlpha = Math.min(1, Math.max(0, frame.opacity));
      const fitted = fitRect(image.width, image.height, canvas.width * 0.92, canvas.height * 0.92);
      const drawWidth = fitted.width * frame.transform.scale;
      const drawHeight = fitted.height * frame.transform.scale;
      const drawX = canvas.width / 2 - drawWidth / 2 + (frame.transform.tx / 100) * canvas.width;
      const drawY = canvas.height / 2 - drawHeight / 2 + (frame.transform.ty / 100) * canvas.height;
      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      ctx.restore();

      const beat = beatLookup.get(panel.id);
      if (beat) {
        const padding = 24;
        const boxWidth = canvas.width - padding * 2;
        const boxHeight = 80;
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = 'rgba(15,16,40,0.85)';
        ctx.fillRect(padding, canvas.height - boxHeight - padding, boxWidth, boxHeight);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(220,230,255,0.95)';
        ctx.font = '600 18px "Inter", system-ui';
        ctx.fillText(beat.narration, padding + 20, canvas.height - padding - 36);
        ctx.fillStyle = 'rgba(140,150,210,0.9)';
        ctx.font = '500 12px "Inter", system-ui';
        ctx.fillText(`Tone: ${beat.tone}`, padding + 20, canvas.height - padding - 16);
        ctx.restore();
      }
    },
    [beatLookup],
  );

  const runTimeline = useCallback(
    (timestamp: number) => {
      if (!isPlaying || !clips.length) {
        return;
      }
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp - pauseOffsetRef.current;
      }
      const elapsed = timestamp - startTimeRef.current;
      if (elapsed >= totalDuration) {
        drawClip(clips[clips.length - 1], panels.find((p) => p.id === clips[clips.length - 1].panelId)!, 1);
        if (recorderRef.current && recorderRef.current.state === 'recording') {
          recorderRef.current.stop();
        }
        stopPlayback();
        return;
      }

      let timeAccumulator = 0;
      for (let i = 0; i < clips.length; i += 1) {
        const clip = clips[i];
        const clipStart = timeAccumulator;
        const clipEnd = clipStart + clip.duration;
        if (elapsed >= clipStart && elapsed <= clipEnd) {
          const localProgress = (elapsed - clipStart) / clip.duration;
          setCurrentClipIndex((prev) => (prev !== i ? i : prev));
          setCurrentProgress((prev) => (Math.abs(prev - localProgress) > 0.05 ? localProgress : prev));
          const panel = panels.find((p) => p.id === clip.panelId);
          if (panel) {
            drawClip(clip, panel, localProgress);
          }
          break;
        }
        timeAccumulator = clipEnd;
      }

      rafRef.current = requestAnimationFrame(runTimeline);
    },
    [clips, drawClip, isPlaying, panels, stopPlayback, totalDuration],
  );

  useEffect(() => {
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(runTimeline);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      pauseOffsetRef.current = Math.min(
        pauseOffsetRef.current,
        totalDuration,
      );
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, runTimeline, totalDuration]);

  const handlePlayToggle = useCallback(() => {
    if (!imagesReady || !clips.length) return;
    if (isPlaying) {
      setIsPlaying(false);
      if (startTimeRef.current !== null) {
        pauseOffsetRef.current = performance.now() - startTimeRef.current;
      }
    } else {
      setDownloadUrl(null);
      setIsPlaying(true);
      if (!startTimeRef.current) {
        startTimeRef.current = performance.now() - pauseOffsetRef.current;
      }
    }
  }, [clips.length, imagesReady, isPlaying]);

  const restart = useCallback(() => {
    stopPlayback();
    setCurrentClipIndex(0);
    setCurrentProgress(0);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [stopPlayback]);

  const exportVideo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !clips.length || !imagesReady) return;

    if (recorderRef.current && recorderRef.current.state === 'recording') {
      return;
    }

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      chunksRef.current = [];
    };

    recorderRef.current = recorder;
    restart();
    pauseOffsetRef.current = 0;
    startTimeRef.current = null;
    setIsPlaying(true);
    recorder.start();

    window.setTimeout(() => {
      if (recorder.state === 'recording') {
        recorder.stop();
      }
    }, totalDuration + 600);
  }, [clips.length, imagesReady, restart, totalDuration]);

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        recorderRef.current.stop();
      }
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  return (
    <section className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Anime Preview</h3>
        <span className="text-xs text-ink-500">
          {clips.length ? `${clips.length} motion clips · ${(totalDuration / 1000).toFixed(1)}s runtime` : 'Awaiting generation'}
        </span>
      </header>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="w-full rounded-2xl border border-ink-800 bg-ink-900/50 p-4 lg:w-3/4">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="aspect-video w-full rounded-xl bg-ink-950 shadow-2xl"
          />
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayToggle}
                className="rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-indigo-900"
                disabled={!clips.length || !imagesReady}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                onClick={restart}
                className="rounded-full border border-ink-700 px-3 py-2 text-sm text-ink-200 transition hover:border-indigo-500 hover:text-indigo-200"
                disabled={!clips.length}
              >
                Reset
              </button>
              <button
                onClick={exportVideo}
                className="rounded-full bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-900/40"
                disabled={!clips.length || !imagesReady}
              >
                Export WebM
              </button>
            </div>
            <div className="text-sm text-ink-400">
              Clip {currentClipIndex + 1}/{clips.length} · {(currentProgress * 100).toFixed(0)}%
            </div>
          </div>
          {downloadUrl ? (
            <a
              href={downloadUrl}
              download="manga-anime-agent.webm"
              className="mt-3 inline-flex items-center rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/30"
            >
              Download Render
            </a>
          ) : null}
        </div>
        <aside className="flex w-full flex-col gap-3 rounded-2xl border border-ink-800 bg-ink-900/40 p-4 lg:w-1/4">
          <p className="text-sm font-semibold text-ink-200">Current Beat</p>
          {clips[currentClipIndex] ? (
            <motion.div
              key={clips[currentClipIndex].id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="rounded-xl bg-ink-800/50 p-4 text-sm leading-relaxed text-ink-200"
            >
              {beatLookup.get(clips[currentClipIndex].panelId)?.narration ?? '—'}
            </motion.div>
          ) : (
            <p className="text-sm text-ink-500">Awaiting playback...</p>
          )}
          <p className="text-xs text-ink-500">
            The agent stitches motion beats using ken-burns style pans, easing transitions, and tone-aware overlays. Export renders to WebM for further editing.
          </p>
        </aside>
      </div>
    </section>
  );
}
