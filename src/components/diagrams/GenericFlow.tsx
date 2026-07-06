'use client';

import type { DiagramComponentProps } from '@/types/DiagramProps';

/**
 * A neutral flowchart / UML-style diagram used by chapters that do not have a
 * bespoke visualisation. Node labels come from the content's `diagram.nodes`
 * (Traditional Chinese); a sensible default is used when none are supplied.
 */
export default function GenericFlow({ spec }: DiagramComponentProps) {
  const nodes = spec.nodes?.length ? spec.nodes : ['原始碼', '編譯', '最佳化', '執行'];

  const boxWidth = 150;
  const boxHeight = 56;
  const gap = 40;
  const totalWidth = nodes.length * boxWidth + (nodes.length - 1) * gap;
  const height = 120;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={`流程圖：${nodes.join(' 到 ')}`}
    >
      <defs>
        <marker id="flow-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="rgb(96 165 250)" />
        </marker>
      </defs>
      {nodes.map((label, i) => {
        const x = i * (boxWidth + gap);
        const y = (height - boxHeight) / 2;
        return (
          <g key={label + i}>
            <rect
              x={x}
              y={y}
              width={boxWidth}
              height={boxHeight}
              rx={10}
              className="fill-accent-soft stroke-accent"
              strokeWidth={1.5}
            />
            <text
              x={x + boxWidth / 2}
              y={y + boxHeight / 2}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-content"
              fontSize={15}
            >
              {label}
            </text>
            {i < nodes.length - 1 && (
              <line
                x1={x + boxWidth}
                y1={height / 2}
                x2={x + boxWidth + gap}
                y2={height / 2}
                stroke="rgb(96 165 250)"
                strokeWidth={2}
                markerEnd="url(#flow-arrow)"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
