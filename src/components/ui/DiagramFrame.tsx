'use client';

import type { DiagramSpec } from '@/types/DiagramProps';
import { kDiagramRegistry } from '@/components/diagrams';

export default function DiagramFrame({ spec }: { spec: DiagramSpec }) {
  const Diagram = kDiagramRegistry[spec.key];

  return (
    <section aria-labelledby="diagram-heading" className="space-y-3">
      <h2 id="diagram-heading" className="text-lg font-semibold text-content">
        視覺圖表
      </h2>
      <figure className="w-full rounded-xl border border-border bg-surface-raised p-4 sm:p-5">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="min-w-[640px]">
            <Diagram spec={spec} />
          </div>
        </div>
        {spec.caption && (
          <figcaption className="mt-3 text-sm text-content-muted">{spec.caption}</figcaption>
        )}
      </figure>
    </section>
  );
}
