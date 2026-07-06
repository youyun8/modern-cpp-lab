/**
 * Single source of truth for the sidebar structure, route slugs and
 * cross-referencing. Group headings and item titles are in Traditional Chinese.
 */

export interface NavItem {
  slug: string;
  /** Traditional Chinese title shown in the sidebar. */
  title: string;
  /** Handbook chapter label, e.g. "第 22 章". Undefined for lab pages. */
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
    heading: '第 1 部：基礎概念 Foundations',
    items: [
      {
        slug: 'ch01-introduction',
        chapterLabel: '第 1 章',
        title: '導論',
        href: '/ch01-introduction',
      },
      {
        slug: 'ch02-preparation',
        chapterLabel: '第 2 章',
        title: '環境準備',
        href: '/ch02-preparation',
      },
      {
        slug: 'ch03-basic-concepts-i',
        chapterLabel: '第 3 章',
        title: '基本概念 I：型別系統',
        href: '/ch03-basic-concepts-i',
      },
      {
        slug: 'ch04-basic-concepts-ii',
        chapterLabel: '第 4 章',
        title: '基本概念 II：整數型別',
        href: '/ch04-basic-concepts-ii',
      },
      {
        slug: 'ch05-basic-concepts-iii',
        chapterLabel: '第 5 章',
        title: '基本概念 III：浮點數',
        href: '/ch05-basic-concepts-iii',
      },
      {
        slug: 'ch06-basic-concepts-iv',
        chapterLabel: '第 6 章',
        title: '基本概念 IV：控制流程',
        href: '/ch06-basic-concepts-iv',
      },
      {
        slug: 'ch07-basic-concepts-v',
        chapterLabel: '第 7 章',
        title: '基本概念 V：記憶體模型',
        href: '/ch07-basic-concepts-v',
      },
      {
        slug: 'ch08-basic-concepts-vi',
        chapterLabel: '第 8 章',
        title: '基本概念 VI：函式與 Lambda',
        href: '/ch08-basic-concepts-vi',
      },
    ],
  },
  {
    id: 'oop-generic',
    heading: '第 2 部：物件導向與泛型程式設計',
    items: [
      {
        slug: 'ch09-oop-i',
        chapterLabel: '第 9 章',
        title: 'OOP I：RAII 與建構子',
        href: '/ch09-oop-i',
      },
      {
        slug: 'ch10-oop-ii',
        chapterLabel: '第 10 章',
        title: 'OOP II：多型與運算子重載',
        href: '/ch10-oop-ii',
      },
      {
        slug: 'ch11-templates-i',
        chapterLabel: '第 11 章',
        title: '樣板 I：函式樣板與 Concepts',
        href: '/ch11-templates-i',
      },
      {
        slug: 'ch12-templates-ii',
        chapterLabel: '第 12 章',
        title: '樣板 II：SFINAE 與可變參數',
        href: '/ch12-templates-ii',
      },
    ],
  },
  {
    id: 'build-conventions',
    heading: '第 3 部：建置系統與慣例',
    items: [
      {
        slug: 'ch13-translation-units-i',
        chapterLabel: '第 13 章',
        title: '轉譯單元 I：連結與 ODR',
        href: '/ch13-translation-units-i',
      },
      {
        slug: 'ch14-translation-units-ii',
        chapterLabel: '第 14 章',
        title: '轉譯單元 II：Modules',
        href: '/ch14-translation-units-ii',
      },
      {
        slug: 'ch15-code-conventions-i',
        chapterLabel: '第 15 章',
        title: '程式慣例 I：專案結構',
        href: '/ch15-code-conventions-i',
      },
      {
        slug: 'ch16-code-conventions-ii',
        chapterLabel: '第 16 章',
        title: '程式慣例 II：現代寫法',
        href: '/ch16-code-conventions-ii',
      },
      {
        slug: 'ch17-debugging-testing',
        chapterLabel: '第 17 章',
        title: '除錯與測試',
        href: '/ch17-debugging-testing',
      },
      {
        slug: 'ch18-ecosystem',
        chapterLabel: '第 18 章',
        title: '生態系與工具',
        href: '/ch18-ecosystem',
      },
    ],
  },
  {
    id: 'stl-utilities',
    heading: '第 4 部：STL 與工具庫',
    items: [
      {
        slug: 'ch19-utilities',
        chapterLabel: '第 19 章',
        title: '工具庫：span、format、variant',
        href: '/ch19-utilities',
      },
      {
        slug: 'ch20-containers-algorithms',
        chapterLabel: '第 20 章',
        title: '容器與演算法',
        href: '/ch20-containers-algorithms',
      },
    ],
  },
  {
    id: 'advanced',
    heading: '第 5 部：進階 C++',
    items: [
      {
        slug: 'ch21-advanced-i',
        chapterLabel: '第 21 章',
        title: '進階主題 I：Move 語意',
        href: '/ch21-advanced-i',
      },
      {
        slug: 'ch22-advanced-ii',
        chapterLabel: '第 22 章',
        title: '進階主題 II：並行程式設計',
        href: '/ch22-advanced-ii',
      },
    ],
  },
  {
    id: 'performance',
    heading: '第 6 部：效能最佳化',
    items: [
      {
        slug: 'ch23-optimization-i',
        chapterLabel: '第 23 章',
        title: '最佳化 I：架構與記憶體階層',
        href: '/ch23-optimization-i',
      },
      {
        slug: 'ch24-optimization-ii',
        chapterLabel: '第 24 章',
        title: '最佳化 II：快取與分支預測',
        href: '/ch24-optimization-ii',
      },
      {
        slug: 'ch25-optimization-iii',
        chapterLabel: '第 25 章',
        title: '最佳化 III：編譯器旗標與剖析',
        href: '/ch25-optimization-iii',
      },
    ],
  },
  {
    id: 'software-design',
    heading: '第 7 部：軟體設計與工具',
    items: [
      {
        slug: 'ch26-software-design-i',
        chapterLabel: '第 26 章',
        title: '軟體設計 I：SOLID 與 GEMM',
        href: '/ch26-software-design-i',
      },
      {
        slug: 'ch27-software-design-ii',
        chapterLabel: '第 27 章',
        title: '軟體設計 II：CRTP 與 PIMPL',
        href: '/ch27-software-design-ii',
      },
      {
        slug: 'ch28-binary-size',
        chapterLabel: '第 28 章',
        title: '二進位檔大小',
        href: '/ch28-binary-size',
      },
      {
        slug: 'ch29-build-time',
        chapterLabel: '第 29 章',
        title: '建置時間最佳化',
        href: '/ch29-build-time',
      },
    ],
  },
  {
    id: 'industrial-foundations',
    heading: '第 8 部：先修與心智模型',
    items: [
      {
        slug: 'ind01-why-parallel-roofline',
        chapterLabel: '第 30 章',
        title: '為何平行、效能的上限在哪',
        href: '/ind01-why-parallel-roofline',
      },
      {
        slug: 'ind02-hardware-reality',
        chapterLabel: '第 31 章',
        title: '硬體現實：NUMA、快取一致性與弱記憶體',
        href: '/ind02-hardware-reality',
      },
      {
        slug: 'ind03-concurrency-vs-parallelism',
        chapterLabel: '第 32 章',
        title: '並行 vs 平行、任務 vs 資料平行',
        href: '/ind03-concurrency-vs-parallelism',
      },
    ],
  },
  {
    id: 'industrial-memory-model',
    heading: '第 9 部：C++ 記憶體模型與原子操作',
    items: [
      {
        slug: 'ind04-data-races-memory-model',
        chapterLabel: '第 33 章',
        title: '資料競爭與 C++ 記憶體模型',
        href: '/ind04-data-races-memory-model',
      },
      {
        slug: 'ind05-atomics-memory-order',
        chapterLabel: '第 34 章',
        title: 'std::atomic 與記憶體序',
        href: '/ind05-atomics-memory-order',
      },
      {
        slug: 'ind06-weak-memory-fences',
        chapterLabel: '第 35 章',
        title: '進階記憶體序與弱記憶體',
        href: '/ind06-weak-memory-fences',
      },
    ],
  },
  {
    id: 'industrial-threads-sync',
    heading: '第 10 部：執行緒與同步',
    items: [
      {
        slug: 'ind07-thread-lifecycle',
        chapterLabel: '第 36 章',
        title: '執行緒生命週期',
        href: '/ind07-thread-lifecycle',
      },
      {
        slug: 'ind08-mutex-locks',
        chapterLabel: '第 37 章',
        title: '互斥與鎖',
        href: '/ind08-mutex-locks',
      },
      {
        slug: 'ind09-condvar-cpp20-sync',
        chapterLabel: '第 38 章',
        title: '條件變數與 C++20 新同步原語',
        href: '/ind09-condvar-cpp20-sync',
      },
    ],
  },
  {
    id: 'industrial-lock-free',
    heading: '第 11 部：無鎖與並行資料結構',
    items: [
      {
        slug: 'ind10-lock-free-basics',
        chapterLabel: '第 39 章',
        title: '無鎖程式設計基礎',
        href: '/ind10-lock-free-basics',
      },
      {
        slug: 'ind11-safe-memory-reclamation',
        chapterLabel: '第 40 章',
        title: '安全記憶體回收',
        href: '/ind11-safe-memory-reclamation',
      },
      {
        slug: 'ind12-concurrent-containers',
        chapterLabel: '第 41 章',
        title: '並行容器實作',
        href: '/ind12-concurrent-containers',
      },
    ],
  },
  {
    id: 'industrial-high-level',
    heading: '第 12 部：高階平行抽象',
    items: [
      {
        slug: 'ind13-async-future-promise',
        chapterLabel: '第 42 章',
        title: 'std::async／future／promise 與其侷限',
        href: '/ind13-async-future-promise',
      },
      {
        slug: 'ind14-parallel-stl',
        chapterLabel: '第 43 章',
        title: '平行 STL 演算法（C++17）',
        href: '/ind14-parallel-stl',
      },
      {
        slug: 'ind15-coroutines',
        chapterLabel: '第 44 章',
        title: '協程（C++20）',
        href: '/ind15-coroutines',
      },
      {
        slug: 'ind16-senders-receivers',
        chapterLabel: '第 45 章',
        title: 'Senders/Receivers 與 std::execution',
        href: '/ind16-senders-receivers',
      },
    ],
  },
  {
    id: 'industrial-simd',
    heading: '第 13 部：資料平行與向量化',
    items: [
      {
        slug: 'ind17-std-simd',
        chapterLabel: '第 46 章',
        title: 'std::simd（C++26, P1928）',
        href: '/ind17-std-simd',
      },
      {
        slug: 'ind18-vectorization-friendly-code',
        chapterLabel: '第 47 章',
        title: '對編譯器與 CPU 友善的程式碼',
        href: '/ind18-vectorization-friendly-code',
      },
    ],
  },
  {
    id: 'industrial-perf-eng',
    heading: '第 14 部：效能工程',
    items: [
      {
        slug: 'ind19-measurement-profiling',
        chapterLabel: '第 48 章',
        title: '量測與剖析',
        href: '/ind19-measurement-profiling',
      },
      {
        slug: 'ind20-memory-numa-optimization',
        chapterLabel: '第 49 章',
        title: '記憶體與 NUMA 優化',
        href: '/ind20-memory-numa-optimization',
      },
      {
        slug: 'ind21-thread-pools-scheduling',
        chapterLabel: '第 50 章',
        title: '執行緒池與任務排程',
        href: '/ind21-thread-pools-scheduling',
      },
      {
        slug: 'ind22-reproducible-benchmarking',
        chapterLabel: '第 51 章',
        title: '效能可重現性與基準紀律',
        href: '/ind22-reproducible-benchmarking',
      },
    ],
  },
  {
    id: 'industrial-correctness',
    heading: '第 15 部：正確性、測試與除錯',
    items: [
      {
        slug: 'ind23-catching-concurrency-bugs',
        chapterLabel: '第 52 章',
        title: '並行 bug 的捕捉',
        href: '/ind23-catching-concurrency-bugs',
      },
      {
        slug: 'ind24-exception-safety-resource-mgmt',
        chapterLabel: '第 53 章',
        title: '例外安全與資源管理',
        href: '/ind24-exception-safety-resource-mgmt',
      },
    ],
  },
  {
    id: 'industrial-numerics',
    heading: '第 16 部：數值核心與可重現性',
    items: [
      {
        slug: 'ind25-floating-point-reduction-reproducibility',
        chapterLabel: '第 54 章',
        title: '浮點、歸約與可重現性',
        href: '/ind25-floating-point-reduction-reproducibility',
      },
      {
        slug: 'ind26-mdspan-linalg',
        chapterLabel: '第 55 章',
        title: 'std::mdspan 與 std::linalg',
        href: '/ind26-mdspan-linalg',
      },
    ],
  },
  {
    id: 'industrial-heterogeneous',
    heading: '第 17 部：異質運算',
    items: [
      {
        slug: 'ind27-offloading-data-movement',
        chapterLabel: '第 56 章',
        title: 'Offloading 模型與資料搬移成本',
        href: '/ind27-offloading-data-movement',
      },
      {
        slug: 'ind28-portable-heterogeneous-convergence',
        chapterLabel: '第 57 章',
        title: '可攜異質程式設計的收斂趨勢',
        href: '/ind28-portable-heterogeneous-convergence',
      },
    ],
  },
  {
    id: 'industrial-architecture',
    heading: '第 18 部：架構、樣式與整合',
    items: [
      {
        slug: 'ind29-parallel-design-patterns',
        chapterLabel: '第 58 章',
        title: '並行設計樣式',
        href: '/ind29-parallel-design-patterns',
      },
      {
        slug: 'ind30-openmp-mpi-interop',
        chapterLabel: '第 59 章',
        title: '與 OpenMP／MPI 的分工與互操作',
        href: '/ind30-openmp-mpi-interop',
      },
    ],
  },
  {
    id: 'industrial-capstone',
    heading: '第 19 部：綜合實戰',
    items: [
      {
        slug: 'ind31-capstone-project',
        chapterLabel: '第 60 章',
        title: '綜合專案 Capstone',
        href: '/ind31-capstone-project',
      },
    ],
  },
  {
    id: 'cpp20-features',
    heading: '第 20 部：C++20 語言與工具庫新特性',
    items: [
      {
        slug: 'ind32-ranges-views',
        chapterLabel: '第 61 章',
        title: 'Ranges 與 Views（C++20）',
        href: '/ind32-ranges-views',
      },
      {
        slug: 'ind33-concepts-requires',
        chapterLabel: '第 62 章',
        title: 'Concepts 與 requires（C++20）',
        href: '/ind33-concepts-requires',
      },
      {
        slug: 'ind34-three-way-comparison',
        chapterLabel: '第 63 章',
        title: '三向比較與預設比較（C++20）',
        href: '/ind34-three-way-comparison',
      },
      {
        slug: 'ind35-cpp20-utility-updates',
        chapterLabel: '第 64 章',
        title: 'C++20 工具庫更新：chrono、bit、source_location',
        href: '/ind35-cpp20-utility-updates',
      },
    ],
  },
  {
    id: 'industrial-appendix',
    heading: '附錄',
    items: [
      {
        slug: 'appendix-a-feature-timeline',
        chapterLabel: '附錄 A',
        title: 'C++11→C++26 並行特性年表',
        href: '/appendix-a-feature-timeline',
      },
      {
        slug: 'appendix-b-tool-cheatsheet',
        chapterLabel: '附錄 B',
        title: '工具速查',
        href: '/appendix-b-tool-cheatsheet',
      },
      {
        slug: 'appendix-c-ub-antipatterns',
        chapterLabel: '附錄 C',
        title: '反面教材集',
        href: '/appendix-c-ub-antipatterns',
      },
      {
        slug: 'appendix-d-references',
        chapterLabel: '附錄 D',
        title: '參考書目與標準提案',
        href: '/appendix-d-references',
      },
    ],
  },
  {
    id: 'lab',
    heading: '實驗室',
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
