'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { kNavGroups } from '@/nav';
import { useStore } from '@/store';

function normalize(path: string): string {
  // Strip basePath and trailing slash so comparisons are stable.
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  let p = path;
  if (base && p.startsWith(base)) p = p.slice(base.length);
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p || '/';
}

export default function Sidebar() {
  const pathname = usePathname();
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const current = normalize(pathname ?? '/');

  if (collapsed) return null;

  return (
    <nav
      aria-label="章節導覽側邊欄"
      className="hidden w-72 shrink-0 overflow-y-auto border-r border-border bg-surface-raised px-3 py-5 md:block"
    >
      <ul className="space-y-6">
        {kNavGroups.map((group) => (
          <li key={group.id}>
            <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
              {group.heading}
            </h2>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = current === item.href;
                return (
                  <li key={item.slug}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-baseline gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                        active
                          ? 'bg-accent-soft font-medium text-accent'
                          : 'text-content hover:bg-surface'
                      }`}
                    >
                      {item.chapterLabel && (
                        <span className="shrink-0 font-mono text-xs text-content-muted">
                          {item.chapterLabel}
                        </span>
                      )}
                      <span>{item.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
