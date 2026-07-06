import type { ChapterContent } from '@/types/ChapterContent';

import ch01 from './ch01-introduction';
import ch02 from './ch02-preparation';
import ch03 from './ch03-basic-concepts-i';
import ch04 from './ch04-basic-concepts-ii';
import ch05 from './ch05-basic-concepts-iii';
import ch06 from './ch06-basic-concepts-iv';
import ch07 from './ch07-basic-concepts-v';
import ch08 from './ch08-basic-concepts-vi';
import ch09 from './ch09-oop-i';
import ch10 from './ch10-oop-ii';
import ch11 from './ch11-templates-i';
import ch12 from './ch12-templates-ii';
import ch13 from './ch13-translation-units-i';
import ch14 from './ch14-translation-units-ii';
import ch15 from './ch15-code-conventions-i';
import ch16 from './ch16-code-conventions-ii';
import ch17 from './ch17-debugging-testing';
import ch18 from './ch18-ecosystem';
import ch19 from './ch19-utilities';
import ch20 from './ch20-containers-algorithms';
import ch21 from './ch21-advanced-i';
import ch22 from './ch22-advanced-ii';
import ch23 from './ch23-optimization-i';
import ch24 from './ch24-optimization-ii';
import ch25 from './ch25-optimization-iii';
import ch26 from './ch26-software-design-i';
import ch27 from './ch27-software-design-ii';
import ch28 from './ch28-binary-size';
import ch29 from './ch29-build-time';

import labMemoryModel from './lab-memory-model';
import labLockFree from './lab-lock-free';
import labParallelStl from './lab-parallel-stl';
import labCoroutines from './lab-coroutines';
import labGpuBridge from './lab-gpu-bridge';

const kAll: ChapterContent[] = [
  ch01, ch02, ch03, ch04, ch05, ch06, ch07, ch08, ch09, ch10,
  ch11, ch12, ch13, ch14, ch15, ch16, ch17, ch18, ch19, ch20,
  ch21, ch22, ch23, ch24, ch25, ch26, ch27, ch28, ch29,
  labMemoryModel, labLockFree, labParallelStl, labCoroutines, labGpuBridge,
];

export const kContentBySlug: Record<string, ChapterContent> = Object.fromEntries(
  kAll.map((c) => [c.slug, c]),
);

/** All chapter (non-lab) slugs, i.e. those with a chapterLabel. */
export const kChapterSlugs: string[] = kAll
  .filter((c) => c.chapterLabel)
  .map((c) => c.slug);

/** Lab slugs stripped of the "lab-" prefix, for the /lab/[lab] route. */
export const kLabSlugs: string[] = kAll
  .filter((c) => !c.chapterLabel)
  .map((c) => c.slug.replace(/^lab-/, ''));

export function getContent(slug: string): ChapterContent | undefined {
  return kContentBySlug[slug];
}
