'use client';

import { useEffect } from 'react';
import { useStore } from '@/store';
import {
  kDefaultPreferences,
  type Preferences,
  type ThemeMode,
} from '@/store/uiSlice';

/** Shared localStorage key + pre-paint script, imported by layout.tsx too. */
export const kSettingsStorageKey = 'cpp-parallel-lab-settings';

/** Resolves the effective light/dark scheme, expanding `auto` via the OS. */
export function resolveScheme(theme: ThemeMode): 'dark' | 'light' {
  if (theme === 'dark' || theme === 'light') return theme;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return 'dark';
}

/** Reflects the current preferences onto the <html> element. */
function applyPreferences(prefs: Preferences): void {
  const root = document.documentElement;
  root.classList.toggle('dark', resolveScheme(prefs.theme) === 'dark');
  root.dataset.readingText = prefs.fontScale;
  root.dataset.readingWidth = prefs.contentWidth;
  root.dataset.codeWrap = String(prefs.codeWrap);
}

/**
 * Central preferences syncer: hydrates from localStorage on mount, mirrors the
 * Zustand preference state onto <html> + localStorage, and keeps the `auto`
 * theme tracking the OS colour scheme live.
 */
export function useDarkMode(): void {
  const theme = useStore((s) => s.theme);
  const fontScale = useStore((s) => s.fontScale);
  const contentWidth = useStore((s) => s.contentWidth);
  const codeWrap = useStore((s) => s.codeWrap);
  const setPreferences = useStore((s) => s.setPreferences);

  // Hydrate from storage once, tolerating older/partial payloads.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(kSettingsStorageKey);
      if (raw) {
        const stored = JSON.parse(raw) as Partial<Preferences>;
        setPreferences({ ...kDefaultPreferences, ...stored });
      }
    } catch {
      /* ignore malformed storage */
    }
  }, [setPreferences]);

  // Persist + reflect on every change.
  useEffect(() => {
    const prefs: Preferences = { theme, fontScale, contentWidth, codeWrap };
    applyPreferences(prefs);
    try {
      window.localStorage.setItem(kSettingsStorageKey, JSON.stringify(prefs));
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [theme, fontScale, contentWidth, codeWrap]);

  // Keep `auto` in sync with live OS colour-scheme changes.
  useEffect(() => {
    if (theme !== 'auto' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () =>
      document.documentElement.classList.toggle('dark', media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);
}
