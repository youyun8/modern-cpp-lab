import Link from 'next/link';
import type { ChapterContent } from '@/types/ChapterContent';
import type { HighlightedCode } from '@/utils/highlighter';
import { getAdjacentNavItems } from '@/nav';
import ActiveChapterSync from '@/components/ActiveChapterSync';
import ConceptCard from '@/components/ui/ConceptCard';
import DeepDive from '@/components/ui/DeepDive';
import CodeBlock from '@/components/ui/CodeBlock';
import PracticeNotes from '@/components/ui/PracticeNotes';
import QuizPanel from '@/components/ui/QuizPanel';
import DiagramFrame from '@/components/ui/DiagramFrame';
import TryItPanel from '@/components/ui/TryItPanel';
import FurtherReading from '@/components/ui/FurtherReading';

/**
 * Renders the canonical six-panel layout for any chapter or lab page from a
 * single ChapterContent object plus its pre-highlighted code markup.
 */
export default function ChapterPage({
  content,
  codeHtml,
}: {
  content: ChapterContent;
  codeHtml: HighlightedCode;
}) {
  const { prev, next } = getAdjacentNavItems(content.slug);

  return (
    <article className="mx-auto max-w-3xl space-y-8 pb-16">
      <ActiveChapterSync slug={content.slug} />

      <header className="space-y-2 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          {content.chapterLabel && (
            <span className="rounded-md bg-accent px-2 py-0.5 font-mono text-sm font-semibold text-white">
              {content.chapterLabel}
            </span>
          )}
          <span className="text-sm text-content-muted">{content.group}</span>
          {content.isStub && (
            <span className="rounded-md border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">
              內容建置中
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-content sm:text-3xl">
          {content.title}
        </h1>
      </header>

      {content.isStub && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          本頁為佔位頁面，路由與版面已就緒，完整教學內容仍在撰寫中。歡迎依「內容貢獻指南」補充。
        </div>
      )}

      <ConceptCard concept={content.concept} />

      {content.deepDive && content.deepDive.length > 0 && (
        <DeepDive sections={content.deepDive} />
      )}

      <CodeBlock html={codeHtml} callouts={content.code.callouts} />

      <PracticeNotes
        pitfalls={content.pitfalls}
        bestPractices={content.bestPractices}
      />

      <QuizPanel chapterSlug={content.slug} questions={content.quiz} />

      <DiagramFrame spec={content.diagram} />

      <TryItPanel code={content.tryIt.code} />

      <FurtherReading links={content.furtherReading} />

      <nav
        aria-label="章節導覽"
        className="flex items-center justify-between gap-4 border-t border-border pt-6"
      >
        {prev ? (
          <Link
            href={prev.href}
            className="group flex flex-col rounded-lg border border-border p-3 text-left hover:border-accent"
          >
            <span className="text-xs text-content-muted">上一頁</span>
            <span className="text-sm text-content group-hover:text-accent">
              {prev.chapterLabel ? `${prev.chapterLabel} · ` : ''}
              {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={next.href}
            className="group flex flex-col rounded-lg border border-border p-3 text-right hover:border-accent"
          >
            <span className="text-xs text-content-muted">下一頁</span>
            <span className="text-sm text-content group-hover:text-accent">
              {next.chapterLabel ? `${next.chapterLabel} · ` : ''}
              {next.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
