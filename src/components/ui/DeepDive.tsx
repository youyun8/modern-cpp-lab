import type { DeepDiveSection } from '@/types/ChapterContent';
import RichText from './RichText';

/** Renders the in-depth "深入解析" sections for industrial-grade coverage. */
export default function DeepDive({ sections }: { sections: DeepDiveSection[] }) {
  if (sections.length === 0) return null;
  return (
    <section aria-labelledby="deepdive-heading" className="space-y-4">
      <h2 id="deepdive-heading" className="text-lg font-semibold text-content">
        深入解析
      </h2>
      <div className="space-y-4">
        {sections.map((s, i) => (
          <article key={i} className="rounded-xl border border-border bg-surface-raised p-5">
            <h3 className="mb-2 text-base font-semibold text-content">{s.heading}</h3>
            <div className="space-y-3 text-[15px] leading-7 text-content">
              <RichText text={s.body} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
