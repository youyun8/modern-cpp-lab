'use client';

import { useState } from 'react';
import type { DiagramComponentProps } from '@/types/DiagramProps';

/**
 * Execution-policy visualiser for /lab/parallel-stl. Shows how the same 8
 * elements are scheduled under each std::execution policy:
 *   seq        — single lane, sequential
 *   par        — several threads (lanes), each sequential
 *   unseq      — single thread, SIMD vectorised (interleaved)
 *   par_unseq  — several threads, each SIMD vectorised
 */

type Policy = 'seq' | 'par' | 'unseq' | 'par_unseq';

const kPolicies: { id: Policy; label: string; desc: string }[] = [
  { id: 'seq', label: 'seq', desc: '單執行緒、依序執行，順序確定。' },
  { id: 'par', label: 'par', desc: '多執行緒平行，元素間不得有資料競爭。' },
  { id: 'unseq', label: 'unseq', desc: '單執行緒、SIMD 向量化，允許交錯執行。' },
  { id: 'par_unseq', label: 'par_unseq', desc: '多執行緒且各自向量化，限制最嚴格。' },
];

const kItems = 8;
const kWidth = 640;
const kCell = 54;

export default function ExecutionPolicies(_props: DiagramComponentProps) {
  const [policy, setPolicy] = useState<Policy>('par');

  const lanes = policy === 'seq' || policy === 'unseq' ? 1 : 4;
  const vectorised = policy === 'unseq' || policy === 'par_unseq';

  const rows = Array.from({ length: lanes }, (_, lane) =>
    Array.from({ length: kItems }, (_, i) => i).filter((i) => i % lanes === lane),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="選擇執行策略">
        {kPolicies.map((pol) => (
          <button
            key={pol.id}
            type="button"
            role="tab"
            aria-selected={policy === pol.id}
            onClick={() => setPolicy(pol.id)}
            className={`rounded-md border px-3 py-1 font-mono text-sm ${
              policy === pol.id
                ? 'border-accent bg-accent text-white'
                : 'border-border bg-surface-raised text-content hover:border-accent'
            }`}
          >
            {pol.label}
          </button>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${kWidth} ${lanes * (kCell + 12) + 30}`}
        className="h-auto w-full"
        role="img"
        aria-label={`執行策略 ${policy} 的排程示意圖`}
      >
        {rows.map((row, lane) => {
          const y = 20 + lane * (kCell + 12);
          return (
            <g key={lane}>
              <text x={6} y={y + kCell / 2 + 4} className="fill-content-muted" fontSize={12}>
                {lanes > 1 ? `T${lane + 1}` : 'T1'}
              </text>
              {row.map((item, pos) => (
                <g key={item}>
                  <rect
                    x={44 + pos * (kCell + 8)}
                    y={y}
                    width={kCell}
                    height={kCell}
                    rx={8}
                    className={vectorised ? 'fill-accent' : 'fill-accent-soft stroke-accent'}
                    strokeWidth={1.5}
                  />
                  <text
                    x={44 + pos * (kCell + 8) + kCell / 2}
                    y={y + kCell / 2 + 4}
                    textAnchor="middle"
                    className={vectorised ? 'fill-white' : 'fill-content'}
                    fontSize={14}
                  >
                    #{item}
                  </text>
                </g>
              ))}
            </g>
          );
        })}
      </svg>

      <p className="text-sm text-content-muted">
        {kPolicies.find((pol) => pol.id === policy)?.desc}
        {vectorised && ' 實心方塊代表同一向量暫存器中同時處理的元素。'}
      </p>
    </div>
  );
}
