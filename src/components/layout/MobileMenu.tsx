'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { kNavGroups } from '@/nav';
import { useStore } from '@/store';

/** Full-screen slide-over navigation shown under the 768px breakpoint. */
export default function MobileMenu() {
  const open = useStore((s) => s.mobileMenuOpen);
  const setOpen = useStore((s) => s.setMobileMenuOpen);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="行動裝置導覽選單">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <nav className="absolute left-0 top-0 h-full w-4/5 max-w-xs overflow-y-auto bg-surface-raised px-4 py-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-bold text-content">章節導覽</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-border p-1.5 text-content"
            aria-label="關閉導覽選單"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <ul className="space-y-5">
          {kNavGroups.map((group) => (
            <li key={group.id}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
                {group.heading}
              </h2>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={item.href}
                      className="flex items-baseline gap-2 rounded-md px-2 py-1.5 text-sm text-content hover:bg-surface"
                    >
                      {item.chapterLabel && (
                        <span className="shrink-0 font-mono text-xs text-content-muted">
                          {item.chapterLabel}
                        </span>
                      )}
                      <span>{item.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
