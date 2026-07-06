import type { ChapterContent } from '@/types/ChapterContent';

const ch12TemplatesII: ChapterContent = {
  slug: 'ch12-templates-ii',
  chapterLabel: 'Ch.12',
  title: '樣板 II：SFINAE 與可變參數',
  group: 'B · 物件導向與泛型程式設計',
  description:
    '類別樣板、樣板特化、SFINAE 技巧與可變參數樣板：如何撰寫可組合、可遞迴展開的泛型元件。',
  concept: {
    standard: 'C++20',
    body: '類別樣板讓資料結構泛型化（如 std::vector<T>），並可透過部分或完全特化為特定型別提供不同實作。SFINAE（Substitution Failure Is Not An Error）指樣板替換失敗時該候選被靜默移除而非報錯，是 C++20 之前條件式多載的主要手段，常搭配 std::enable_if；C++20 後多改以 concepts 表達，更清晰。可變參數樣板以 typename... Args 接受任意數量的參數，透過參數包展開（pack expansion）處理；C++17 的折疊運算式（fold expression）讓 (args + ...) 這類累加寫法極為簡潔。這些工具是 std::tuple、std::format 等泛型設施的基礎。',
  },
  code: {
    lang: 'cpp',
    code: `#include <print>
#include <type_traits>

// 可變參數樣板 + C++17 折疊運算式：加總任意數量引數。 [1]
template <typename... Args>
auto sumAll(Args... args) {
  return (args + ...);  // [2] 一元右折疊
}

// 完全特化：為 bool 提供不同行為。 [3]
template <typename T>
const char* kind() {
  return "一般型別";
}
template <>
const char* kind<bool>() {
  return "布林型別";
}

// 以 if constexpr 取代部分 SFINAE，於編譯期選擇分支。 [4]
template <typename T>
auto describe(T v) {
  if constexpr (std::is_integral_v<T>)
    return v * 2;  // [5] 只有整數會編譯此分支
  else
    return v;
}

int main() {
  std::println("sum = {}", sumAll(1, 2, 3, 4, 5));
  std::println("{} / {}", kind<int>(), kind<bool>());
  std::println("describe(21) = {}", describe(21));
  return 0;
}`,
    callouts: [
      { n: 1, text: 'typename... Args 宣告參數包，可接受任意數量、任意型別的引數。' },
      {
        n: 2,
        text: '折疊運算式 (args + ...) 於編譯期展開為 arg1 + arg2 + ... 的加總，取代遞迴樣板。',
      },
      { n: 3, text: 'template <> 完全特化為特定型別（此處 bool）提供專屬實作。' },
      {
        n: 4,
        text: 'if constexpr 於編譯期評估條件，未選中的分支不會被實體化，可取代許多 SFINAE 情境。',
      },
      { n: 5, text: '只有當 T 為整數時，v * 2 分支才會被編譯；非整數走 else 分支。' },
    ],
  },
  deepDive: [
    {
      heading: '折疊運算式與空參數包',
      body: '折疊運算式有一元與二元形式。空參數包時，只有 `&&`（true）、`||`（false）、`,`（void）有預設值，其餘（如一元 `+ ...`）在空包時是編譯錯誤，需用二元折疊提供初值（如 `(0 + ... + args)`）。\n\n處理索引時常搭配 `std::index_sequence` 與 `std::make_index_sequence` 展開。掌握這些細節能寫出健全、可處理零參數的可變參數工具。',
    },
    {
      heading: 'if constexpr、SFINAE 與 concepts 的取捨',
      body: '`if constexpr` 於編譯期選擇分支，未選中的分支不會被實體化（但仍須語法合法），適合在單一函式內依型別特性分流；SFINAE 於多載集合層級移除候選；concepts 則兼具兩者優點且診斷最佳。\n\n現代程式應優先 concepts 與 `if constexpr`，僅在維護舊碼或需要極細緻多載控制時才用 `enable_if` 式 SFINAE。',
    },
    {
      heading: '特化的規則與陷阱',
      body: '類別樣板支援部分特化與完全特化，但函式樣板不支援部分特化——應改用多載。特化必須與主樣板在同一命名空間，且不能改變介面契約。\n\n對標準庫型別（如 `std::hash`）特化時需置於 `std` 命名空間且僅針對自訂型別，否則屬 UB。錯誤的特化位置或簽章會被靜默忽略而選到主樣板。',
    },
  ],
  pitfalls: [
    '對空參數包使用無預設值的一元折疊（如 `(... + args)`）造成編譯錯誤。',
    '嘗試部分特化函式樣板——語言不支援，應改用多載。',
    '`if constexpr` 未選中的分支雖不實體化，但仍必須語法合法。',
    '特化置於錯誤命名空間或簽章不符，被靜默忽略而選到主樣板。',
  ],
  bestPractices: [
    '優先使用 concepts 與 `if constexpr`，SFINAE 僅用於必要場景。',
    '以二元折疊提供初值，確保零參數情況也正確。',
    '需要「函式樣板部分特化」時改以多載加約束達成。',
    '特化 `std::hash` 等標準模板時，僅針對自訂型別並置於正確命名空間。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: 'SFINAE 這個縮寫代表什麼？',
      options: [
        { id: 'a', text: 'Standard Function Is Not An Error' },
        { id: 'b', text: 'Substitution Failure Is Not An Error（替換失敗並非錯誤）' },
        { id: 'c', text: 'Simple Function Inline And Expand' },
        { id: 'd', text: 'Static Field Initialization And Evaluation' },
      ],
      correctOptionId: 'b',
      explanation:
        'SFINAE 指樣板引數替換失敗時，該候選被靜默從多載集合移除而非產生錯誤。參見 Ch.12 PDF 第 33 頁。',
    },
    {
      id: 'q2',
      stem: 'C++17 的折疊運算式（fold expression）解決了什麼問題？',
      options: [
        { id: 'a', text: '讓可變參數樣板不需要遞迴基底案例即可展開參數包' },
        { id: 'b', text: '讓程式自動多執行緒化' },
        { id: 'c', text: '取代所有類別樣板' },
        { id: 'd', text: '把浮點數摺疊成整數' },
      ],
      correctOptionId: 'a',
      explanation:
        '折疊運算式以 (pack op ...) 直接展開參數包，取代過去需要遞迴與基底案例的寫法。參見 Ch.12 PDF 第 51 頁。',
    },
    {
      id: 'q3',
      stem: 'if constexpr 與一般 if 的關鍵差異是什麼？',
      options: [
        { id: 'a', text: '沒有差異，只是別名' },
        { id: 'b', text: 'if constexpr 於編譯期求值，未選中的分支不會被實體化' },
        { id: 'c', text: 'if constexpr 只能用於執行期常數' },
        { id: 'd', text: 'if constexpr 一定比較慢' },
      ],
      correctOptionId: 'b',
      explanation:
        'if constexpr 在編譯期決定分支，未選中的分支對當前型別可以是不合法的程式碼，因為它根本不會被實體化。參見 Ch.12 PDF 第 42 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['類別樣板', '特化', 'SFINAE', 'parameter pack'],
    caption:
      '進階樣板技術：類別樣板與特化提供客製化，SFINAE／concepts 做條件選擇，參數包展開處理可變參數。',
  },
  tryIt: {
    code: `#include <iostream>
#include <type_traits>

template <typename... Args>
auto sumAll(Args... args) {
  return (args + ...);
}

template <typename T>
auto describe(T v) {
  if constexpr (std::is_integral_v<T>)
    return v * 2;
  else
    return v;
}

int main() {
  std::cout << "sum = " << sumAll(1, 2, 3, 4, 5) << '\\n';
  std::cout << "describe(21) = " << describe(21) << '\\n';
  return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Parameter packs - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/parameter_pack',
      description: '可變參數樣板與參數包展開的完整說明。',
    },
    {
      title: 'Fold expressions - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/fold',
      description: 'C++17 折疊運算式的語法與範例。',
    },
    {
      title: 'Modern C++ Programming — Templates II (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/12.Templates_and_metaprogramming_II.html',
      description: 'Busato 課程第 12 章 HTML 投影片，涵蓋特化、SFINAE 與可變參數原文。',
    },
  ],
};

export default ch12TemplatesII;
