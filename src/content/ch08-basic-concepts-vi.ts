import type { ChapterContent } from '@/types/ChapterContent';

const ch08BasicConceptsVI: ChapterContent = {
  slug: 'ch08-basic-concepts-vi',
  chapterLabel: '第 8 章',
  title: '基本概念 VI：函式與 Lambda',
  group: '第 1 部：基礎概念 Foundations',
  description:
    '函式、lambda 運算式與前置處理器的基礎：參數傳遞、多載、預設引數、閉包捕獲，以及巨集的風險。',
  concept: {
    standard: 'C++23',
    body: '函式是程式的基本抽象單位。參數傳遞選擇很關鍵：小型可複製型別以值傳遞，大型物件以 const 參考傳遞避免複製，需修改時以非 const 參考傳遞。函式可多載（依參數型別／數量區分）並可有預設引數。lambda 是就地定義的匿名函式物件，透過捕獲子句 [ ] 存取外部變數：[=] 以值捕獲、[&] 以參考捕獲、也可逐一列出；泛型 lambda 以 auto 參數運作。前置處理巨集（#define）在編譯前做文字替換，缺乏型別與作用域檢查，現代 C++ 多以 constexpr、inline 函式與樣板取代，僅在條件編譯與 include guard 等處保留。',
  },
  code: {
    lang: 'cpp',
    code: `#include <algorithm>
#include <print>
#include <string>
#include <vector>

// Pass large objects by const& to avoid copies; small ones can be passed by value. [1]
int count_longer_than(const std::vector<std::string>& words, std::size_t n) {
    int threshold = static_cast<int>(n);
    return static_cast<int>(std::count_if(  // [2] Algorithm + lambda
        words.begin(), words.end(),
        [threshold](const std::string& w) {  // [3] Capture threshold by value
            return static_cast<int>(w.size()) > threshold;
        }));
}

auto make_adder(int base) {  // [4] Return a closure that captures state
    return [base](int x) { return base + x; };
}

int main() {
    std::vector<std::string> words{"a", "bee", "programming", "cpp"};
    std::println("Words longer than 2: {}", count_longer_than(words, 2));

    auto add10 = make_adder(10);
    std::println("add10(5) = {}", add10(5));  // [5]
    return 0;
}`,
    callouts: [
      { n: 1, text: '傳遞語意的黃金法則：大型或不可複製物件用 const&，小型可複製型別用值傳遞。' },
      { n: 2, text: 'std::count_if 等演算法接受可呼叫物件，與 lambda 搭配可寫出宣告式的迴圈。' },
      { n: 3, text: '[threshold] 以值捕獲外部變數，讓 lambda 攜帶自己的狀態副本，避免懸置參考。' },
      { n: 4, text: 'lambda 是函式物件，可被回傳、儲存；此處回傳一個記住 base 的閉包。' },
      { n: 5, text: 'add10 是攜帶狀態的可呼叫物件，呼叫時把捕獲的 base 加到引數上。' },
    ],
  },
  deepDive: [
    {
      heading: '參數傳遞策略與回傳值最佳化',
      body: '讀取用 `const&`；會被存下來的匯（sink）參數用「傳值 + `std::move`」，讓呼叫端可移動亦可複製；需輸出多值優先回傳結構（結構化繫結解構）而非輸出參數。\n\n回傳區域物件時編譯器多會套用 RVO／NRVO 省略複製，因此 `return local;` 不需手動 `std::move`（反而可能阻止 NRVO）。理解這些規則能在不犧牲可讀性下避免不必要的複製。',
    },
    {
      heading: 'Lambda 的閉包本質與捕獲陷阱',
      body: '每個 lambda 是一個獨特的閉包型別（函式物件）。`[=]`／`[&]` 隱式捕獲易導致懸置——尤其把 `[&]` 或捕獲 `this` 的 lambda 交給非同步任務時，原物件可能已銷毀。\n\nC++14 起可用初始化捕獲 `[p = std::move(ptr)]` 移入資源；捕獲物件狀態時可用 `[*this]`（C++17）複製整個物件。泛型 lambda 以 `auto` 參數運作，`mutable` 允許修改以值捕獲的副本。',
    },
    {
      heading: '多載解析與型別抹除的成本',
      body: '多載解析依引數型別選擇最佳候選；預設引數與隱式轉換易造成非預期的候選或歧義。ADL 會把型別所屬命名空間的多載納入考量。\n\n`std::function` 以型別抹除統一可呼叫物件，但有間接呼叫與可能的堆積配置成本，不宜放在熱路徑；改用樣板參數或 `function_ref`／樣板回呼可零成本內聯。',
    },
  ],
  pitfalls: [
    '以 `[&]` 捕獲區域變數的 lambda 存活超過該變數，造成懸置參考。',
    '把捕獲 `this` 的 lambda 交給非同步任務，物件銷毀後才執行。',
    '在熱路徑使用 `std::function`，付出間接呼叫與潛在堆積配置成本。',
    '對 `return local;` 手動加 `std::move`，反而阻止 NRVO。',
  ],
  bestPractices: [
    '讀取用 `const&`，匯參數用傳值加 `std::move`；多輸出改回傳結構。',
    '明確列出 lambda 捕獲項，避免無差別的 `[&]`／`[=]`；移入資源用初始化捕獲。',
    '熱路徑回呼以樣板或 `function_ref` 取代 `std::function`。',
    '小型純函式標記 `inline`／`constexpr`，讓編譯器內聯與編譯期求值。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '要把一個大型的 std::vector 傳入函式且不打算修改它，最佳的參數宣告為何？',
      options: [
        { id: 'a', text: '以值傳遞：std::vector<T> v' },
        { id: 'b', text: '以 const 參考傳遞：const std::vector<T>& v' },
        { id: 'c', text: '以指標傳遞並手動 delete' },
        { id: 'd', text: '以 volatile 傳遞' },
      ],
      correctOptionId: 'b',
      explanation:
        'const& 避免整個容器的複製，同時保證不被修改，是傳遞大型唯讀物件的標準做法。參見 Ch.08 PDF 第 17 頁。',
    },
    {
      id: 'q2',
      stem: 'lambda 的捕獲子句 [&] 代表什麼？',
      options: [
        { id: 'a', text: '以值複製所有用到的外部變數' },
        { id: 'b', text: '以參考捕獲所有用到的外部變數' },
        { id: 'c', text: '不捕獲任何變數' },
        { id: 'd', text: '只捕獲全域變數' },
      ],
      correctOptionId: 'b',
      explanation:
        '[&] 以參考捕獲外部變數；需注意閉包存活期不可超過被捕獲變數，否則會懸置。參見 Ch.08 PDF 第 39 頁。',
    },
    {
      id: 'q3',
      stem: '為何現代 C++ 建議以 constexpr／inline 函式取代大部分 #define 巨集？',
      options: [
        { id: 'a', text: '巨集在 C++23 已被移除' },
        { id: 'b', text: '巨集只做文字替換，缺乏型別檢查與作用域，容易產生難以察覺的錯誤' },
        { id: 'c', text: '巨集會讓程式無法編譯' },
        { id: 'd', text: '函式一定比巨集慢' },
      ],
      correctOptionId: 'b',
      explanation:
        '巨集無型別與作用域概念，易有重複求值與名稱衝突；inline／constexpr 函式提供同等效率且安全。參見 Ch.08 PDF 第 52 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['函式', '多載', 'lambda', '前置處理'],
    caption:
      '從函式到閉包：具名函式與多載提供結構化抽象，lambda 提供就地可呼叫物件，前置處理則在編譯前介入。',
  },
  tryIt: {
    code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

int main() {
    std::vector<std::string> words{"a", "bee", "programming", "cpp"};
    int n = 2;
    auto count = std::count_if(words.begin(), words.end(),
                               [n](const std::string& w) { return (int)w.size() > n; });
    std::cout << "longer than " << n << ": " << count << '\\n';

    auto make_adder = [](int base) { return [base](int x) { return base + x; }; };
    std::cout << "add10(5) = " << make_adder(10)(5) << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Lambda expressions - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/lambda',
      description: 'lambda 的捕獲、泛型參數與回傳型別完整規則。',
    },
    {
      title: 'Functions - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/functions',
      description: '函式宣告、多載解析與參數傳遞的權威說明。',
    },
    {
      title: 'Modern C++ Programming — Basic Concepts VI (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/08.Basic_concepts_VI.html',
      description: 'Busato 課程第 8 章 HTML 投影片，涵蓋函式與 lambda 原文。',
    },
  ],
};

export default ch08BasicConceptsVI;
