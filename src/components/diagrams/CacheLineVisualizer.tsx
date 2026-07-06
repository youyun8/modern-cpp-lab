'use client';

import { useState } from 'react';
import type { DiagramComponentProps } from '@/types/DiagramProps';

/**
 * Cache-line visualiser for Ch.24. Toggles between two layouts of a struct
 * shared by two cores:
 *   - false sharing : both counters land in the SAME 64-byte line
 *   - padded        : each counter sits on its OWN line
 * The highlighted line shows which core invalidates the other.
 */

const kWidth = 640;
const kCell = 34;
const kCols = 16; // 16 * 4 bytes = 64-byte line (illustrative)

export default function CacheLineVisualizer(_props: DiagramComponentProps) {
  const [padded, setPadded] = useState(false);

  // Byte offsets occupied by counter A / counter B.
  const aCells = padded ? [0] : [0];
  const bCells = padded ? [kCols] : [1];

  const renderLine = (lineIndex: number) => {
    const y = 40 + lineIndex * (kCell + 24);
    return (
      <g key={lineIndex}>
        <text x={10} y={y + kCell / 2 + 5} className="fill-content-muted" fontSize={12}>
          {`Line ${lineIndex}`}
        </text>
        {Array.from({ length: kCols }).map((_, c) => {
          const globalIdx = lineIndex * kCols + c;
          const isA = aCells.includes(globalIdx);
          const isB = bCells.includes(globalIdx);
          const fill = isA
            ? 'fill-accent'
            : isB
              ? 'fill-[rgb(248_113_113)]'
              : 'fill-surface-raised';
          return (
            <rect
              key={c}
              x={80 + c * kCell}
              y={y}
              width={kCell - 3}
              height={kCell}
              rx={4}
              className={`${fill} stroke-border`}
              strokeWidth={1}
            />
          );
        })}
      </g>
    );
  };

  const lineCount = padded ? 2 : 1;

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${kWidth} ${lineCount * (kCell + 24) + 70}`}
        className="h-auto w-full"
        role="img"
        aria-label={
          padded
            ? '快取行視覺化：兩個計數器經過 padding，位於不同快取行'
            : '快取行視覺化：兩個計數器共用同一快取行，發生偽共享'
        }
      >
        {Array.from({ length: lineCount }).map((_, i) => renderLine(i))}
        <g>
          <rect x={80} y={lineCount * (kCell + 24) + 30} width={16} height={16} className="fill-accent" />
          <text x={102} y={lineCount * (kCell + 24) + 43} className="fill-content" fontSize={13}>
            核心 1 的計數器 A
          </text>
          <rect x={260} y={lineCount * (kCell + 24) + 30} width={16} height={16} className="fill-[rgb(248_113_113)]" />
          <text x={282} y={lineCount * (kCell + 24) + 43} className="fill-content" fontSize={13}>
            核心 2 的計數器 B
          </text>
        </g>
      </svg>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPadded((p) => !p)}
          className="rounded-md border border-border bg-surface-raised px-3 py-1 text-sm text-content hover:border-accent"
          aria-label="切換偽共享與填充配置"
        >
          {padded ? '顯示偽共享（同一快取行）' : '顯示填充（不同快取行）'}
        </button>
        <span className="text-sm text-content-muted">
          {padded
            ? '兩計數器分屬不同快取行，核心互不使對方失效。'
            : '兩計數器共用一條快取行，寫入會使對方快取失效（偽共享）。'}
        </span>
      </div>
    </div>
  );
}
