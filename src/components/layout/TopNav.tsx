'use client';

import Link from 'next/link';
import { useStore } from '@/store';
import { useDarkMode } from '@/hooks/useDarkMode';

export default function TopNav() {
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const setMobileMenuOpen = useStore((s) => s.setMobileMenuOpen);
  const { theme, toggleTheme } = useDarkMode();

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
      <button
        type="button"
        onClick={toggleTheme}
        className="rounded-md border border-border p-2 text-content hover:border-accent"
        aria-label={theme === 'dark' ? '切換至淺色主題' : '切換至深色主題'}
      >
        <span aria-hidden="true">{theme === 'dark' ? '☀' : '🌙'}</span>
      </button>
    </header>
  );
}
