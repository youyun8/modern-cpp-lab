import type { QuizQuestion } from './QuizQuestion';
import type { DiagramSpec } from './DiagramProps';

export type CppStandard = 'C++11' | 'C++14' | 'C++17' | 'C++20' | 'C++23' | 'C++26';

/** A numbered callout mapped to the annotated code block. */
export interface CodeCallout {
  /** Callout marker number, matching a `// [n]` comment in the snippet. */
  n: number;
  /** Traditional Chinese legend text. */
  text: string;
}

export interface AnnotatedCode {
  lang: 'cpp' | 'bash';
  code: string;
  callouts: CodeCallout[];
}

export interface FurtherReadingLink {
  /** Anchor text; mirrors the English destination title when appropriate. */
  title: string;
  href: string;
  /** Traditional Chinese description of the link. */
  description: string;
}

export interface ConceptCard {
  standard: CppStandard;
  /** Core idea in <= 120 words of Traditional Chinese. */
  body: string;
}

/**
 * An in-depth section giving industrial-grade detail (mechanics, performance,
 * ABI, threading, standard-version nuances, etc.). Body supports lightweight
 * inline `code` spans delimited by backticks.
 */
export interface DeepDiveSection {
  /** Traditional Chinese section heading. */
  heading: string;
  /** Traditional Chinese body; may contain `inline code` in backticks and blank-line-separated paragraphs. */
  body: string;
}

export interface ChapterContent {
  /** ASCII kebab-case slug used in the URL path. */
  slug: string;
  /** Original Busato chapter label, e.g. "Ch.22". Omitted for lab pages. */
  chapterLabel?: string;
  /** Traditional Chinese page title. */
  title: string;
  /** Traditional Chinese sidebar group heading this page belongs to. */
  group: string;
  /** Traditional Chinese meta description for SEO. */
  description: string;
  concept: ConceptCard;
  /** Optional in-depth sections for industrial-grade coverage. */
  deepDive?: DeepDiveSection[];
  code: AnnotatedCode;
  /** Real-world pitfalls / gotchas (Traditional Chinese, may use `inline code`). */
  pitfalls?: string[];
  /** Best-practice recommendations (Traditional Chinese, may use `inline code`). */
  bestPractices?: string[];
  quiz: QuizQuestion[];
  diagram: DiagramSpec;
  tryIt: {
    /** Snippet loaded into the read-only CodeMirror editor + Godbolt link. */
    code: string;
  };
  furtherReading: FurtherReadingLink[];
  /** True for placeholder pages that still need full content. */
  isStub?: boolean;
}
