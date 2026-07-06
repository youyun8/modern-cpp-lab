import { create } from 'zustand';
import { createQuizSlice, type QuizSlice } from './quizSlice';
import { createUiSlice, type UiSlice } from './uiSlice';

export type StoreState = QuizSlice & UiSlice;

export const useStore = create<StoreState>()((...a) => ({
  ...createQuizSlice(...a),
  ...createUiSlice(...a),
}));
