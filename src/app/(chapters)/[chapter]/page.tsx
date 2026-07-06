import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ChapterPage from '@/components/ChapterPage';
import { getContent, kChapterSlugs } from '@/content/registry';
import { highlightCode } from '@/utils/highlighter';
import { buildMetadata } from '@/utils/pageMeta';

export const dynamicParams = false;

export function generateStaticParams() {
  return kChapterSlugs.map((chapter) => ({ chapter }));
}

export function generateMetadata({ params }: { params: { chapter: string } }): Metadata {
  const content = getContent(params.chapter);
  return content ? buildMetadata(content) : {};
}

export default async function Page({ params }: { params: { chapter: string } }) {
  const content = getContent(params.chapter);
  if (!content) notFound();
  const codeHtml = await highlightCode(content.code);
  return <ChapterPage content={content} codeHtml={codeHtml} />;
}
