import type { ChapterContent } from '@/types/ChapterContent';

const ch06BasicConceptsIV: ChapterContent = {
  slug: 'ch06-basic-concepts-iv',
  chapterLabel: 'Ch.06',
  title: '基本概念 IV：控制流程',
  group: 'A · 基礎概念',
  description:
    '實體、列舉、控制流程結構與 namespace 的使用：if／switch、迴圈、enum class 與命名空間如何組織程式邏輯與符號。',
  concept: {
    standard: 'C++23',
    body:
      'C++ 的控制流程包含條件（if、if constexpr、switch）與迴圈（for、range-based for、while、do-while）。C++17 起 if 與 switch 可帶初始化子句，把變數範圍限縮在條件內。強型別列舉 enum class 不會隱式轉為整數、不污染外層命名空間，應取代舊式 enum。namespace 用來分組符號、避免名稱衝突；巢狀命名空間可用 namespace a::b::c 簡寫，並可用別名縮短長名稱。善用這些工具能讓程式的作用域清晰、意圖明確，並降低意外的名稱污染與 fall-through 錯誤。',
  },
  code: {
    lang: 'cpp',
    code: `#include <print>
#include <string_view>

namespace geometry::shapes {          // [1] 巢狀命名空間簡寫
  enum class Kind { Circle, Square, Triangle }; // [2] 強型別列舉

  std::string_view name(Kind k) {
    switch (k) {                      // [3] switch 對列舉逐一處理
      case Kind::Circle:   return "圓形";
      case Kind::Square:   return "正方形";
      case Kind::Triangle: return "三角形";
    }
    return "未知";
  }
}

int main() {
  namespace gs = geometry::shapes;    // [4] 命名空間別名

  for (auto k : {gs::Kind::Circle, gs::Kind::Square}) // [5] range-based for
    std::println("{}", gs::name(k));

  if (int n = 2 + 3; n > 4)           // [6] 帶初始化的 if
    std::println("n={} 大於 4", n);
  return 0;
}`,
    callouts: [
      { n: 1, text: 'namespace a::b 簡寫（C++17）取代多層巢狀括號，讓命名空間宣告更精簡。' },
      { n: 2, text: 'enum class 是強型別列舉：不會隱式轉整數，列舉子也不會洩漏到外層作用域。' },
      { n: 3, text: 'switch 逐一列出每個列舉值；涵蓋所有情況時編譯器較不會發出遺漏警告。' },
      { n: 4, text: '命名空間別名把冗長的 geometry::shapes 縮短為 gs，僅在區域範圍生效。' },
      { n: 5, text: 'range-based for 走訪初始化列，語法簡潔且不易寫錯索引邊界。' },
      { n: 6, text: '帶初始化子句的 if（C++17）把 n 的作用域限制在此 if 內，避免污染外層。' },
    ],
  },
  deepDive: [
    {
      heading: 'switch 的窮盡性、fallthrough 與分支提示',
      body:
        '對 `enum class` 使用 `switch` 且涵蓋所有列舉值時，`-Wswitch` 能在新增列舉值後提醒你補上處理，這是維護大型狀態機的利器；因此對窮盡的列舉常刻意不寫 `default`。\n\n刻意的貫穿（fallthrough）應以 `[[fallthrough]]` 標註以消除警告並表達意圖。C++20 的 `[[likely]]`／`[[unlikely]]` 可對熱路徑分支給編譯器提示，但應以剖析佐證而非臆測。',
    },
    {
      heading: 'enum class 的底層型別與旗標',
      body:
        '`enum class` 可指定底層型別（如 `: std::uint8_t`）以控制大小與 ABI。它不隱式轉整數，位元旗標場景需顯式轉換或以 `std::to_underlying`（C++23）取值。\n\n作為位元旗標時，可為其定義 `operator|`／`operator&`，兼得型別安全與旗標運算；許多程式庫提供這類旗標包裝樣板。',
    },
    {
      heading: 'namespace、ADL 與版本化',
      body:
        '引數相依查找（ADL）讓 `swap(a, b)`、`begin(c)` 等能找到型別所屬命名空間的多載，是泛型程式的重要機制，但也可能引入意外的候選。\n\n匿名命名空間賦予內部連結（優於檔案範圍 `static`）；inline namespace 可用於符號版本化與 ABI 演進。切記勿在標頭使用 `using namespace`，以免污染所有引用者。',
    },
  ],
  pitfalls: [
    '`switch` 忘記 `break` 造成非預期貫穿；刻意貫穿卻未標 `[[fallthrough]]`。',
    '在標頭檔使用 `using namespace`，污染所有引用該標頭的轉譯單元。',
    '對 `enum class` 直接與整數比較或運算而未顯式轉換。',
    '被 ADL 引入非預期的多載候選，導致選到錯誤的函式。',
  ],
  bestPractices: [
    '一律偏好 `enum class`，並在需要時指定底層型別；取值用 `std::to_underlying`。',
    '對窮盡列舉的 `switch` 省略 `default` 並開啟 `-Wswitch` 以捕捉遺漏。',
    '以 if／switch 的初始化子句限縮變數作用域；刻意貫穿標 `[[fallthrough]]`。',
    '以命名空間分組符號，避免以名稱前綴模擬；標頭中勿用 using-directive。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '相較於傳統 enum，enum class 的主要優勢是什麼？',
      options: [
        { id: 'a', text: '它執行速度較快' },
        { id: 'b', text: '它是強型別，不會隱式轉為整數，列舉子也不污染外層命名空間' },
        { id: 'c', text: '它可以有無限多個列舉值' },
        { id: 'd', text: '它不需要 switch 也能使用' },
      ],
      correctOptionId: 'b',
      explanation:
        'enum class 提供作用域與型別安全：列舉子需以 Kind:: 限定，且不會隱式轉整數，避免多種常見錯誤。參見 Ch.06 PDF 第 29 頁。',
    },
    {
      id: 'q2',
      stem: 'C++17 為 if 與 switch 新增的「初始化子句」有何用途？',
      options: [
        { id: 'a', text: '讓條件式可以省略' },
        { id: 'b', text: '在條件中宣告變數並將其作用域限制在該 if／switch 內' },
        { id: 'c', text: '自動平行化迴圈' },
        { id: 'd', text: '取代所有 for 迴圈' },
      ],
      correctOptionId: 'b',
      explanation:
        'if (init; cond) 讓變數的生命週期限縮在條件區塊內，減少外層命名空間污染與誤用。參見 Ch.06 PDF 第 15 頁。',
    },
    {
      id: 'q3',
      stem: 'namespace 的主要目的為何？',
      options: [
        { id: 'a', text: '加速編譯' },
        { id: 'b', text: '分組符號並避免名稱衝突' },
        { id: 'c', text: '強制所有函式變成 inline' },
        { id: 'd', text: '減少可執行檔大小' },
      ],
      correctOptionId: 'b',
      explanation:
        'namespace 將相關符號歸組並隔離名稱，是大型專案避免名稱碰撞的基本工具。參見 Ch.06 PDF 第 44 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['if / switch', '迴圈', 'enum class', 'namespace'],
    caption:
      '控制流程與作用域工具：條件與迴圈決定執行路徑，enum class 與 namespace 則組織型別與符號。',
  },
  tryIt: {
    code: `#include <iostream>
#include <string_view>

enum class Kind { Circle, Square, Triangle };

std::string_view name(Kind k) {
  switch (k) {
    case Kind::Circle:   return "circle";
    case Kind::Square:   return "square";
    case Kind::Triangle: return "triangle";
  }
  return "unknown";
}

int main() {
  for (auto k : {Kind::Circle, Kind::Square, Kind::Triangle})
    std::cout << name(k) << '\\n';
  return 0;
}`,
  },
  furtherReading: [
    {
      title: 'enum - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/enum',
      description: 'enum 與 enum class 的宣告、底層型別與作用域規則。',
    },
    {
      title: 'namespace - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/namespace',
      description: '命名空間、巢狀簡寫與別名的完整說明。',
    },
    {
      title: 'Modern C++ Programming — Basic Concepts IV (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/06.Basic_concepts_IV.html',
      description: 'Busato 課程第 6 章 HTML 投影片，涵蓋控制流程原文。',
    },
  ],
};

export default ch06BasicConceptsIV;
