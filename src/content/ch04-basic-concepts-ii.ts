import type { ChapterContent } from '@/types/ChapterContent';

const ch04BasicConceptsII: ChapterContent = {
  slug: 'ch04-basic-concepts-ii',
  chapterLabel: 'Ch.04',
  title: '基本概念 II：整數型別',
  group: 'A · 基礎概念',
  description:
    '整數型別、溢位與算術運算的細節與陷阱：有號與無號的差異、整數提升、隱式轉換與未定義行為。',
  concept: {
    standard: 'C++23',
    body:
      '整數分為有號與無號兩類。有號整數溢位是「未定義行為（UB）」，編譯器可據此激進最佳化，因此絕不可依賴溢位回繞；無號整數則以 2 的冪為模回繞，行為明確但容易在「無號減法變成巨大正數」時出錯。運算前，小於 int 的型別會先做整數提升（integer promotion）至 int；混合有號與無號運算時會發生 usual arithmetic conversions，常把有號值悄悄轉為無號，導致 -1 > 0u 之類的陷阱。實務原則：迴圈索引與一般算術優先用有號型別，位元操作與明確模運算才用無號，並開啟 -fsanitize=undefined 偵測溢位。',
  },
  code: {
    lang: 'cpp',
    code: `#include <cstdint>
#include <limits>
#include <print>

int main() {
    int smax = std::numeric_limits<int>::max();  // [1]
    // smax + 1;   // [2] 有號溢位是未定義行為，切勿依賴

    unsigned int u = 0;
    --u;  // [3] 無號回繞：變成 UINT_MAX，行為有定義但常非本意

    int a = -1;
    unsigned int b = 1;
    bool surprising = (a < b);  // [4] a 被轉為無號，結果可能與直覺相反

    std::int8_t small = 100;
    auto promoted = small + small;  // [5] 先提升為 int 再相加，型別為 int

    std::println("u={}, (a<b)={}, promoted type size={}", u, surprising, sizeof(promoted));
    return 0;
}`,
    callouts: [
      { n: 1, text: 'std::numeric_limits<T> 查詢型別的極值，是安全處理邊界的標準工具。' },
      { n: 2, text: '有號整數溢位為 UB；編譯器可假設它不會發生，故不可用來偵測溢位。' },
      { n: 3, text: '無號整數在 0 減 1 時回繞為最大值，這是「有定義」但常被誤用的行為。' },
      { n: 4, text: '有號與無號混合比較時，有號值被轉為無號，-1 會變成極大值，導致意外結果。' },
      { n: 5, text: '小於 int 的運算元先做整數提升；small + small 的結果型別是 int 而非 int8_t。' },
    ],
  },
  deepDive: [
    {
      heading: '有號溢位是 UB——以及它帶來的最佳化',
      body:
        '有號整數溢位是未定義行為，編譯器據此假設 `x + 1 > x` 恆真，用以最佳化迴圈與邊界檢查。這代表你無法用 `if (x + 1 < x)` 偵測溢位——該分支可能被直接刪除。\n\n正確做法：以 `__builtin_add_overflow`（GCC／Clang）或 C++26 的 `<stdckdint>` 檢查、以 `-fsanitize=undefined` 在測試期捕捉，或改用無號型別取得明確的模運算回繞語意。',
    },
    {
      heading: '轉換階層與 size_t 陷阱',
      body:
        '整數運算依循轉換階層（rank）與提升規則；`size_t` 為無號，因此 `for (size_t i = n - 1; i >= 0; --i)` 會因 `i >= 0` 恆真而無窮迴圈，且 `n - 1` 在 `n == 0` 時回繞成極大值。\n\n容器索引與長度多為無號（`size()` 回傳 `size_type`），與有號索引混用是常見錯誤來源。C++20 的 `std::ssize` 回傳有號長度，可緩解此類問題。',
    },
    {
      heading: '位元操作與 <bit>',
      body:
        '位移量大於等於型別寬度或為負值是 UB；移位前務必檢查。C++20 保證有號整數採二補數表示，右移負數為算術移位。\n\n`<bit>` 提供可攜且常被硬體加速的操作：`std::popcount`、`std::countl_zero`、`std::rotl`、以及型別安全的 `std::bit_cast`（取代以 `reinterpret_cast` 或 union 做位元重解讀的 UB 寫法）。',
    },
  ],
  pitfalls: [
    '在反向迴圈或減法中使用無號型別，因回繞造成無窮迴圈或極大值。',
    '以 `if (x + 1 < x)` 偵測有號溢位——該分支可能被最佳化器直接移除。',
    '位移量 `>=` 型別位元寬度或為負值，屬未定義行為。',
    '以 `reinterpret_cast` 或 union 做型別雙關（type punning），違反嚴格別名規則。',
  ],
  bestPractices: [
    '一般算術與索引優先使用有號型別（依 Core Guidelines），僅在需要模運算或位元操作時用無號。',
    '以 `__builtin_*_overflow` 或 C++26 `<stdckdint>` 進行檢查式運算。',
    '使用 `<bit>` 的 `popcount`／`rotl`／`bit_cast` 取代手寫位元技巧。',
    '需要有號長度時用 `std::ssize`，避免有號／無號混用。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '對於有號整數溢位（例如 INT_MAX + 1），C++ 標準如何規定？',
      options: [
        { id: 'a', text: '一定回繞到 INT_MIN' },
        { id: 'b', text: '是未定義行為（UB），不可依賴任何特定結果' },
        { id: 'c', text: '會拋出例外' },
        { id: 'd', text: '結果一定是 0' },
      ],
      correctOptionId: 'b',
      explanation:
        '有號整數溢位是未定義行為；編譯器可假設它不發生並據此最佳化。需要明確回繞語意時應改用無號型別。參見 Ch.04 PDF 第 27 頁。',
    },
    {
      id: 'q2',
      stem: '運算式 (-1 < 1u) 在 C++ 中的結果為何，原因是什麼？',
      options: [
        { id: 'a', text: 'true，因為 -1 顯然小於 1' },
        { id: 'b', text: 'false，因為 -1 被轉為極大的無號值' },
        { id: 'c', text: '編譯錯誤' },
        { id: 'd', text: '結果未定義' },
      ],
      correctOptionId: 'b',
      explanation:
        '混合有號與無號時會套用 usual arithmetic conversions，-1 轉為無號變成極大值，故比較結果為 false。參見 Ch.04 PDF 第 41 頁。',
    },
    {
      id: 'q3',
      stem: '兩個 std::int8_t 相加，運算結果的型別為何？',
      options: [
        { id: 'a', text: '仍為 std::int8_t' },
        { id: 'b', text: '因整數提升而成為 int' },
        { id: 'c', text: 'double' },
        { id: 'd', text: '無號整數' },
      ],
      correctOptionId: 'b',
      explanation:
        '小於 int 的整數型別在算術前會被提升為 int，因此 int8_t + int8_t 的結果型別是 int。參見 Ch.04 PDF 第 33 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['有號整數', '無號整數', '整數提升', '溢位'],
    caption:
      '整數運算的關鍵環節：有號／無號的選擇、運算前的整數提升，以及溢位所帶來的未定義或回繞行為。',
  },
  tryIt: {
    code: `#include <iostream>
#include <limits>

int main() {
    unsigned int u = 0;
    --u;  // 無號回繞
    int a = -1;
    unsigned int b = 1;
    std::cout << "u = " << u << '\\n';
    std::cout << "(a < b) = " << (a < b) << "  (可能與直覺不同)\\n";
    std::cout << "INT_MAX = " << std::numeric_limits<int>::max() << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Integer conversions - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/implicit_conversion',
      description: '整數提升與 usual arithmetic conversions 的精確規則。',
    },
    {
      title: 'std::numeric_limits - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/types/numeric_limits',
      description: '查詢各型別極值、位元數與特性的標準介面。',
    },
    {
      title: 'Modern C++ Programming — Basic Concepts II (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/04.Basic_concepts_II.html',
      description: 'Busato 課程第 4 章 HTML 投影片，涵蓋整數型別原文。',
    },
  ],
};

export default ch04BasicConceptsII;
