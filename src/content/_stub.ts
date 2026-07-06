import type { ChapterContent, CppStandard, FurtherReadingLink } from '@/types/ChapterContent';
import type { DiagramKey, DiagramSpec } from '@/types/DiagramProps';

export interface StubParams {
  slug: string;
  title: string;
  group: string;
  chapterLabel?: string;
  description: string;
  /** Short Traditional Chinese phrase naming the chapter's core topic. */
  topic: string;
  standard?: CppStandard;
  /** Labels for the generic flow diagram nodes (Traditional Chinese). */
  diagramNodes?: string[];
  /** Override the diagram; defaults to the generic flowchart. */
  diagramKey?: DiagramKey;
  diagramCaption?: string;
  /** Optional extra further-reading links beyond the default slide link. */
  reading?: FurtherReadingLink[];
}

/**
 * Builds a placeholder ChapterContent with real Traditional Chinese copy in
 * every panel and TODO markers where full teaching content is still pending.
 */
export function createStub(params: StubParams): ChapterContent {
  const diagram: DiagramSpec = {
    key: params.diagramKey ?? 'generic-flow',
    nodes: params.diagramNodes ?? ['概念', '範例', '練習', '應用'],
    caption:
      params.diagramCaption ?? `「${params.topic}」的流程示意圖（佔位圖，待補充完整視覺化）。`,
  };

  // TODO: 撰寫本章的完整概念說明、標註程式碼、測驗與視覺化內容。
  return {
    slug: params.slug,
    chapterLabel: params.chapterLabel,
    title: params.title,
    group: params.group,
    description: params.description,
    isStub: true,
    concept: {
      standard: params.standard ?? 'C++23',
      body: `本章聚焦於「${params.topic}」。此為佔位內容：完整的概念卡片、程式碼標註、測驗與視覺圖表仍在撰寫中，歡迎依「內容貢獻指南」協助補齊。`,
    },
    code: {
      lang: 'cpp',
      code: `#include <iostream>

// TODO: Replace with an annotated example for "${params.topic}".
int main() {
    std::cout << "TODO: ${params.slug}\\n";
    return 0;
}`,
      callouts: [{ n: 1, text: '佔位程式碼：待補充與本章主題相關的標註範例。' }],
    },
    quiz: [
      {
        id: 'q1',
        stem: `（佔位題）關於「${params.topic}」的重點，下列敘述何者較為正確？`,
        options: [
          { id: 'a', text: '本章內容仍在撰寫中，此為示範用選項。' },
          { id: 'b', text: '待補充的正確選項。' },
        ],
        correctOptionId: 'b',
        explanation: '此為佔位測驗，正式解析與投影片頁碼待補充。',
      },
    ],
    diagram,
    tryIt: {
      code: `#include <iostream>

// TODO: Provide a runnable snippet for "${params.topic}".
int main() {
    std::cout << "Modern C++: ${params.title}\\n";
    return 0;
}`,
    },
    furtherReading: [
      {
        title: 'Modern C++ Programming (course slides)',
        href: 'https://federico-busato.github.io/Modern-CPP-Programming/',
        description: `Busato 課程投影片首頁；請參閱與「${params.topic}」相對應的章節。`,
      },
      {
        title: 'cppreference.com',
        href: 'https://en.cppreference.com/w/',
        description: '標準函式庫與語言特性的權威參考。',
      },
      ...(params.reading ?? []),
    ],
  };
}
