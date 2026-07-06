import type { StateCreator } from 'zustand';

/** Theme preference. `auto` follows the OS `prefers-color-scheme`. */
export type ThemeMode = 'dark' | 'light' | 'auto';
/** Reading text scale applied to the whole site. */
export type FontScale = 'small' | 'standard' | 'large';
/** Maximum width of the main reading column. */
export type ContentWidth = 'standard' | 'wide' | 'full';

/** User-tunable appearance & reading preferences persisted in localStorage. */
export interface Preferences {
  theme: ThemeMode;
  fontScale: FontScale;
  contentWidth: ContentWidth;
  codeWrap: boolean;
}

export const kDefaultPreferences: Preferences = {
  theme: 'dark',
  fontScale: 'standard',
  contentWidth: 'standard',
  codeWrap: false,
};

export interface UiSlice extends Preferences {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  settingsOpen: boolean;
  activeChapterSlug: string | null;
  toggleSidebar: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  /** Cycles dark → light → auto → dark, used by the quick toolbar button. */
  toggleTheme: () => void;
  setFontScale: (scale: FontScale) => void;
  setContentWidth: (width: ContentWidth) => void;
  setCodeWrap: (wrap: boolean) => void;
  setPreferences: (prefs: Partial<Preferences>) => void;
  resetPreferences: () => void;
  setActiveChapter: (slug: string | null) => void;
}

const kThemeCycle: Record<ThemeMode, ThemeMode> = {
  dark: 'light',
  light: 'auto',
  auto: 'dark',
};

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set) => ({
  ...kDefaultPreferences,
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  settingsOpen: false,
  activeChapterSlug: null,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

  setSettingsOpen: (open) => set({ settingsOpen: open }),

  setTheme: (theme) => set({ theme }),

  toggleTheme: () => set((state) => ({ theme: kThemeCycle[state.theme] })),

  setFontScale: (fontScale) => set({ fontScale }),

  setContentWidth: (contentWidth) => set({ contentWidth }),

  setCodeWrap: (codeWrap) => set({ codeWrap }),

  setPreferences: (prefs) => set({ ...prefs }),

  resetPreferences: () => set({ ...kDefaultPreferences }),

  setActiveChapter: (slug) => set({ activeChapterSlug: slug }),
});
