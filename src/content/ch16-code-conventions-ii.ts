import type { ChapterContent } from '@/types/ChapterContent';

const ch16CodeConventionsII: ChapterContent = {
  slug: 'ch16-code-conventions-ii',
  chapterLabel: '第 16 章',
  title: '程式慣例 II：現代寫法',
  group: '第 3 部：建置系統與慣例',
  description:
    'auto、現代 C++ 特性與提升可讀性的實務：結構化繫結、range-based for、ranges 與一致初始化如何讓程式更清楚。',
  concept: {
    standard: 'C++23',
    body: '現代 C++ 提供許多讓程式更安全、更易讀的慣用寫法。auto 減少冗長型別、避免隱式窄化與型別不符，但在會傷害可讀性處仍應寫明型別。結構化繫結（auto [k, v] = ...）讓解構 pair、tuple 與結構更自然。range-based for 取代易錯的索引迴圈，C++20 ranges 進一步支援 views::filter、views::transform 等惰性、可組合的管線。一致初始化以大括號 {} 統一語法並防止窄化轉換。其他要點：優先使用 nullptr 而非 NULL、用 enum class、用 using 別名取代 typedef、以 std::array 取代 C 陣列。核心精神是讓意圖直接寫在程式碼裡。',
  },
  code: {
    lang: 'cpp',
    code: `#include <map>
#include <print>
#include <ranges>
#include <string>
#include <vector>

int main() {
    std::map<std::string, int> scores{{"amy", 90}, {"ben", 75}, {"cy", 60}};

    for (const auto& [name, score] : scores)  // [1] 結構化繫結
        std::println("{}: {}", name, score);

    std::vector<int> v{1, 2, 3, 4, 5, 6};
    auto evens = v  // [2] ranges 管線
                 | std::views::filter([](int x) { return x % 2 == 0; }) |
                 std::views::transform([](int x) { return x * x; });  // [3]

    for (int x : evens)  // [4] 惰性求值
        std::print("{} ", x);
    std::println("");

    int total{0};  // [5] 一致初始化，防止窄化
    for (int x : evens) total += x;
    std::println("sum of squared evens = {}", total);
    return 0;
}`,
    callouts: [
      {
        n: 1,
        text: '結構化繫結把 map 元素直接解構為 name 與 score，比 it->first／it->second 清楚得多。',
      },
      { n: 2, text: 'ranges 以管線運算子 | 串接視圖，形成宣告式、可組合的資料流。' },
      { n: 3, text: 'views::filter 與 views::transform 是惰性視圖，不會複製底層容器。' },
      { n: 4, text: '視圖在走訪時才逐一計算元素，兼顧可讀性與效率。' },
      { n: 5, text: '大括號初始化 int total{0} 統一語法並禁止會遺失資訊的窄化轉換。' },
    ],
  },
  deepDive: [
    {
      heading: 'CTAD、結構化繫結與 ranges 管線',
      body: '類別樣板引數推導（CTAD）讓 `std::vector v{1,2,3}` 免寫型別；結構化繫結解構 pair／tuple／聚合；ranges 以 `|` 串接惰性視圖形成宣告式資料流。\n\n這些特性減少樣板程式碼與出錯面，但要理解其成本模型：視圖是惰性的、不複製，卻也因此對來源生命週期敏感。',
    },
    {
      heading: '現代錯誤處理',
      body: '可預期的失敗以 `std::optional`（無值）或 `std::expected`（值或錯誤，C++23）回傳，讓錯誤進入型別系統，取代以特殊回傳值或輸出參數表達失敗。真正的例外情況才用 exceptions。\n\n以 `[[nodiscard]]` 標記回傳值不可忽略的函式（尤其回傳 `expected`／錯誤碼者），讓忽略錯誤成為編譯警告。',
    },
    {
      heading: '可讀性、零成本與生命週期',
      body: 'ranges 與 `auto` 提升可讀性且多為零成本，但 `std::string_view`／`std::span` 與視圖都是非擁有的：指向暫時物件會懸置（如 `std::string_view sv = get_string();` 其中回傳暫時 `std::string`）。\n\n把視圖用作函式參數（唯讀、不儲存）是安全常見的用法；把視圖存進成員或回傳指向暫時物件的視圖則危險。',
    },
  ],
  pitfalls: [
    '`std::string_view`／`std::span` 指向暫時物件，離開該運算式即懸置。',
    '對右值容器建立 ranges 視圖並在其銷毀後使用，造成懸置。',
    '`auto` 隱藏了昂貴型別（如意外複製 `std::string`）。',
    '忽略回傳的錯誤（`optional`／`expected`）而未加 `[[nodiscard]]` 防護。',
  ],
  bestPractices: [
    '善用結構化繫結、CTAD 與 ranges 提升可讀性。',
    '可預期失敗回傳 `optional`／`expected`；回傳值標 `[[nodiscard]]`。',
    '以 `string_view`／`span` 作唯讀參數，但勿存入成員或回傳指向暫時物件者。',
    '注意視圖與非擁有型別的生命週期，必要時複製為擁有型別。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '結構化繫結（structured bindings）最適合用於下列哪種情境？',
      options: [
        { id: 'a', text: '定義虛擬函式' },
        { id: 'b', text: '把 pair、tuple 或結構的成員一次解構成具名變數' },
        { id: 'c', text: '配置 heap 記憶體' },
        { id: 'd', text: '宣告樣板參數' },
      ],
      correctOptionId: 'b',
      explanation:
        'auto [a, b] = ... 讓你直接解構聚合型別，取代冗長的 .first／.second 或 std::get。參見 Ch.16 PDF 第 21 頁。',
    },
    {
      id: 'q2',
      stem: '使用大括號 {} 的一致初始化，相較於 () 有何額外好處？',
      options: [
        { id: 'a', text: '它會禁止會遺失資訊的窄化轉換（narrowing）' },
        { id: 'b', text: '它讓程式執行更快' },
        { id: 'c', text: '它自動配置記憶體' },
        { id: 'd', text: '它可以省略型別' },
      ],
      correctOptionId: 'a',
      explanation:
        '大括號初始化會在如 int x{3.5} 這類窄化時報錯，提供額外的安全檢查。參見 Ch.16 PDF 第 33 頁。',
    },
    {
      id: 'q3',
      stem: 'C++20 ranges 的視圖（views，如 views::filter）有何特性？',
      options: [
        { id: 'a', text: '它們會立即複製整個容器' },
        { id: 'b', text: '它們是惰性、可組合的，走訪時才逐一計算元素' },
        { id: 'c', text: '它們只能用於 std::vector' },
        { id: 'd', text: '它們會修改原始容器' },
      ],
      correctOptionId: 'b',
      explanation:
        'ranges 視圖是惰性且可用 | 組合的輕量包裝，不複製底層資料，走訪時才求值。參見 Ch.16 PDF 第 45 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['auto', '結構化繫結', 'ranges', '可讀性'],
    caption:
      '現代寫法的目標：以 auto、結構化繫結與 ranges 等特性把意圖直接寫進程式碼，提升可讀性與安全性。',
  },
  tryIt: {
    code: `#include <iostream>
#include <ranges>
#include <vector>

int main() {
    std::vector<int> v{1, 2, 3, 4, 5, 6};
    auto evens = v | std::views::filter([](int x) { return x % 2 == 0; }) |
                 std::views::transform([](int x) { return x * x; });
    int total = 0;
    for (int x : evens) {
        std::cout << x << ' ';
        total += x;
    }
    std::cout << "\\nsum = " << total << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Ranges library - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/ranges',
      description: 'C++20 ranges 與視圖介面的完整參考。',
    },
    {
      title: 'Structured bindings - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/structured_binding',
      description: '結構化繫結的規則與適用型別。',
    },
    {
      title: 'Modern C++ Programming — Code Conventions II (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/16.Code_conventions_II.html',
      description: 'Busato 課程第 16 章 HTML 投影片，涵蓋現代寫法原文。',
    },
  ],
};

export default ch16CodeConventionsII;
