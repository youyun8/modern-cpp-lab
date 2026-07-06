import type { CppStandard } from '@/types/ChapterContent';

const kBadgeColor: Record<CppStandard, string> = {
  'C++11': 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  'C++14': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
  'C++17': 'bg-teal-500/15 text-teal-300 border-teal-500/40',
  'C++20': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  'C++23': 'bg-violet-500/15 text-violet-300 border-violet-500/40',
  'C++26': 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40',
};

export default function StandardBadge({ standard }: { standard: CppStandard }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium ${kBadgeColor[standard]}`}
      aria-label={`C++ 標準版本 ${standard}`}
    >
      {standard}
    </span>
  );
}
