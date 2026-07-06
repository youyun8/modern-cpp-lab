import type { ChapterContent } from '@/types/ChapterContent';

const ch29BuildTime: ChapterContent = {
  slug: 'ch29-build-time',
  chapterLabel: 'Ch.29',
  title: '建置時間最佳化',
  group: 'G · 軟體設計與工具',
  description:
    'Precompiled headers、unity build、ThinLTO 與 include-what-you-use：如何縮短大型 C++ 專案的編譯時間。',
  concept: {
    standard: 'C++23',
    body:
      '大型 C++ 專案的建置時間常成為生產力瓶頸，根源多在標頭：每個轉譯單元都重新解析大量被包含的標頭。緩解手段包括：預先編譯標頭（PCH）把常用且穩定的標頭編譯一次重複使用；unity build（jumbo build）把多個 .cpp 合併為一個以攤平標頭解析與啟動成本，但會降低增量建置的細緻度；include-what-you-use（IWYU）與前置宣告減少不必要的 #include；把定義移出標頭、善用 PIMPL 以切斷相依；以 ccache 快取編譯結果避免重複工作。連結階段可用 ThinLTO——比完整 LTO 更可平行、增量的連結期最佳化，兼顧建置速度與最佳化效果。務必先量測（如 -ftime-trace）找出真正的瓶頸，再對症下藥。',
  },
  code: {
    lang: 'bash',
    code: `# 預先編譯標頭（PCH）：把穩定的重量級標頭編譯一次
g++ -std=c++23 -x c++-header pch.hpp -o pch.hpp.gch       # [1]
g++ -std=c++23 -include pch.hpp -c a.cpp -o a.o           # [2]

# 以 ccache 快取編譯結果，避免重複編譯相同輸入
export CXX="ccache g++"                                    # [3]

# ThinLTO：可平行、增量的連結期最佳化
clang++ -std=c++23 -O2 -flto=thin a.cpp b.cpp -o app      # [4]

# 量測編譯時間分佈，找出真正的瓶頸（Clang）
clang++ -std=c++23 -ftime-trace -c heavy.cpp              # [5]`,
    callouts: [
      { n: 1, text: 'PCH 把常用且穩定的標頭預先編譯成 .gch，後續單元重用其結果，省去重複解析。' },
      { n: 2, text: '-include pch.hpp 讓每個單元自動套用預編譯標頭，通常可顯著縮短編譯時間。' },
      { n: 3, text: 'ccache 依輸入內容雜湊快取目的檔；輸入未變時直接命中，避免重編。' },
      { n: 4, text: '-flto=thin 是 ThinLTO：相較完整 LTO 更可平行且增量，兼顧速度與最佳化。' },
      { n: 5, text: '-ftime-trace 產生可在瀏覽器檢視的編譯時間分佈，精準定位最耗時的標頭與樣板。' },
    ],
  },
  deepDive: [
    {
      heading: '找出編譯瓶頸：-ftime-trace 與相依',
      body:
        'Clang 的 `-ftime-trace` 產生可在瀏覽器檢視的編譯時間分佈，精準指出最耗時的標頭與樣板實例化。多數瓶頸來自被大量傳遞包含的重量級標頭（如 `<iostream>`、大型第三方標頭）。\n\n前置宣告與 PIMPL 可把實作細節從標頭移出，形成編譯防火牆，讓改動不觸發大範圍重編。先量測、再針對最貴的相依動手。',
    },
    {
      heading: '建置基礎設施',
      body:
        '`ccache` 依輸入雜湊快取目的檔，重建時直接命中；Ninja 提供快速且高度平行的建置；分散式建置（distcc／icecc）把編譯工作分攤到多台機器。unity build 合併多檔以攤平標頭解析成本，加快完整建置，但犧牲增量建置的細緻度。\n\n這些手段可組合：例如 Ninja + ccache 是常見的高效組合。',
    },
    {
      heading: '模組與樣板成本',
      body:
        'C++20 Modules 與 `import std;`（C++23）從根本消除重複解析標頭，是編譯時間的長期解方，但需工具鏈與建置系統支援。預先編譯標頭（PCH）是過渡方案，需注意失效與相依管理。\n\n樣板實例化本身成本高；把與型別無關的邏輯抽到非樣板函式、以 `extern template` 集中實例化，能同時降低編譯時間與二進位體積。',
    },
  ],
  pitfalls: [
    '重量級標頭經由間接包含被大量傳遞，拖慢整體編譯。',
    'unity build 雖加快完整建置，卻嚴重拖慢日常的增量重建。',
    '預先編譯標頭（PCH）失效或相依管理不當，產生難解的建置錯誤。',
    '在標頭中隨手 `#include <iostream>` 等重量級標頭，成本擴散到所有引用者。',
  ],
  bestPractices: [
    '以 `-ftime-trace` 定位最耗時的標頭與樣板，再針對性優化。',
    '以前置宣告與 PIMPL 建立編譯防火牆，縮小重編範圍。',
    '採用 `ccache` + Ninja（必要時加分散式建置）加速。',
    '評估導入 Modules／`import std;`；以 `extern template` 集中樣板實例化。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '大型 C++ 專案編譯緩慢，最常見的根本原因是什麼？',
      options: [
        { id: 'a', text: 'CPU 時脈太低' },
        { id: 'b', text: '每個轉譯單元都重新解析大量被 #include 的標頭' },
        { id: 'c', text: '原始碼檔案命名不一致' },
        { id: 'd', text: '使用了太多 constexpr' },
      ],
      correctOptionId: 'b',
      explanation:
        '文字式 #include 使每個單元重複解析標頭，是編譯時間的主要來源；PCH、IWYU、Modules 皆針對此問題。參見 Ch.29 PDF 第 14 頁。',
    },
    {
      id: 'q2',
      stem: 'unity build（jumbo build）的取捨是什麼？',
      options: [
        { id: 'a', text: '完全沒有缺點' },
        { id: 'b', text: '合併多個 .cpp 可攤平標頭解析成本、加快完整建置，但會降低增量建置的細緻度' },
        { id: 'c', text: '它只適用於 C 而非 C++' },
        { id: 'd', text: '它會讓執行檔變慢' },
      ],
      correctOptionId: 'b',
      explanation:
        'unity build 把多檔合併為一個單元，減少重複解析與啟動成本，但改一個檔就得重編整批，增量效率下降。參見 Ch.29 PDF 第 27 頁。',
    },
    {
      id: 'q3',
      stem: 'ThinLTO 相較於傳統（完整）LTO 的優勢是什麼？',
      options: [
        { id: 'a', text: '它完全不做最佳化' },
        { id: 'b', text: '它更可平行化且支援增量，連結時間較短同時保有大部分跨模組最佳化' },
        { id: 'c', text: '它只在 -O0 下有效' },
        { id: 'd', text: '它會停用內聯' },
      ],
      correctOptionId: 'b',
      explanation:
        'ThinLTO 以較輕量、可平行與增量的方式進行連結期最佳化，兼顧建置速度與最佳化效益。參見 Ch.29 PDF 第 38 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['PCH', 'unity build', 'ThinLTO', 'IWYU'],
    caption:
      '縮短建置時間的手段：以 PCH 與 unity build 減少標頭解析，ThinLTO 加速連結，IWYU 精簡相依。',
  },
  tryIt: {
    code: `#include <iostream>

// 前置宣告可切斷不必要的 #include 相依，加快編譯。
struct HeavyType;                  // 只宣告，不需完整定義
void process(const HeavyType& h);  // 介面只需前置宣告

struct HeavyType {
    int data = 7;
};
void process(const HeavyType& h) { std::cout << h.data << '\\n'; }

int main() {
    HeavyType h;
    process(h);
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'include-what-you-use',
      href: 'https://include-what-you-use.org/',
      description: '分析並精簡 #include 相依的工具，縮短編譯時間。',
    },
    {
      title: 'ThinLTO (LLVM Blog)',
      href: 'https://blog.llvm.org/2016/06/thinlto-scalable-and-incremental-lto.html',
      description: 'ThinLTO 的設計動機與可擴充、增量的連結期最佳化。',
    },
    {
      title: 'Modern C++ Programming — Compile Time (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/29.Compile_time.html',
      description: 'Busato 課程第 29 章 HTML 投影片，涵蓋建置時間最佳化原文。',
    },
  ],
};

export default ch29BuildTime;
