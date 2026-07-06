import type { CodeCallout } from '@/types/ChapterContent';
import type { HighlightedCode } from '@/utils/highlighter';

/**
 * Synchronous renderer for a pre-highlighted (shiki) snippet plus a
 * numbered-callout legend in Traditional Chinese. Highlighting itself happens
 * at the page level so this component stays sync-friendly for JSX.
 */
export default function CodeBlock({
  html,
  callouts,
}: {
  html: HighlightedCode;
  callouts: CodeCallout[];
}) {
  return (
    <section aria-labelledby="code-heading" className="space-y-3">
      <h2 id="code-heading" className="text-lg font-semibold text-content">
        程式碼區塊
      </h2>
      <div className="overflow-hidden rounded-xl border border-border">
        <div
          className="shiki-dark hidden overflow-x-auto p-4 text-[13.5px] leading-6 dark:block"
          dangerouslySetInnerHTML={{ __html: html.dark }}
        />
        <div
          className="shiki-light overflow-x-auto p-4 text-[13.5px] leading-6 dark:hidden"
          dangerouslySetInnerHTML={{ __html: html.light }}
        />
      </div>
      {callouts.length > 0 && (
        <ol className="space-y-1.5 rounded-lg border border-border bg-surface-raised p-4">
          {callouts.map((c) => (
            <li key={c.n} className="flex gap-2 text-sm text-content">
              <span
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-xs text-white"
                aria-hidden="true"
              >
                {c.n}
              </span>
              <span className="leading-6">
                <span className="sr-only">{`註解 ${c.n}：`}</span>
                {c.text}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
