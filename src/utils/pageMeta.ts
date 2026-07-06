import type { Metadata } from 'next';
import type { ChapterContent } from '@/types/ChapterContent';

/** Builds Next.js metadata (with a Traditional Chinese description) for a page. */
export function buildMetadata(content: ChapterContent): Metadata {
  const label = content.chapterLabel ? `${content.chapterLabel} ` : '';
  return {
    title: `${label}${content.title}`,
    description: content.description,
  };
}
