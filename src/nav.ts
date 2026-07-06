/**
 * Single source of truth for the sidebar structure, route slugs and
 * cross-referencing. Group headings and item titles are in Traditional Chinese.
 */

export interface NavItem {
  slug: string;
  /** Traditional Chinese title shown in the sidebar. */
  title: string;
  /** Busato chapter label, e.g. "Ch.22". Undefined for lab pages. */
  chapterLabel?: string;
  /** Route path relative to basePath. */
  href: string;
  /** Whether this page is a lab (deep-dive) page. */
  isLab?: boolean;
}

export interface NavGroup {
  id: string;
  /** Traditional Chinese group heading. */
  heading: string;
  items: NavItem[];
}

export const kNavGroups: NavGroup[] = [
  {
    id: 'foundations',
    heading: 'A · 基礎概念 Foundations',
    items: [
      { slug: 'ch01-introduction', chapterLabel: 'Ch.01', title: '導論', href: '/ch01-introduction' },
      { slug: 'ch02-preparation', chapterLabel: 'Ch.02', title: '環境準備', href: '/ch02-preparation' },
      { slug: 'ch03-basic-concepts-i', chapterLabel: 'Ch.03', title: '基本概念 I：型別系統', href: '/ch03-basic-concepts-i' },
      { slug: 'ch04-basic-concepts-ii', chapterLabel: 'Ch.04', title: '基本概念 II：整數型別', href: '/ch04-basic-concepts-ii' },
      { slug: 'ch05-basic-concepts-iii', chapterLabel: 'Ch.05', title: '基本概念 III：浮點數', href: '/ch05-basic-concepts-iii' },
      { slug: 'ch06-basic-concepts-iv', chapterLabel: 'Ch.06', title: '基本概念 IV：控制流程', href: '/ch06-basic-concepts-iv' },
      { slug: 'ch07-basic-concepts-v', chapterLabel: 'Ch.07', title: '基本概念 V：記憶體模型', href: '/ch07-basic-concepts-v' },
      { slug: 'ch08-basic-concepts-vi', chapterLabel: 'Ch.08', title: '基本概念 VI：函式與 Lambda', href: '/ch08-basic-concepts-vi' },
    ],
  },
  {
    id: 'oop-generic',
    heading: 'B · 物件導向與泛型程式設計',
    items: [
      { slug: 'ch09-oop-i', chapterLabel: 'Ch.09', title: 'OOP I：RAII 與建構子', href: '/ch09-oop-i' },
      { slug: 'ch10-oop-ii', chapterLabel: 'Ch.10', title: 'OOP II：多型與運算子重載', href: '/ch10-oop-ii' },
      { slug: 'ch11-templates-i', chapterLabel: 'Ch.11', title: '樣板 I：函式樣板與 Concepts', href: '/ch11-templates-i' },
      { slug: 'ch12-templates-ii', chapterLabel: 'Ch.12', title: '樣板 II：SFINAE 與可變參數', href: '/ch12-templates-ii' },
    ],
  },
  {
    id: 'build-conventions',
    heading: 'C · 建置系統與慣例',
    items: [
      { slug: 'ch13-translation-units-i', chapterLabel: 'Ch.13', title: '轉譯單元 I：連結與 ODR', href: '/ch13-translation-units-i' },
      { slug: 'ch14-translation-units-ii', chapterLabel: 'Ch.14', title: '轉譯單元 II：Modules', href: '/ch14-translation-units-ii' },
      { slug: 'ch15-code-conventions-i', chapterLabel: 'Ch.15', title: '程式慣例 I：專案結構', href: '/ch15-code-conventions-i' },
      { slug: 'ch16-code-conventions-ii', chapterLabel: 'Ch.16', title: '程式慣例 II：現代寫法', href: '/ch16-code-conventions-ii' },
      { slug: 'ch17-debugging-testing', chapterLabel: 'Ch.17', title: '除錯與測試', href: '/ch17-debugging-testing' },
      { slug: 'ch18-ecosystem', chapterLabel: 'Ch.18', title: '生態系與工具', href: '/ch18-ecosystem' },
    ],
  },
  {
    id: 'stl-utilities',
    heading: 'D · STL 與工具庫',
    items: [
      { slug: 'ch19-utilities', chapterLabel: 'Ch.19', title: '工具庫：span、format、variant', href: '/ch19-utilities' },
      { slug: 'ch20-containers-algorithms', chapterLabel: 'Ch.20', title: '容器與演算法', href: '/ch20-containers-algorithms' },
    ],
  },
  {
    id: 'advanced',
    heading: 'E · 進階 C++ ★',
    items: [
      { slug: 'ch21-advanced-i', chapterLabel: 'Ch.21', title: '進階主題 I：Move 語意', href: '/ch21-advanced-i' },
      { slug: 'ch22-advanced-ii', chapterLabel: 'Ch.22', title: '進階主題 II：並行程式設計', href: '/ch22-advanced-ii' },
    ],
  },
  {
    id: 'performance',
    heading: 'F · 效能最佳化 ★',
    items: [
      { slug: 'ch23-optimization-i', chapterLabel: 'Ch.23', title: '最佳化 I：架構與記憶體階層', href: '/ch23-optimization-i' },
      { slug: 'ch24-optimization-ii', chapterLabel: 'Ch.24', title: '最佳化 II：快取與分支預測', href: '/ch24-optimization-ii' },
      { slug: 'ch25-optimization-iii', chapterLabel: 'Ch.25', title: '最佳化 III：編譯器旗標與剖析', href: '/ch25-optimization-iii' },
    ],
  },
  {
    id: 'software-design',
    heading: 'G · 軟體設計與工具',
    items: [
      { slug: 'ch26-software-design-i', chapterLabel: 'Ch.26', title: '軟體設計 I：SOLID 與 GEMM', href: '/ch26-software-design-i' },
      { slug: 'ch27-software-design-ii', chapterLabel: 'Ch.27', title: '軟體設計 II：CRTP 與 PIMPL', href: '/ch27-software-design-ii' },
      { slug: 'ch28-binary-size', chapterLabel: 'Ch.28', title: '二進位檔大小', href: '/ch28-binary-size' },
      { slug: 'ch29-build-time', chapterLabel: 'Ch.29', title: '建置時間最佳化', href: '/ch29-build-time' },
    ],
  },
  {
    id: 'lab',
    heading: '平行化實驗室',
    items: [
      { slug: 'lab-memory-model', title: '記憶體模型', href: '/lab/memory-model', isLab: true },
      { slug: 'lab-lock-free', title: '無鎖資料結構', href: '/lab/lock-free', isLab: true },
      { slug: 'lab-parallel-stl', title: '平行 STL', href: '/lab/parallel-stl', isLab: true },
      { slug: 'lab-coroutines', title: '協程 Coroutines', href: '/lab/coroutines', isLab: true },
      { slug: 'lab-gpu-bridge', title: 'CPU–GPU 橋接', href: '/lab/gpu-bridge', isLab: true },
    ],
  },
];

export const kAllNavItems: NavItem[] = kNavGroups.flatMap((g) => g.items);

export function findNavItem(slug: string): NavItem | undefined {
  return kAllNavItems.find((i) => i.slug === slug);
}

export function getAdjacentNavItems(slug: string): {
  prev: NavItem | null;
  next: NavItem | null;
} {
  const idx = kAllNavItems.findIndex((i) => i.slug === slug);
  return {
    prev: idx > 0 ? kAllNavItems[idx - 1] : null,
    next: idx >= 0 && idx < kAllNavItems.length - 1 ? kAllNavItems[idx + 1] : null,
  };
}
