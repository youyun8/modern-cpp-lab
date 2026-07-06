'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { useGodbolt } from '@/hooks/useGodbolt';

/**
 * Read-only "試試看" panel: shows the snippet in a CodeMirror 6 editor with a
 * copy button and a "在 Compiler Explorer 開啟" button that opens the code on
 * godbolt.org pre-configured with g++ 14.1 and the project flags.
 */
export default function TryItPanel({ code }: { code: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [copied, setCopied] = useState(false);
  const godboltUrl = useGodbolt(code);

  useEffect(() => {
    if (!hostRef.current) return;
    const state = EditorState.create({
      doc: code,
      extensions: [
        lineNumbers(),
        cpp(),
        oneDark,
        EditorView.editable.of(false),
        EditorState.readOnly.of(true),
        EditorView.lineWrapping,
      ],
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [code]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section aria-labelledby="tryit-heading" className="space-y-3">
      <h2 id="tryit-heading" className="text-lg font-semibold text-content">
        試試看
      </h2>
      <div
        ref={hostRef}
        className="overflow-hidden rounded-xl border border-border text-[13px]"
        aria-label="唯讀程式碼編輯器"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="rounded-md border border-border bg-surface-raised px-3 py-1.5 text-sm text-content hover:border-accent"
          aria-label="複製程式碼到剪貼簿"
        >
          {copied ? '已複製 ✓' : '複製程式碼'}
        </button>
        <a
          href={godboltUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          aria-label="在 Compiler Explorer（godbolt.org）開啟此程式碼"
        >
          在 Compiler Explorer 開啟
        </a>
      </div>
    </section>
  );
}
