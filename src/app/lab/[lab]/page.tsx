import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ChapterPage from '@/components/ChapterPage';
import { getContent, kLabSlugs } from '@/content/registry';
import { highlightCode } from '@/utils/highlighter';
import { buildMetadata } from '@/utils/pageMeta';

export const dynamicParams = false;

export async function generateStaticParams() {
  return kLabSlugs.map((lab) => ({ lab }));
}

export function generateMetadata({ params }: { params: { lab: string } }): Metadata {
  const content = getContent(`lab-${params.lab}`);
  return content ? buildMetadata(content) : {};
}

export default async function Page({ params }: { params: { lab: string } }) {
  const content = getContent(`lab-${params.lab}`);
  if (!content) notFound();
  const codeHtml = await highlightCode(content.code);
  return <ChapterPage content={content} codeHtml={codeHtml} />;
}
