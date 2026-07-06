'use client';

import { useMemo, useState } from 'react';
import type { DiagramComponentProps } from '@/types/DiagramProps';

/**
 * Interactive Amdahl's Law speedup curve for Ch.25. The slider controls the
 * parallel fraction p; the SVG redraws the speedup(N) curve on every change.
 * Axis labels are in Traditional Chinese.
 *
 *   speedup(N) = 1 / ((1 - p) + p / N)
 */

const kWidth = 640;
const kHeight = 360;
const kPad = 50;
const kMaxN = 1024; // processors, log2 axis
const kMaxSpeedup = 32;

function speedup(p: number, n: number): number {
  return 1 / (1 - p + p / n);
}

export default function AmdahlCurve(_props: DiagramComponentProps) {
  const [p, setP] = useState(0.9);

  const plotW = kWidth - 2 * kPad;
  const plotH = kHeight - 2 * kPad;

  // x axis: log2(N) from 0 (N=1) to 10 (N=1024)
  const xForN = (n: number) => kPad + (Math.log2(n) / Math.log2(kMaxN)) * plotW;
  const yForS = (s: number) =>
    kHeight - kPad - (Math.min(s, kMaxSpeedup) / kMaxSpeedup) * plotH;

  const path = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 100; i++) {
      const n = Math.pow(kMaxN, i / 100);
      const s = speedup(p, n);
      pts.push(`${i === 0 ? 'M' : 'L'}${xForN(Math.max(n, 1)).toFixed(1)},${yForS(s).toFixed(1)}`);
    }
    return pts.join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p]);

  const asymptote = 1 / (1 - p);
  const nTicks = [1, 4, 16, 64, 256, 1024];
  const sTicks = [1, 8, 16, 24, 32];

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${kWidth} ${kHeight}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Amdahl 定律加速曲線，平行比例 p 為 ${(p * 100).toFixed(0)}%`}
      >
        {/* Axes */}
        <line x1={kPad} y1={kHeight - kPad} x2={kWidth - kPad} y2={kHeight - kPad} className="stroke-border" strokeWidth={1.5} />
        <line x1={kPad} y1={kPad} x2={kPad} y2={kHeight - kPad} className="stroke-border" strokeWidth={1.5} />

        {/* Grid + ticks */}
        {nTicks.map((n) => (
          <g key={`x${n}`}>
            <line x1={xForN(n)} y1={kPad} x2={xForN(n)} y2={kHeight - kPad} className="stroke-border" strokeWidth={0.5} opacity={0.4} />
            <text x={xForN(n)} y={kHeight - kPad + 18} textAnchor="middle" className="fill-content-muted" fontSize={12}>
              {n}
            </text>
          </g>
        ))}
        {sTicks.map((s) => (
          <g key={`y${s}`}>
            <line x1={kPad} y1={yForS(s)} x2={kWidth - kPad} y2={yForS(s)} className="stroke-border" strokeWidth={0.5} opacity={0.4} />
            <text x={kPad - 10} y={yForS(s) + 4} textAnchor="end" className="fill-content-muted" fontSize={12}>
              {s}×
            </text>
          </g>
        ))}

        {/* Asymptote (theoretical max speedup) */}
        {asymptote <= kMaxSpeedup && (
          <line
            x1={kPad}
            y1={yForS(asymptote)}
            x2={kWidth - kPad}
            y2={yForS(asymptote)}
            stroke="rgb(248 113 113)"
            strokeWidth={1.2}
            strokeDasharray="6 4"
          />
        )}

        {/* Curve */}
        <path d={path} fill="none" stroke="rgb(96 165 250)" strokeWidth={2.5} />

        {/* Axis labels (Traditional Chinese) */}
        <text x={kWidth / 2} y={kHeight - 8} textAnchor="middle" className="fill-content" fontSize={13}>
          處理器數量 N（對數尺度）
        </text>
        <text
          x={16}
          y={kHeight / 2}
          textAnchor="middle"
          className="fill-content"
          fontSize={13}
          transform={`rotate(-90 16 ${kHeight / 2})`}
        >
          加速比 Speedup
        </text>
      </svg>

      <div className="flex flex-col gap-1">
        <label htmlFor="amdahl-p" className="text-sm text-content">
          平行比例 p = {(p * 100).toFixed(0)}%（理論上限{' '}
          {asymptote === Infinity ? '∞' : `${asymptote.toFixed(1)}×`}）
        </label>
        <input
          id="amdahl-p"
          type="range"
          min={0}
          max={0.99}
          step={0.01}
          value={p}
          onChange={(e) => setP(Number(e.target.value))}
          className="w-full accent-[rgb(96_165_250)]"
          aria-label="調整可平行化的程式比例"
        />
      </div>
    </div>
  );
}
