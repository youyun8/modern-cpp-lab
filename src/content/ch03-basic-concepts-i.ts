import type { ChapterContent } from '@/types/ChapterContent';

const ch03BasicConceptsI: ChapterContent = {
  slug: 'ch03-basic-concepts-i',
  chapterLabel: 'Ch.03',
  title: '基本概念 I：型別系統',
  group: 'A · 基礎概念',
  description:
    'C++ 型別系統、基本型別與運算子的入門介紹，說明靜態型別、值類別與運算式如何構成程式的骨架。',
  concept: {
    standard: 'C++23',
    body:
      'C++ 是靜態強型別語言：每個運算式在編譯期都有確定的型別，編譯器據此檢查與生成程式碼。基本型別分為整數（含 bool、char）、浮點數與 void；由它們可組出指標、參考、陣列、列舉與類別等複合型別。宣告時優先使用固定寬度型別（如 std::int32_t）或 auto 讓編譯器推導，避免依賴平台相依的 int 大小。運算子有優先順序與結合性，並區分左值（有身分、可取址）與右值（暫時值）。理解 sizeof、隱式轉換與整數提升，是避免細微錯誤的第一步。',
  },
  code: {
    lang: 'cpp',
    code: `#include <cstdint>
#include <print>
#include <type_traits>

int main() {
  auto a = 42;              // [1] 推導為 int
  std::int64_t big = 1'000'000'000'000; // [2] 固定寬度，數字分隔符
  constexpr double pi = 3.14159;        // [3] 編譯期常數
  bool flag = a > 10;                    // [4] 關係運算子產生 bool

  static_assert(std::is_same_v<decltype(a), int>); // [5] 編譯期型別檢查

  std::println("sizeof(int)={}, sizeof(int64)={}, flag={}",
               sizeof(a), sizeof(big), flag);
  return 0;
}`,
    callouts: [
      { n: 1, text: 'auto 讓編譯器由初始值推導型別；此處字面值 42 為 int。' },
      { n: 2, text: 'std::int64_t 是固定 64 位元整數；數字中的單引號為數字分隔符，僅助讀不影響值。' },
      { n: 3, text: 'constexpr 宣告編譯期常數，可用於陣列大小、樣板參數等常數運算式脈絡。' },
      { n: 4, text: '關係運算子（>、==）回傳 bool；C++ 的 bool 為獨立型別而非整數別名。' },
      { n: 5, text: 'static_assert 搭配 type traits 在編譯期驗證型別，錯誤會直接讓編譯失敗。' },
    ],
  },
  deepDive: [
    {
      heading: 'auto、decltype 與型別推導的細節',
      body:
        '`auto` 會捨棄頂層 const 與參考（`auto x = ref;` 得到值複本），需要保留時用 `auto&`、`const auto&` 或 `decltype(auto)`。`decltype(expr)` 保留運算式的完整型別與值類別，`decltype((x))`（多一層括號）會得到參考。\n\n泛型程式中，回傳轉發時常用 `decltype(auto)` 以精準保留 const／參考。理解這些規則能避免「不小心複製了大型物件」或「回傳懸置參考」等常見錯誤。',
    },
    {
      heading: '隱式轉換、窄化與求值順序',
      body:
        '算術運算前會發生整數提升與 usual arithmetic conversions，可能悄悄改變型別與符號。大括號初始化 `{}` 會禁止窄化轉換（如 `int x{3.5}` 直接報錯），因此優先採用。\n\n運算元的求值順序在多數運算子上是未定序的（unsequenced）；`f(i++, i++)` 這類程式碼是未定義或未指定行為。C++17 收緊了部分順序規則，但仍不應依賴子運算式的相對求值順序。',
    },
    {
      heading: 'sizeof、對齊與可攜性',
      body:
        '物件大小含對齊填充（padding），`sizeof`／`alignof` 反映此事實；重排成員可縮小結構體。在序列化、網路協定或與硬體暫存器互動時，應使用 `<cstdint>` 的固定寬度型別，並留意位元組序（endianness）。\n\n`char` 的符號性是實作定義；表示原始位元組應用 `std::byte` 或 `unsigned char`，而非 `char`。這些細節在跨平台 ABI 與二進位相容性上至關重要。',
    },
  ],
  pitfalls: [
    '`auto` 意外捨棄 const 或參考，導致非預期的複製或無法修改原物件。',
    '有號與無號混合比較／運算，觸發隱式轉換而得到違反直覺的結果。',
    '依賴函式引數或 `a[i] = i++` 這類子運算式的求值順序（多為未定序）。',
    '在序列化或 ABI 邊界使用平台相依的 `int`／`long`，破壞跨平台相容性。',
  ],
  bestPractices: [
    '需要保留 const／參考時使用 `const auto&` 或 `decltype(auto)`，避免多餘複製。',
    '優先採用大括號 `{}` 初始化以在編譯期攔截窄化轉換。',
    '在 ABI／序列化邊界一律使用 `<cstdint>` 固定寬度型別，並明確處理位元組序。',
    '開啟 `-Wconversion -Wsign-conversion`，讓危險的隱式轉換浮現。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '關於 C++ 的型別系統，下列敘述何者正確？',
      options: [
        { id: 'a', text: '型別在執行期才決定，屬於動態型別語言' },
        { id: 'b', text: '每個運算式在編譯期都有確定型別，屬於靜態強型別' },
        { id: 'c', text: '所有變數都必須是 int' },
        { id: 'd', text: 'auto 會讓變數變成動態型別' },
      ],
      correctOptionId: 'b',
      explanation:
        'C++ 為靜態型別語言，型別在編譯期確定；auto 只是讓編譯器推導出一個固定的靜態型別，並非動態型別。參見 Ch.03 PDF 第 9 頁。',
    },
    {
      id: 'q2',
      stem: '為何常建議使用 std::int32_t 這類固定寬度整數，而非直接用 int？',
      options: [
        { id: 'a', text: '固定寬度型別執行速度一定較快' },
        { id: 'b', text: 'int 的大小依平台而異，固定寬度型別可保證跨平台一致' },
        { id: 'c', text: 'int 已被 C++23 移除' },
        { id: 'd', text: '固定寬度型別不需要 #include' },
      ],
      correctOptionId: 'b',
      explanation:
        'int 的寬度由實作定義（常見為 32 位元但不保證）；需要明確位元數時應使用 <cstdint> 的固定寬度型別。參見 Ch.03 PDF 第 21 頁。',
    },
    {
      id: 'q3',
      stem: '下列何者是「左值（lvalue）」的典型特徵？',
      options: [
        { id: 'a', text: '它是一個沒有身分的暫時值' },
        { id: 'b', text: '它有可識別的記憶體位置，通常可以取址' },
        { id: 'c', text: '它只能出現在指定運算子的右側' },
        { id: 'd', text: '它一定是 const' },
      ],
      correctOptionId: 'b',
      explanation:
        '左值具有身分（identity）與可定址性，例如具名變數；右值則是暫時、無名的值。此區分是 move 語意的基礎。參見 Ch.03 PDF 第 38 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['基本型別', '複合型別', '運算子', '運算式'],
    caption:
      '型別系統的層層堆疊：基本型別組成複合型別，再透過運算子構成有型別的運算式。',
  },
  tryIt: {
    code: `#include <cstdint>
#include <iostream>

int main() {
  auto a = 42;
  std::int64_t big = 1'000'000'000'000;
  constexpr double pi = 3.14159;
  std::cout << "int=" << sizeof(a)
            << " int64=" << sizeof(big)
            << " pi=" << pi << '\\n';
  return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Fundamental types - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/types',
      description: 'C++ 基本型別、大小保證與固定寬度別名的完整說明。',
    },
    {
      title: 'Value categories - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/value_category',
      description: 'lvalue／xvalue／prvalue 等值類別的精確定義。',
    },
    {
      title: 'Modern C++ Programming — Basic Concepts I (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/03.Basic_concepts_I.html',
      description: 'Busato 課程第 3 章 HTML 投影片，涵蓋型別系統原文。',
    },
  ],
};

export default ch03BasicConceptsI;
