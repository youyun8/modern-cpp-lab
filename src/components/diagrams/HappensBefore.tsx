'use client';

import type { DiagramComponentProps } from '@/types/DiagramProps';

/**
 * happens-before / release-acquire diagram for /lab/memory-model. Shows the
 * classic message-passing pattern: thread 1 stores data then release-stores a
 * flag; thread 2 acquire-loads the flag and is guaranteed to observe data.
 * The diagonal edge is the synchronises-with relation created by the pairing.
 */

const kWidth = 640;
const kHeight = 300;
const kCol1 = 150;
const kCol2 = 470;

interface Node {
  x: number;
  y: number;
  label: string;
}

const kT1: Node[] = [
  { x: kCol1, y: 70, label: 'data = 42' },
  { x: kCol1, y: 160, label: 'flag.store(true, release)' },
];
const kT2: Node[] = [
  { x: kCol2, y: 160, label: 'while(!flag.load(acquire))' },
  { x: kCol2, y: 250, label: 'assert(data == 42) ✓' },
];

export default function HappensBefore(_props: DiagramComponentProps) {
  const nodeBox = (n: Node, key: string, accent = false) => (
    <g key={key}>
      <rect
        x={n.x - 130}
        y={n.y - 20}
        width={260}
        height={40}
        rx={8}
        className={accent ? 'fill-accent-soft stroke-accent' : 'fill-surface-raised stroke-border'}
        strokeWidth={1.5}
      />
      <text x={n.x} y={n.y + 5} textAnchor="middle" className="fill-content font-mono" fontSize={13}>
        {n.label}
      </text>
    </g>
  );

  return (
    <svg
      viewBox={`0 0 ${kWidth} ${kHeight}`}
      className="h-auto w-full"
      role="img"
      aria-label="happens-before 關係：release 儲存與 acquire 載入的訊息傳遞範例"
    >
      <defs>
        <marker id="hb-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="rgb(96 165 250)" />
        </marker>
        <marker id="hb-arrow-red" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="rgb(248 113 113)" />
        </marker>
      </defs>

      <text x={kCol1} y={30} textAnchor="middle" className="fill-content" fontSize={14}>
        執行緒 1（Writer）
      </text>
      <text x={kCol2} y={30} textAnchor="middle" className="fill-content" fontSize={14}>
        執行緒 2（Reader）
      </text>

      {/* sequenced-before edges within each thread */}
      <line x1={kCol1} y1={90} x2={kCol1} y2={140} className="stroke-border" strokeWidth={2} markerEnd="url(#hb-arrow)" />
      <line x1={kCol2} y1={180} x2={kCol2} y2={230} className="stroke-border" strokeWidth={2} markerEnd="url(#hb-arrow)" />

      {/* synchronises-with edge (release -> acquire) */}
      <line
        x1={kCol1 + 130}
        y1={160}
        x2={kCol2 - 130}
        y2={160}
        stroke="rgb(248 113 113)"
        strokeWidth={2.5}
        markerEnd="url(#hb-arrow-red)"
      />
      <text x={(kCol1 + kCol2) / 2} y={150} textAnchor="middle" className="fill-[rgb(248_113_113)]" fontSize={12}>
        synchronises-with
      </text>

      {kT1.map((n, i) => nodeBox(n, `t1-${i}`, i === 1))}
      {kT2.map((n, i) => nodeBox(n, `t2-${i}`, i === 0))}
    </svg>
  );
}
