'use client';

import { useEffect, useRef, useState } from 'react';
import type { DiagramComponentProps } from '@/types/DiagramProps';

/**
 * Animated thread timeline for Ch.22. Two threads compete for a mutex; the
 * playhead sweeps left-to-right and the lock highlights whichever thread holds
 * it. Demonstrates mutual exclusion of the critical section.
 */

interface Segment {
  thread: 0 | 1;
  start: number; // fraction 0..1
  end: number; // fraction 0..1
}

// Non-overlapping critical sections — the essence of mutual exclusion.
const kSegments: Segment[] = [
  { thread: 0, start: 0.05, end: 0.28 },
  { thread: 1, start: 0.32, end: 0.55 },
  { thread: 0, start: 0.6, end: 0.78 },
  { thread: 1, start: 0.82, end: 0.97 },
];

const kWidth = 640;
const kRowHeight = 70;
const kTrackX = 120;
const kTrackW = kWidth - kTrackX - 30;

export default function ThreadTimeline(_props: DiagramComponentProps) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const raf = useRef<number | null>(null);
  const last = useRef<number>(0);

  useEffect(() => {
    if (!playing) return;
    const step = (now: number) => {
      if (last.current === 0) last.current = now;
      const dt = (now - last.current) / 6000; // ~6s per loop
      last.current = now;
      setT((prev) => (prev + dt) % 1);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      last.current = 0;
    };
  }, [playing]);

  const active = kSegments.find((s) => t >= s.start && t < s.end);
  const playheadX = kTrackX + t * kTrackW;

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${kWidth} ${2 * kRowHeight + 50}`}
        className="h-auto w-full"
        role="img"
        aria-label="執行緒時間軸：兩個執行緒互斥地取得 mutex"
      >
        {[0, 1].map((thread) => {
          const y = 20 + thread * kRowHeight;
          return (
            <g key={thread}>
              <text x={10} y={y + 22} className="fill-content" fontSize={14}>
                {`執行緒 ${thread + 1}`}
              </text>
              <rect
                x={kTrackX}
                y={y}
                width={kTrackW}
                height={40}
                rx={6}
                className="fill-surface-raised stroke-border"
                strokeWidth={1}
              />
              {kSegments
                .filter((s) => s.thread === thread)
                .map((s, i) => {
                  const isActive = active === s;
                  return (
                    <rect
                      key={i}
                      x={kTrackX + s.start * kTrackW}
                      y={y}
                      width={(s.end - s.start) * kTrackW}
                      height={40}
                      rx={6}
                      className={isActive ? 'fill-accent' : 'fill-accent-soft stroke-accent'}
                      strokeWidth={1}
                    />
                  );
                })}
            </g>
          );
        })}

        {/* Lock indicator */}
        <text x={10} y={2 * kRowHeight + 40} className="fill-content-muted" fontSize={13}>
          {active ? `🔒 mutex 由執行緒 ${active.thread + 1} 持有` : '🔓 mutex 未鎖定'}
        </text>

        {/* Playhead */}
        <line
          x1={playheadX}
          y1={10}
          x2={playheadX}
          y2={2 * kRowHeight + 10}
          stroke="rgb(248 113 113)"
          strokeWidth={2}
        />
      </svg>
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        className="rounded-md border border-border bg-surface-raised px-3 py-1 text-sm text-content hover:border-accent"
        aria-label={playing ? '暫停動畫' : '播放動畫'}
      >
        {playing ? '暫停' : '播放'}
      </button>
    </div>
  );
}
