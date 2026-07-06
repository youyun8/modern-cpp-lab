'use client';

import type { DiagramComponentProps } from '@/types/DiagramProps';

function charUnits(char: string): number {
  return char.charCodeAt(0) > 255 ? 2 : 1;
}

function measureLabel(text: string): number {
  return Array.from(text).reduce((sum, char) => sum + charUnits(char), 0);
}

function isBreakOpportunity(char: string): boolean {
  return [' ', '/', '／', '、', '，', ',', '-', '+', '(', '（'].includes(char);
}

function findBreakIndex(chars: string[], maxUnits: number): number {
  let units = 0;
  let lastBreak = -1;

  for (let i = 0; i < chars.length; i++) {
    units += charUnits(chars[i]);
    if (isBreakOpportunity(chars[i])) lastBreak = i;

    if (units > maxUnits) {
      return lastBreak > 0 ? lastBreak + 1 : Math.max(i, 1);
    }
  }

  return chars.length;
}

function wrapLabel(label: string, maxUnits = 20): string[] {
  const lines: string[] = [];
  let current = Array.from(label.trim());
  let currentUnits = measureLabel(current.join(''));

  while (currentUnits > maxUnits && current.length > 1) {
    const breakAt = findBreakIndex(current, maxUnits);
    const line = current.slice(0, breakAt).join('').trim();

    if (line) lines.push(line);

    current = current.slice(breakAt);
    while (current[0] === ' ') current.shift();
    currentUnits = measureLabel(current.join(''));
  }

  const finalLine = current.join('').trim();
  if (finalLine) lines.push(finalLine);

  return lines.length > 0 ? lines : [label.trim()];
}

/**
 * A neutral flowchart / UML-style diagram used by chapters that do not have a
 * bespoke visualisation. Node labels come from the content's `diagram.nodes`
 * (Traditional Chinese); a sensible default is used when none are supplied.
 */
export default function GenericFlow({ spec }: DiagramComponentProps) {
  const nodes = spec.nodes?.length ? spec.nodes : ['原始碼', '編譯', '最佳化', '執行'];
  const wrappedNodes = nodes.map((label) => wrapLabel(label));

  const boxWidth = 184;
  const lineHeight = 19;
  const maxLines = Math.max(...wrappedNodes.map((lines) => lines.length));
  const boxHeight = Math.max(70, maxLines * lineHeight + 30);
  const gap = 44;
  const totalWidth = nodes.length * boxWidth + (nodes.length - 1) * gap;
  const height = boxHeight + 64;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${height}`}
      className="h-auto w-full"
      style={{ minWidth: totalWidth }}
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
        const lines = wrappedNodes[i];
        const textStartY = y + boxHeight / 2 - ((lines.length - 1) * lineHeight) / 2;

        return (
          <g key={label + i}>
            <rect
              x={x}
              y={y}
              width={boxWidth}
              height={boxHeight}
              rx={8}
              className="fill-accent-soft stroke-accent"
              strokeWidth={1.5}
            />
            <text
              x={x + boxWidth / 2}
              y={y + boxHeight / 2}
              textAnchor="middle"
              className="fill-content"
              fontSize={15}
            >
              {lines.map((line, lineIndex) => (
                <tspan
                  key={lineIndex}
                  x={x + boxWidth / 2}
                  y={textStartY + lineIndex * lineHeight}
                  dominantBaseline="middle"
                >
                  {line}
                </tspan>
              ))}
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
