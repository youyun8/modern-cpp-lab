'use client';

import type { QuizQuestion } from '@/types/QuizQuestion';
import { useQuiz } from '@/hooks/useQuiz';

interface QuizPanelProps {
  chapterSlug: string;
  questions: QuizQuestion[];
}

const kOptionLabels = ['A', 'B', 'C', 'D', 'E'];

export default function QuizPanel({ chapterSlug, questions }: QuizPanelProps) {
  const quiz = useQuiz(chapterSlug);

  if (questions.length === 0) return null;

  return (
    <section aria-labelledby="quiz-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="quiz-heading" className="text-lg font-semibold text-content">
          互動測驗
        </h2>
        <span className="text-sm text-content-muted" aria-live="polite">
          得分 {quiz.score.correct} / {questions.length}
        </span>
      </div>

      <ol className="space-y-5">
        {questions.map((q, qi) => {
          const attempt = quiz.getAttempt(q.id);
          const answeredCorrectly = attempt.revealed && attempt.correct;
          return (
            <li key={q.id} className="rounded-xl border border-border bg-surface-raised p-4">
              <p className="mb-3 font-medium text-content">
                {qi + 1}. {q.stem}
              </p>
              <div role="radiogroup" aria-label={`第 ${qi + 1} 題選項`} className="space-y-2">
                {q.options.map((opt, oi) => {
                  const selected = attempt.selectedOptionId === opt.id;
                  const isCorrect = q.correctOptionId === opt.id;
                  let state = 'border-border bg-surface hover:border-accent';
                  if (attempt.revealed) {
                    if (isCorrect) state = 'border-emerald-500 bg-emerald-500/10';
                    else if (selected) state = 'border-red-500 bg-red-500/10';
                  } else if (selected) {
                    state = 'border-accent bg-accent-soft';
                  }
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={answeredCorrectly}
                      onClick={() => quiz.select(q.id, opt.id)}
                      className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm text-content transition-colors ${state} disabled:cursor-not-allowed`}
                    >
                      <span className="font-mono text-content-muted">{kOptionLabels[oi]}.</span>
                      <span>{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {attempt.revealed && (
                <p
                  role="alert"
                  className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                    attempt.correct
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : 'bg-red-500/10 text-red-300'
                  }`}
                >
                  {attempt.correct ? '答對了！' : q.explanation}
                </p>
              )}

              <div className="mt-3 flex gap-2">
                {!answeredCorrectly && (
                  <button
                    type="button"
                    onClick={() => quiz.submit(q.id, q.correctOptionId)}
                    disabled={!attempt.selectedOptionId}
                    className="rounded-md bg-accent px-3 py-1 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
                    aria-label={`送出第 ${qi + 1} 題答案`}
                  >
                    查看解析
                  </button>
                )}
                {attempt.revealed && !attempt.correct && (
                  <button
                    type="button"
                    onClick={() => quiz.select(q.id, '')}
                    className="rounded-md border border-border px-3 py-1 text-sm text-content hover:border-accent"
                    aria-label={`重新作答第 ${qi + 1} 題`}
                  >
                    重新作答
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={quiz.reset}
        className="text-sm text-content-muted underline hover:text-content"
        aria-label="重設本章所有測驗作答"
      >
        重設整章測驗
      </button>
    </section>
  );
}
