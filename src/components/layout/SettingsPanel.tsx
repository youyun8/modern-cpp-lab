'use client';

import { useEffect } from 'react';
import { useStore } from '@/store';
import { resolveScheme } from '@/hooks/useDarkMode';
import type {
  ContentWidth,
  FontScale,
  ThemeMode,
} from '@/store/uiSlice';

interface Option<T> {
  value: T;
  label: string;
  description: string;
}

const themeOptions: Option<ThemeMode>[] = [
  { value: 'auto', label: '跟隨系統', description: '依作業系統目前的外觀自動切換。' },
  { value: 'light', label: '淺色', description: '固定使用淺色介面。' },
  { value: 'dark', label: '深色', description: '固定使用深色介面。' },
];

const widthOptions: Option<ContentWidth>[] = [
  { value: 'standard', label: '標準', description: '較集中的閱讀寬度，適合逐章閱讀。' },
  { value: 'wide', label: '寬', description: '放寬內容寬度，適合表格與大螢幕。' },
  { value: 'full', label: '全幅', description: '內容填滿可用寬度，適合超寬螢幕。' },
];

const fontOptions: Option<FontScale>[] = [
  { value: 'small', label: '小', description: '提高資訊密度，適合快速掃讀。' },
  { value: 'standard', label: '標準', description: '使用預設文字大小。' },
  { value: 'large', label: '大', description: '放大文字，適合長時間閱讀。' },
];

function OptionGroup<T extends string>({
  options,
  current,
  onSelect,
}: {
  options: Option<T>[];
  current: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((opt) => {
        const active = opt.value === current;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(opt.value)}
            className={`flex flex-col rounded-lg border p-3 text-left transition ${
              active
                ? 'border-accent bg-accent-soft'
                : 'border-border hover:border-accent'
            }`}
          >
            <span className="text-sm font-semibold text-content">{opt.label}</span>
            <span className="mt-0.5 text-xs text-content-muted">
              {opt.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function SettingsPanel() {
  const open = useStore((s) => s.settingsOpen);
  const setOpen = useStore((s) => s.setSettingsOpen);
  const theme = useStore((s) => s.theme);
  const fontScale = useStore((s) => s.fontScale);
  const contentWidth = useStore((s) => s.contentWidth);
  const codeWrap = useStore((s) => s.codeWrap);
  const setTheme = useStore((s) => s.setTheme);
  const setFontScale = useStore((s) => s.setFontScale);
  const setContentWidth = useStore((s) => s.setContentWidth);
  const setCodeWrap = useStore((s) => s.setCodeWrap);
  const resetPreferences = useStore((s) => s.resetPreferences);

  // Close on Escape while the panel is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open) return null;

  const effective = resolveScheme(theme) === 'dark' ? '深色' : '淺色';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={() => setOpen(false)}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="偏好設定"
        className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-surface-raised shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-bold text-content">偏好設定</h2>
            <p className="mt-1 text-xs text-content-muted">
              調整外觀與閱讀偏好，設定會保存在此瀏覽器。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-border p-2 text-content hover:border-accent"
            aria-label="關閉設定"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </header>

        <div className="space-y-7 p-5">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-content">色彩主題</h3>
            <p className="text-xs text-content-muted">
              目前實際顯示：{effective}。
            </p>
            <OptionGroup
              options={themeOptions}
              current={theme}
              onSelect={setTheme}
            />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-content">文字大小</h3>
            <OptionGroup
              options={fontOptions}
              current={fontScale}
              onSelect={setFontScale}
            />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-content">內容寬度</h3>
            <OptionGroup
              options={widthOptions}
              current={contentWidth}
              onSelect={setContentWidth}
            />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-content">程式碼</h3>
            <label className="flex items-center gap-3 rounded-lg border border-border p-3">
              <input
                type="checkbox"
                checked={codeWrap}
                onChange={(e) => setCodeWrap(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              <span className="text-sm text-content">
                程式碼過寬時自動換行
                <span className="block text-xs text-content-muted">
                  避免水平捲動，適合窄螢幕閱讀。
                </span>
              </span>
            </label>
          </section>

          <button
            type="button"
            onClick={resetPreferences}
            className="w-full rounded-lg border border-border p-3 text-sm text-content-muted hover:border-accent hover:text-content"
          >
            回復預設值
          </button>
        </div>
      </aside>
    </div>
  );
}
