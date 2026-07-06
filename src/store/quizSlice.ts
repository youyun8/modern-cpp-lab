import type { StateCreator } from 'zustand';

export const kMaxQuizAttempts = 3;

/** Per-question attempt record for a single chapter. */
export interface QuestionAttempt {
  selectedOptionId: string | null;
  revealed: boolean;
  correct: boolean;
  attempts: number;
}

/** Attempt state keyed by chapter slug, then by question id. */
export type ChapterQuizState = Record<string, Record<string, QuestionAttempt>>;

export interface QuizSlice {
  quizByChapter: ChapterQuizState;
  selectAnswer: (chapterSlug: string, questionId: string, optionId: string) => void;
  submitAnswer: (chapterSlug: string, questionId: string, correctOptionId: string) => void;
  revealAnswer: (chapterSlug: string, questionId: string) => void;
  resetChapterQuiz: (chapterSlug: string) => void;
  getChapterScore: (chapterSlug: string) => { correct: number; total: number };
}

function ensureQuestion(
  state: ChapterQuizState,
  chapterSlug: string,
  questionId: string,
): QuestionAttempt {
  const chapter = state[chapterSlug] ?? {};
  return (
    chapter[questionId] ?? {
      selectedOptionId: null,
      revealed: false,
      correct: false,
      attempts: 0,
    }
  );
}

export const createQuizSlice: StateCreator<QuizSlice, [], [], QuizSlice> = (set, get) => ({
  quizByChapter: {},

  selectAnswer: (chapterSlug, questionId, optionId) =>
    set((state) => {
      const current = ensureQuestion(state.quizByChapter, chapterSlug, questionId);
      if (current.revealed && current.correct) return state;
      return {
        quizByChapter: {
          ...state.quizByChapter,
          [chapterSlug]: {
            ...state.quizByChapter[chapterSlug],
            // Picking a new option hides any previously revealed explanation so
            // the learner can resubmit cleanly.
            [questionId]: { ...current, selectedOptionId: optionId, revealed: false },
          },
        },
      };
    }),

  submitAnswer: (chapterSlug, questionId, correctOptionId) =>
    set((state) => {
      const current = ensureQuestion(state.quizByChapter, chapterSlug, questionId);
      if (current.selectedOptionId === null) return state;
      const correct = current.selectedOptionId === correctOptionId;
      return {
        quizByChapter: {
          ...state.quizByChapter,
          [chapterSlug]: {
            ...state.quizByChapter[chapterSlug],
            [questionId]: {
              ...current,
              revealed: true,
              correct,
              attempts: Math.min(current.attempts + 1, kMaxQuizAttempts),
            },
          },
        },
      };
    }),

  revealAnswer: (chapterSlug, questionId) =>
    set((state) => {
      const current = ensureQuestion(state.quizByChapter, chapterSlug, questionId);
      return {
        quizByChapter: {
          ...state.quizByChapter,
          [chapterSlug]: {
            ...state.quizByChapter[chapterSlug],
            [questionId]: { ...current, revealed: true },
          },
        },
      };
    }),

  resetChapterQuiz: (chapterSlug) =>
    set((state) => {
      const next = { ...state.quizByChapter };
      delete next[chapterSlug];
      return { quizByChapter: next };
    }),

  getChapterScore: (chapterSlug) => {
    const chapter = get().quizByChapter[chapterSlug] ?? {};
    const entries = Object.values(chapter);
    return {
      correct: entries.filter((q) => q.correct).length,
      total: entries.length,
    };
  },
});
