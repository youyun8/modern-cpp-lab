'use client';

import { useEffect } from 'react';
import { useStore } from '@/store';
import type { ThemeMode } from '@/store/uiSlice';

const kThemeStorageKey = 'cpp-parallel-lab-theme';

/**
 * Syncs the Zustand theme with the <html> class list and localStorage.
 * Returns the current theme plus a toggle helper.
 */
export function useDarkMode(): { theme: ThemeMode; toggleTheme: () => void } {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const toggleTheme = useStore((s) => s.toggleTheme);

  useEffect(() => {
    const stored = window.localStorage.getItem(kThemeStorageKey) as
      | ThemeMode
      | null;
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored);
    }
  }, [setTheme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem(kThemeStorageKey, theme);
  }, [theme]);

  return { theme, toggleTheme };
}
