'use client';

import { useStore } from '@/store';
import type { QuestionAttempt } from '@/store/quizSlice';

const kEmptyAttempt: QuestionAttempt = {
  selectedOptionId: null,
  revealed: false,
  correct: false,
  attempts: 0,
};

export interface UseQuizResult {
  getAttempt: (questionId: string) => QuestionAttempt;
  select: (questionId: string, optionId: string) => void;
  submit: (questionId: string, correctOptionId: string) => void;
  reveal: (questionId: string) => void;
  reset: () => void;
  score: { correct: number; total: number };
}

/** Chapter-scoped wrapper around the quiz slice. */
export function useQuiz(chapterSlug: string): UseQuizResult {
  const quizByChapter = useStore((s) => s.quizByChapter);
  const selectAnswer = useStore((s) => s.selectAnswer);
  const submitAnswer = useStore((s) => s.submitAnswer);
  const revealAnswer = useStore((s) => s.revealAnswer);
  const resetChapterQuiz = useStore((s) => s.resetChapterQuiz);

  const chapter = quizByChapter[chapterSlug] ?? {};
  const entries = Object.values(chapter);

  return {
    getAttempt: (questionId) => chapter[questionId] ?? kEmptyAttempt,
    select: (questionId, optionId) =>
      selectAnswer(chapterSlug, questionId, optionId),
    submit: (questionId, correctOptionId) =>
      submitAnswer(chapterSlug, questionId, correctOptionId),
    reveal: (questionId) => revealAnswer(chapterSlug, questionId),
    reset: () => resetChapterQuiz(chapterSlug),
    score: {
      correct: entries.filter((q) => q.correct).length,
      total: entries.length,
    },
  };
}
