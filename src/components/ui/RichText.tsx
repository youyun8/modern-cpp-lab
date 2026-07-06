import { Fragment, type ReactNode } from 'react';

/**
 * Renders a Traditional Chinese string with lightweight inline markup:
 *   - `backtick` spans become monospace <code> elements
 *   - blank lines split paragraphs
 * Everything else is plain text. Deliberately tiny — no full Markdown.
 */
function renderInline(text: string): ReactNode[] {
  const parts = text.split('`');
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <code key={i} className="inline-code">
        {part}
      </code>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

export default function RichText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  return (
    <>
      {paragraphs.map((para, i) => (
        <p key={i} className={className}>
          {renderInline(para.trim())}
        </p>
      ))}
    </>
  );
}
