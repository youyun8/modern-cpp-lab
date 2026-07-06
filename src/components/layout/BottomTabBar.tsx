'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store';

const kTabs = [
  { href: '/', label: '首頁', icon: '⌂' },
  { href: '/ch22-advanced-ii', label: '並行', icon: '⇉' },
  { href: '/ch23-optimization-i', label: '效能', icon: '⚡' },
  { href: '/lab/parallel-stl', label: '實驗室', icon: '🧪' },
];

/** Compact bottom navigation shown under the 480px breakpoint. */
export default function BottomTabBar() {
  const pathname = usePathname() ?? '/';
  const setMobileMenuOpen = useStore((s) => s.setMobileMenuOpen);

  return (
    <nav
      aria-label="底部快速導覽"
      className="fixed bottom-0 left-0 right-0 z-30 flex h-14 items-stretch border-t border-border bg-surface-raised min-[480px]:hidden"
    >
      {kTabs.map((tab) => {
        const active = pathname.endsWith(tab.href) || pathname.endsWith(tab.href + '/');
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs ${
              active ? 'text-accent' : 'text-content-muted'
            }`}
          >
            <span aria-hidden="true" className="text-base">
              {tab.icon}
            </span>
            {tab.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs text-content-muted"
        aria-label="開啟完整導覽選單"
      >
        <span aria-hidden="true" className="text-base">
          ☰
        </span>
        選單
      </button>
    </nav>
  );
}
