'use client';

import { useState } from 'react';
import type { DiagramComponentProps } from '@/types/DiagramProps';

/**
 * Memory-hierarchy latency ladder for Ch.23. Bar length is proportional to
 * log10(latency) so the DRAM/Disk gap stays readable. Hover/focus reveals a
 * Traditional Chinese tooltip.
 */

interface Level {
  name: string;
  detail: string;
  ns: number;
}

const kLevels: Level[] = [
  { name: 'L1 快取', detail: '約 32 KB／核心，最快', ns: 1 },
  { name: 'L2 快取', detail: '約 256 KB–1 MB／核心', ns: 4 },
  { name: 'L3 快取', detail: '數 MB，多核共用', ns: 15 },
  { name: 'DRAM 主記憶體', detail: '數 GB，容量大延遲高', ns: 100 },
  { name: 'SSD／磁碟', detail: 'NVMe SSD 約 100 µs', ns: 100000 },
];

const kWidth = 640;
const kBarX = 150;
const kBarMaxW = kWidth - kBarX - 90;
const kRowH = 46;

export default function MemoryLadder(_props: DiagramComponentProps) {
  const [hover, setHover] = useState<number | null>(null);
  const maxLog = Math.log10(kLevels[kLevels.length - 1].ns);

  return (
    <svg
      viewBox={`0 0 ${kWidth} ${kLevels.length * kRowH + 40}`}
      className="h-auto w-full"
      role="img"
      aria-label="記憶體階層延遲階梯，由 L1 快取到磁碟"
    >
      <text x={10} y={20} className="fill-content-muted" fontSize={13}>
        延遲（對數尺度，越長越慢）
      </text>
      {kLevels.map((lvl, i) => {
        const y = 36 + i * kRowH;
        const w = Math.max((Math.log10(lvl.ns) / maxLog) * kBarMaxW, 8);
        const isHover = hover === i;
        return (
          <g
            key={lvl.name}
            tabIndex={0}
            role="button"
            aria-label={`${lvl.name}：延遲約 ${lvl.ns} 奈秒，${lvl.detail}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
          >
            <text x={10} y={y + 26} className="fill-content" fontSize={14}>
              {lvl.name}
            </text>
            <rect
              x={kBarX}
              y={y + 8}
              width={w}
              height={26}
              rx={5}
              className={isHover ? 'fill-accent' : 'fill-accent-soft stroke-accent'}
              strokeWidth={1}
            />
            <text
              x={kBarX + w + 8}
              y={y + 26}
              className="fill-content-muted"
              fontSize={13}
            >
              {lvl.ns < 1000 ? `${lvl.ns} ns` : `${lvl.ns / 1000} µs`}
            </text>
            {isHover && (
              <text x={kBarX} y={y + 6} className="fill-content-muted" fontSize={11}>
                {lvl.detail}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
