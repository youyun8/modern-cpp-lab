import type { StateCreator } from 'zustand';

export type ThemeMode = 'dark' | 'light';

export interface UiSlice {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  theme: ThemeMode;
  activeChapterSlug: string | null;
  toggleSidebar: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setActiveChapter: (slug: string | null) => void;
}

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set) => ({
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  theme: 'dark',
  activeChapterSlug: null,

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

  setTheme: (theme) => set({ theme }),

  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

  setActiveChapter: (slug) => set({ activeChapterSlug: slug }),
});
