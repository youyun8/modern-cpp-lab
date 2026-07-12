import type { ChapterContent } from '@/types/ChapterContent';

const ch28BinarySize: ChapterContent = {
  slug: 'ch28-binary-size',
  chapterLabel: '第 28 章',
  title: '二進位檔大小',
  group: '第 7 部：軟體設計與工具',
  description:
    'symbol visibility、LTO 與樣板膨脹（template bloat）的控制：如何診斷並縮減可執行檔與函式庫的體積。',
  concept: {
    standard: 'C++23',
    body: '二進位檔大小影響載入時間、記憶體足跡與快取效率，在嵌入式與函式庫發佈情境尤其關鍵。膨脹的主要來源包含：樣板為每組型別參數各生成一份程式碼（template bloat）、未移除的除錯符號、過度內聯，以及不必要的匯出符號。控制手段有：以 -fvisibility=hidden 預設隱藏符號、僅明確標記需匯出者，能縮小動態符號表並促成更多內聯與死碼移除；LTO 於連結期跨單元移除未用程式碼；-Os 以體積為最佳化目標；strip 移除符號；對樣板可將共通、與型別無關的部分抽到非樣板基底（減少實例化）。診斷工具包含 size、nm、bloaty 與 -Wl,--print-gc-sections。務必在縮減體積與維持效能、可除錯性之間取得平衡。',
  },
  code: {
    lang: 'bash',
    code: `# Hide symbols by default, shrinking the dynamic symbol table and enabling more optimization
g++ -std=c++23 -O2 -fvisibility=hidden -fvisibility-inlines-hidden \\
    -c lib.cpp -o lib.o                                   # [1]

# Link-time optimization + remove unused sections
g++ -O2 -flto -ffunction-sections -fdata-sections \\
    -Wl,--gc-sections main.o lib.o -o app                # [2]

# Optimize for size, and strip symbols
g++ -std=c++23 -Os small.cpp -o small                    # [3]
strip --strip-all small                                   # [4]

# Diagnose sources of size bloat
size app ; bloaty app                                      # [5]`,
    callouts: [
      {
        n: 1,
        text: '-fvisibility=hidden 讓符號預設不匯出，僅明確標記者可見，縮小符號表並利於內聯／死碼移除。',
      },
      {
        n: 2,
        text: '-ffunction-sections 搭配 --gc-sections 讓連結器移除未被參照的函式與資料區段。',
      },
      { n: 3, text: '-Os 以縮小體積為最佳化目標，適合對大小敏感的嵌入式或發佈情境。' },
      { n: 4, text: 'strip 移除符號與除錯資訊，顯著縮小檔案，但會降低可除錯性。' },
      { n: 5, text: 'size 顯示各區段大小，bloaty 進一步歸因到符號／編譯單元，找出膨脹來源。' },
    ],
  },
  deepDive: [
    {
      heading: '膨脹來源的歸因',
      body: '二進位膨脹來自樣板實例化、RTTI 資訊、例外處理表、除錯資訊與靜態連結的函式庫。以 `bloaty` 可把體積歸因到符號與編譯單元，`nm --size-sort`、`size` 提供區段層級檢視。\n\n先量測再動手，避免憑感覺最佳化；很多時候最大宗其實是除錯資訊或某個被大量實例化的樣板。',
    },
    {
      heading: '縮減手段與其代價',
      body: '`-fvisibility=hidden` 縮小動態符號表並促成更多最佳化；`-ffunction-sections -fdata-sections` 搭配 `--gc-sections` 移除未用區段；LTO 跨單元去死碼；`-Os` 以體積為目標；`extern template` 減少重複實例化。\n\n`-fno-rtti`／`-fno-exceptions` 能顯著瘦身，但會破壞倚賴它們的函式庫（含部分標準庫設施），僅適合完全掌控的程式碼庫。',
    },
    {
      heading: '嵌入式與 freestanding 考量',
      body: '嵌入式環境常在 freestanding 模式下運作，關閉例外與 RTTI、限制動態配置與靜態初始化，並關注 ROM／RAM 佔用。此時樣板膨脹與靜態建構子的成本尤其敏感。\n\n跨共享函式庫時，符號可見性策略必須一致，否則會出現重複符號或非預期的介面暴露。',
    },
  ],
  pitfalls: [
    '在倚賴例外／RTTI 的程式碼上開 `-fno-exceptions`／`-fno-rtti`，導致連結或執行失敗。',
    '`strip` 移除了除錯或動態連結所需的符號。',
    '樣板被大量實例化造成膨脹卻未察覺（未用 bloaty 量測）。',
    '跨共享函式庫的符號可見性設定不一致，造成重複符號或洩漏。',
  ],
  bestPractices: [
    '先以 `bloaty`／`size` 量測，找出真正的膨脹來源。',
    '組合 `-fvisibility=hidden`、`--gc-sections` 與 LTO 縮減體積。',
    '對常用樣板以 `extern template` 減少重複實例化。',
    '僅在完全掌控的程式碼庫中關閉 RTTI／例外。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '「template bloat（樣板膨脹）」的成因是什麼？',
      options: [
        { id: 'a', text: '樣板會讓程式執行變慢' },
        { id: 'b', text: '每一組不同的樣板引數都會生成一份對應的程式碼，累積起來使體積變大' },
        { id: 'c', text: '樣板需要額外的執行期型別資訊' },
        { id: 'd', text: '樣板會複製整個標準函式庫' },
      ],
      correctOptionId: 'b',
      explanation:
        '樣板為每組型別實例各生成一份程式碼；大量實例化會顯著增加二進位體積，可透過抽出共通基底緩解。參見 Ch.28 PDF 第 26 頁。',
    },
    {
      id: 'q2',
      stem: '-fvisibility=hidden 有什麼好處？',
      options: [
        { id: 'a', text: '讓所有符號都可被外部連結' },
        { id: 'b', text: '預設隱藏符號、縮小動態符號表，並促成更多內聯與死碼移除' },
        { id: 'c', text: '停用最佳化以縮小體積' },
        { id: 'd', text: '加密二進位檔' },
      ],
      correctOptionId: 'b',
      explanation:
        '預設隱藏符號可縮小匯出表、加快動態連結，並讓最佳化器更積極地內聯與移除未用程式碼。參見 Ch.28 PDF 第 33 頁。',
    },
    {
      id: 'q3',
      stem: '連結器選項 --gc-sections（搭配 -ffunction-sections）的作用是什麼？',
      options: [
        { id: 'a', text: '壓縮所有字串常數' },
        { id: 'b', text: '移除未被任何地方參照的函式與資料區段' },
        { id: 'c', text: '把所有函式合併成一個' },
        { id: 'd', text: '加入額外的除錯符號' },
      ],
      correctOptionId: 'b',
      explanation:
        '把每個函式／資料放到獨立區段後，--gc-sections 可讓連結器回收未被參照的區段，縮小產物。參見 Ch.28 PDF 第 40 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['符號可見性', 'strip', 'LTO', 'template bloat'],
    caption: '縮減二進位體積的槓桿：控制符號可見性、strip 符號、以 LTO 移除死碼，並抑制樣板膨脹。',
  },
  tryIt: {
    code: `#include <iostream>
#include <vector>

// Extract the type-independent common implementation into a non-template function to reduce template bloat.
namespace detail {
std::size_t count_positive(const int* p, std::size_t n) {
    std::size_t c = 0;
    for (std::size_t i = 0; i < n; ++i) {
        if (p[i] > 0) {
            ++c;
        }
    }
    return c;
}
}  // namespace detail

template <class Container>
std::size_t count_positive(const Container& c) {
    return detail::count_positive(c.data(), c.size());  // thin template wrapper
}

int main() {
    std::vector<int> v{-1, 2, -3, 4, 5};
    std::cout << "positive = " << count_positive(v) << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Bloaty McBloatface — a size profiler for binaries',
      href: 'https://github.com/google/bloaty',
      description: 'Google 的二進位體積剖析工具，可歸因到符號與編譯單元。',
    },
    {
      title: 'GCC Code Gen / Visibility options',
      href: 'https://gcc.gnu.org/onlinedocs/gcc/Code-Gen-Options.html',
      description: '-fvisibility、-ffunction-sections 等控制程式碼生成的旗標。',
    },
    {
      title: 'Modern C++ Programming — Binary Size (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/28.Binary_size.html',
      description: 'Busato 課程第 28 章 HTML 投影片，涵蓋二進位體積原文。',
    },
  ],
};

export default ch28BinarySize;
