import type { ConceptCard as ConceptCardData } from '@/types/ChapterContent';
import StandardBadge from './StandardBadge';

export default function ConceptCard({ concept }: { concept: ConceptCardData }) {
  return (
    <section
      aria-labelledby="concept-heading"
      className="rounded-xl border border-border bg-surface-raised p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="concept-heading" className="text-lg font-semibold text-content">
          概念卡片
        </h2>
        <StandardBadge standard={concept.standard} />
      </div>
      <p className="text-[15px] leading-7 text-content">{concept.body}</p>
    </section>
  );
}
