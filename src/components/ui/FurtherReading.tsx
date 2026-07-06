import type { FurtherReadingLink } from '@/types/ChapterContent';

export default function FurtherReading({
  links,
}: {
  links: FurtherReadingLink[];
}) {
  if (links.length === 0) return null;

  return (
    <section aria-labelledby="reading-heading" className="space-y-3">
      <h2 id="reading-heading" className="text-lg font-semibold text-content">
        延伸閱讀
      </h2>
      <ul className="space-y-3">
        {links.map((link) => (
          <li
            key={link.href}
            className="rounded-lg border border-border bg-surface-raised p-3"
          >
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent underline decoration-dotted underline-offset-4 hover:decoration-solid"
            >
              {link.title}
            </a>
            <p className="mt-1 text-sm text-content-muted">{link.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
