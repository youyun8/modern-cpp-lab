'use client';

import Link from 'next/link';
import { useStore } from '@/store';
import type { ThemeMode } from '@/store/uiSlice';

const kThemeGlyph: Record<ThemeMode, string> = {
  dark: '🌙',
  light: '☀',
  auto: '🖥',
};

const kThemeLabel: Record<ThemeMode, string> = {
  dark: '深色',
  light: '淺色',
  auto: '系統',
};

export default function TopNav() {
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const setMobileMenuOpen = useStore((s) => s.setMobileMenuOpen);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface-raised px-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="rounded-md border border-border p-2 text-content hover:border-accent md:hidden"
          aria-label="開啟導覽選單"
        >
          <span aria-hidden="true">☰</span>
        </button>
        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden rounded-md border border-border p-2 text-content hover:border-accent md:block"
          aria-label="收合或展開側邊欄"
        >
          <span aria-hidden="true">⇤</span>
        </button>
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-base font-bold text-content">現代 C++ 平行程式設計</span>
          <span className="hidden text-xs text-content-muted sm:inline">
            Modern C++ · Parallelism Lab
          </span>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-2 text-sm text-content hover:border-accent"
          aria-label={`色彩主題：${kThemeLabel[theme]}（點擊循環切換）`}
          title={`色彩主題：${kThemeLabel[theme]}`}
        >
          <span aria-hidden="true">{kThemeGlyph[theme]}</span>
          <span className="hidden sm:inline">{kThemeLabel[theme]}</span>
        </button>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-2 text-sm text-content hover:border-accent"
          aria-label="開啟偏好設定"
          aria-haspopup="dialog"
        >
          <span aria-hidden="true">⚙</span>
          <span className="hidden sm:inline">設定</span>
        </button>
      </div>
    </header>
  );
}
