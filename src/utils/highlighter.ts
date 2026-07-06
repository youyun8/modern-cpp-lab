import { createHighlighter, type Highlighter } from 'shiki';
import type { AnnotatedCode } from '@/types/ChapterContent';

// Cache a single highlighter instance across the whole build. Only the
// grammars/themes we actually use are loaded, keeping per-page cost low.
let highlighterPromise: Promise<Highlighter> | null = null;

export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: ['cpp', 'bash'],
    });
  }
  return highlighterPromise;
}

export interface HighlightedCode {
  dark: string;
  light: string;
}

/** Highlights a snippet at build time, returning dark + light markup. */
export async function highlightCode(code: AnnotatedCode): Promise<HighlightedCode> {
  const highlighter = await getHighlighter();
  return {
    dark: highlighter.codeToHtml(code.code, { lang: code.lang, theme: 'github-dark' }),
    light: highlighter.codeToHtml(code.code, { lang: code.lang, theme: 'github-light' }),
  };
}
