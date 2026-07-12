import Link from 'next/link';
import { kNavGroups } from '@/nav';

const kFeatured = [
  {
    href: '/ch22-advanced-ii',
    label: '第 22 章',
    title: '並行程式設計',
    desc: 'std::thread、mutex、atomic 與 memory_order，配合動畫時間軸理解互斥。',
  },
  {
    href: '/ch23-optimization-i',
    label: '第 23 章',
    title: '架構與記憶體階層',
    desc: 'Amdahl／Gustafson 定律、SIMD、快取一致性與記憶體延遲階梯。',
  },
  {
    href: '/lab/parallel-stl',
    label: 'Lab',
    title: '平行 STL',
    desc: 'std::execution 策略（seq／par／par_unseq／unseq）與 transform_reduce。',
  },
  {
    href: '/lab/memory-model',
    label: 'Lab',
    title: 'C++ 記憶體模型',
    desc: 'happens-before、acquire／release、seq_cst 與訊息傳遞範例。',
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-12 pb-16">
      <section className="space-y-4">
        <p className="font-mono text-sm text-accent">Modern C++ Lab</p>
        <h1 className="text-3xl font-bold text-content sm:text-4xl">Modern C++ Lab</h1>
        <p className="max-w-2xl text-[15px] leading-7 text-content-muted">
          本網站以 Federico Busato 的「Modern C++ Programming」課程為藍本，整理成連續的 60
          章手冊，並以<strong className="text-content">平行化、並行與效能最佳化</strong>
          為編輯重心。每一章皆包含概念卡片、標註程式碼、互動測驗、視覺圖表、可複製的「試試看」面板，以及延伸閱讀。
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/ch22-advanced-ii"
            className="rounded-lg bg-accent px-4 py-2 font-medium text-white hover:opacity-90"
          >
            從並行程式設計開始
          </Link>
          <Link
            href="/lab/parallel-stl"
            className="rounded-lg border border-border px-4 py-2 font-medium text-content hover:border-accent"
          >
            進入平行化實驗室
          </Link>
        </div>
      </section>

      <section aria-labelledby="featured-heading" className="space-y-4">
        <h2 id="featured-heading" className="text-xl font-semibold text-content">
          精選單元
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {kFeatured.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group rounded-xl border border-border bg-surface-raised p-5 transition-colors hover:border-accent"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-xs text-white">
                  {f.label}
                </span>
                <span className="font-semibold text-content group-hover:text-accent">
                  {f.title}
                </span>
              </div>
              <p className="text-sm text-content-muted">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="toc-heading" className="space-y-4">
        <h2 id="toc-heading" className="text-xl font-semibold text-content">
          手冊地圖
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {kNavGroups.map((group) => (
            <div key={group.id} className="rounded-xl border border-border p-4">
              <h3 className="mb-2 text-sm font-semibold text-content-muted">{group.heading}</h3>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={item.href}
                      className="flex items-baseline gap-2 text-sm text-content hover:text-accent"
                    >
                      {item.chapterLabel && (
                        <span className="font-mono text-xs text-content-muted">
                          {item.chapterLabel}
                        </span>
                      )}
                      <span>{item.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
