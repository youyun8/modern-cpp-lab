export interface QuizOption {
  id: string;
  /** Traditional Chinese answer text. */
  text: string;
}

export interface QuizQuestion {
  id: string;
  /** Traditional Chinese question stem. */
  stem: string;
  options: QuizOption[];
  correctOptionId: string;
  /**
   * One-sentence Traditional Chinese explanation shown after a wrong answer.
   * Should reference the relevant Busato slide, e.g. "參見 Ch.22 PDF 第 42 頁".
   */
  explanation: string;
}
