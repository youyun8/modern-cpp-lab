import type { ChapterContent } from '@/types/ChapterContent';

const ch02Preparation: ChapterContent = {
  slug: 'ch02-preparation',
  chapterLabel: '第 2 章',
  title: '環境準備',
  group: '第 1 部：基礎概念 Foundations',
  description:
    '工具鏈、編譯器選擇與第一支 Hello World 程式的建置流程：從原始碼經前置處理、編譯、組譯到連結成可執行檔。',
  concept: {
    standard: 'C++23',
    body: '把 .cpp 變成可執行檔會經過四個階段：前置處理（展開 #include 與巨集）、編譯（產生組合語言）、組譯（產生目的檔 .o）、連結（把多個目的檔與函式庫合併成執行檔）。主流編譯器有 GCC（g++）、Clang（clang++）與 MSVC，三者大致遵循同一套標準但各有擴充與診斷風格。務必以 -std=c++23 明確指定標準版本，並開啟 -Wall -Wextra 取得完整警告。實務上多以 CMake 等建置系統驅動編譯器，而非手動下指令；線上工具如 Compiler Explorer（Godbolt）則便於快速實驗與觀察生成的組合語言。',
  },
  code: {
    lang: 'bash',
    code: `# 直接以 g++ 編譯單一檔案，明確指定標準與警告等級
g++ -std=c++23 -Wall -Wextra -O2 hello.cpp -o hello   # [1]

# 只做前置處理，觀察 #include 展開後的內容
g++ -std=c++23 -E hello.cpp -o hello.i                 # [2]

# 只編譯不連結，產生目的檔
g++ -std=c++23 -c hello.cpp -o hello.o                 # [3]

# 連結目的檔成為最終可執行檔
g++ hello.o -o hello                                   # [4]

# 執行並印出結束狀態碼（0 代表成功）
./hello ; echo "exit code = $?"                        # [5]`,
    callouts: [
      { n: 1, text: '-std=c++23 指定語言標準；-Wall -Wextra 開啟常見警告；-O2 啟用最佳化。' },
      { n: 2, text: '-E 只執行前置處理器，可用來除錯巨集與標頭展開問題。' },
      { n: 3, text: '-c 表示「編譯但不連結」，輸出可重複使用的目的檔（.o）。' },
      { n: 4, text: '連結階段將目的檔與所需函式庫組合成單一可執行檔。' },
      { n: 5, text: '$? 取得上一個程序的離開碼，是驗證程式是否成功的簡易方法。' },
    ],
  },
  deepDive: [
    {
      heading: '看穿四個編譯階段的產物',
      body: '除錯建置問題時，能單獨檢視每個階段的產物非常有用：`-E` 產生前置處理後的原始碼（診斷巨集與標頭展開）、`-S` 產生組合語言（觀察最佳化與 ABI）、`-c` 產生目的檔、最後才連結。\n\n連結錯誤（undefined reference、multiple definition）幾乎都源自 ODR 或符號可見性，而非語法；理解「編譯期錯誤 vs 連結期錯誤」的界線能大幅縮短排錯時間。`nm`、`objdump`、`c++filt` 可檢視符號與還原 name mangling。',
    },
    {
      heading: '警告與診斷：-Wall 並非「全部」',
      body: '`-Wall` 只是常用警告集，並非字面上的全部。工業專案通常再加 `-Wextra -Wshadow -Wconversion -Wpedantic`，並以 `-Werror` 讓警告成為建置失敗條件。\n\n不同編譯器診斷互補：以 GCC 與 Clang 雙編譯能揪出更多問題。搭配 `-fsanitize=address,undefined` 於測試建置可在執行期捕捉記憶體與 UB 錯誤。注意 `-Ofast`／`-ffast-math` 會放寬浮點語意，不應無意識開啟。',
    },
    {
      heading: '建置系統與可重現性',
      body: '手動下 `g++` 只適合玩具程式；真實專案以 CMake（搭配 presets）描述目標與相依，採 out-of-source 建置分離產物。`ccache` 快取編譯結果、Ninja 提供快速平行建置。\n\n可重現性關鍵在於固定工具鏈版本（容器化）、區分 Debug（`-O0 -g`）與 Release（`-O2/-O3 -DNDEBUG`）組態，並避免建置相依於本機環境。Debug 與 Release 的 ABI 與 `assert` 行為不同，混用會導致難解的問題。',
    },
  ],
  pitfalls: [
    '剖析（profiling）時忘記加 `-g`，導致無法對應到原始碼行號與函式名。',
    '混用 Debug 與 Release 編譯的目的檔／函式庫，造成 ABI 不一致與詭異崩潰。',
    '誤以為 `-Wall` 已涵蓋所有警告，忽略了 `-Wconversion`、`-Wshadow` 等重要診斷。',
    '在原始碼樹內就地建置（in-source build），污染版本控制並難以清理。',
  ],
  bestPractices: [
    '以 CMake presets 明確分離 Debug／Release 組態，並採 out-of-source 建置。',
    'CI 開啟豐富警告集加 `-Werror`，並以 GCC 與 Clang 雙編譯提高覆蓋。',
    '測試建置啟用 `-fsanitize=address,undefined`；效能建置保留 `-g` 以利剖析。',
    '用 `ccache` 加速重建，並以容器固定編譯器版本確保可重現。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '將 C++ 原始碼轉為可執行檔的四個階段，正確順序為何？',
      options: [
        { id: 'a', text: '連結 → 編譯 → 組譯 → 前置處理' },
        { id: 'b', text: '前置處理 → 編譯 → 組譯 → 連結' },
        { id: 'c', text: '編譯 → 前置處理 → 連結 → 組譯' },
        { id: 'd', text: '組譯 → 連結 → 編譯 → 前置處理' },
      ],
      correctOptionId: 'b',
      explanation:
        '正確流程為前置處理（展開 #include／巨集）→ 編譯（生成組語）→ 組譯（生成 .o）→ 連結（合併成執行檔）。參見 Ch.02 PDF 第 18 頁。',
    },
    {
      id: 'q2',
      stem: 'g++ 的 -c 旗標代表什麼？',
      options: [
        { id: 'a', text: '編譯並直接執行程式' },
        { id: 'b', text: '編譯但不連結，只產生目的檔' },
        { id: 'c', text: '清除所有中間檔' },
        { id: 'd', text: '以 C 語言而非 C++ 編譯' },
      ],
      correctOptionId: 'b',
      explanation:
        '-c 讓編譯器停在組譯後，輸出 .o 目的檔，稍後再統一連結；這是分離編譯的基礎。參見 Ch.02 PDF 第 22 頁。',
    },
    {
      id: 'q3',
      stem: '為什麼建議編譯時加上 -Wall -Wextra？',
      options: [
        { id: 'a', text: '它們會讓程式執行得更快' },
        { id: 'b', text: '它們開啟更完整的編譯器警告，及早揪出潛在錯誤' },
        { id: 'c', text: '它們是連結函式庫的必要選項' },
        { id: 'd', text: '它們會自動修正所有 bug' },
      ],
      correctOptionId: 'b',
      explanation:
        '-Wall -Wextra 啟用大量診斷警告（未初始化變數、隱式轉換等），能在執行前發現許多問題。參見 Ch.02 PDF 第 34 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['原始碼', '編譯器', '連結器', '可執行檔'],
    caption:
      '建置流程示意：原始碼經編譯器（含前置處理、編譯、組譯）產生目的檔，再由連結器合併為可執行檔。',
  },
  tryIt: {
    code: `#include <iostream>

// 最小可編譯範例。以 g++ -std=c++23 -Wall try.cpp -o try 編譯。
int main() {
    std::cout << "工具鏈已就緒！\\n";
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Compiler Explorer (Godbolt)',
      href: 'https://godbolt.org/',
      description: '線上即時觀察多家編譯器產生的組合語言，實驗最佳化效果。',
    },
    {
      title: 'GCC Command Options',
      href: 'https://gcc.gnu.org/onlinedocs/gcc/Invoking-GCC.html',
      description: 'GCC 完整旗標說明，包含標準版本、警告與最佳化選項。',
    },
    {
      title: 'Modern C++ Programming — Preparation (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/02.Preparation.html',
      description: 'Busato 課程第 2 章 HTML 投影片，涵蓋工具鏈原文。',
    },
  ],
};

export default ch02Preparation;
