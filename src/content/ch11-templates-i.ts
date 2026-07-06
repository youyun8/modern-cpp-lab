import type { ChapterContent } from '@/types/ChapterContent';

const ch11TemplatesI: ChapterContent = {
  slug: 'ch11-templates-i',
  chapterLabel: 'Ch.11',
  title: '樣板 I：函式樣板與 Concepts',
  group: 'B · 物件導向與泛型程式設計',
  description:
    '函式樣板、型別推導、type traits 與 C++20 concepts：如何撰寫泛型且具備清楚約束的程式碼。',
  concept: {
    standard: 'C++20',
    body:
      '函式樣板讓同一份邏輯適用於多種型別，編譯器在使用處以樣板引數推導（template argument deduction）產生具體實例。type traits（如 std::is_integral_v、std::remove_reference_t）在編譯期查詢與變換型別，是泛型程式的基礎。C++20 的 concepts 讓你對樣板參數施加具名約束，例如 std::integral 或自訂 concept，把「這個型別必須支援什麼」寫進介面。相較於舊式 SFINAE，concepts 讓約束可讀、錯誤訊息清楚、還能參與多載解析。實務上以 concept 表達需求、以 requires 子句組合條件，能大幅提升泛型 API 的可用性與診斷品質。',
  },
  code: {
    lang: 'cpp',
    code: `#include <concepts>
#include <print>

// 具名 concept：型別必須支援 + 且結果可轉回自身。 [1]
template <typename T>
concept Addable = requires(T a, T b) {
  { a + b } -> std::convertible_to<T>;          // [2]
};

// 以 concept 約束函式樣板；違反約束時錯誤訊息清楚。 [3]
template <Addable T>
T sum(T a, T b) { return a + b; }

// 也可用 requires 子句表達額外限制。 [4]
template <typename T>
  requires std::integral<T>
T twice(T x) { return x + x; }

int main() {
  std::println("{}", sum(3, 4));         // T = int
  std::println("{}", sum(1.5, 2.5));     // T = double
  std::println("{}", twice(21));         // [5] 僅整數可用
  return 0;
}`,
    callouts: [
      { n: 1, text: 'concept 是編譯期的具名布林述詞，描述型別必須滿足的語法／語意需求。' },
      { n: 2, text: 'requires 運算式檢查 a + b 是否合法，且結果可轉換為 T；不符者不滿足 concept。' },
      { n: 3, text: '以 template <Addable T> 約束參數，非 Addable 型別會在呼叫處得到清楚的診斷。' },
      { n: 4, text: 'requires 子句可放在樣板標頭後，表達如 std::integral<T> 等額外條件。' },
      { n: 5, text: 'twice 僅接受整數型別；傳入浮點數會因不滿足約束而編譯失敗，訊息明確。' },
    ],
  },
  deepDive: [
    {
      heading: '兩階段查找與相依名稱',
      body:
        '樣板採兩階段查找：定義期檢查非相依名稱，實例化期才解析相依名稱。相依型別前需加 `typename`（如 `typename T::value_type`），相依樣板成員前需加 `template`（如 `obj.template get<0>()`），否則編譯器無法分辨是型別、成員或比較運算。\n\n這是初學者最常見的樣板編譯錯誤來源之一，理解查找時機能快速定位問題。',
    },
    {
      heading: 'concepts 相對於 enable_if 的優勢',
      body:
        'concepts 提供「包容關係（subsumption）」，讓更嚴格的約束在多載解析中勝出，取代脆弱的 `std::enable_if` 標籤分派。約束違反時的診斷直接指出「不滿足哪個需求」，而非數十行樣板展開。\n\n`requires` 子句與具名 concept 可組合、可重用，讓泛型 API 的契約寫進簽章，是現代泛型程式的首選約束方式。',
    },
    {
      heading: '實例化、編譯成本與 extern template',
      body:
        '樣板在每個使用它的轉譯單元隱式實例化，可能造成重複工作與二進位膨脹。`extern template` 可宣告「不要在此單元實例化」，改由單一單元顯式實例化，縮短編譯時間與體積。\n\n樣板的定義通常必須放在標頭（否則其他單元找不到定義而連結失敗），這也是樣板重編譯成本高的原因；把與型別無關的邏輯抽到非樣板函式可緩解膨脹。',
    },
  ],
  pitfalls: [
    '相依型別前漏加 `typename`、相依樣板成員前漏加 `template`，導致編譯錯誤。',
    '把樣板定義放進 `.cpp`，其他單元使用時出現 undefined reference。',
    '未約束的樣板在型別不符時產生冗長難解的錯誤訊息。',
    '過度約束（over-constrain）反而排除了本應合法的型別。',
  ],
  bestPractices: [
    '以具名 concept 與 `requires` 表達型別契約，取代 `enable_if`。',
    '樣板定義放標頭；與型別無關的邏輯抽到非樣板基底以減少膨脹。',
    '對常用實例以 `extern template` + 單一顯式實例化縮短編譯時間。',
    '為 concept 取語意清楚的名稱，提升 API 可讀性與診斷品質。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '相較於傳統 SFINAE，C++20 concepts 的主要優勢是什麼？',
      options: [
        { id: 'a', text: '它讓程式執行更快' },
        { id: 'b', text: '約束可讀、錯誤訊息清楚，且能直接參與多載解析' },
        { id: 'c', text: '它完全取代了函式樣板' },
        { id: 'd', text: '它只能用於類別而非函式' },
      ],
      correctOptionId: 'b',
      explanation:
        'concepts 把型別需求變成具名、可讀的約束，錯誤訊息大幅改善，並可用於多載解析。參見 Ch.11 PDF 第 44 頁。',
    },
    {
      id: 'q2',
      stem: 'type traits（如 std::is_integral_v<T>）在何時求值？',
      options: [
        { id: 'a', text: '執行期' },
        { id: 'b', text: '編譯期' },
        { id: 'c', text: '連結期' },
        { id: 'd', text: '安裝期' },
      ],
      correctOptionId: 'b',
      explanation:
        'type traits 是編譯期的型別查詢與變換工具，結果在編譯時即確定，可用於樣板與 static_assert。參見 Ch.11 PDF 第 28 頁。',
    },
    {
      id: 'q3',
      stem: '「樣板引數推導（template argument deduction）」指的是？',
      options: [
        { id: 'a', text: '執行期動態決定型別' },
        { id: 'b', text: '編譯器由呼叫時的引數自動推導出樣板參數的型別' },
        { id: 'c', text: '手動為每次呼叫指定型別' },
        { id: 'd', text: '把樣板轉為巨集' },
      ],
      correctOptionId: 'b',
      explanation:
        '呼叫函式樣板時，編譯器依實際引數推導樣板參數，通常不必顯式指定型別。參見 Ch.11 PDF 第 15 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['函式樣板', '型別推導', 'type traits', 'concepts'],
    caption:
      '泛型程式的流程：函式樣板搭配型別推導產生實例，type traits 與 concepts 在編譯期查詢並約束型別。',
  },
  tryIt: {
    code: `#include <concepts>
#include <iostream>

template <typename T>
concept Addable = requires(T a, T b) {
  { a + b } -> std::convertible_to<T>;
};

template <Addable T>
T sum(T a, T b) { return a + b; }

int main() {
  std::cout << sum(3, 4) << '\\n';
  std::cout << sum(1.5, 2.5) << '\\n';
  return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Constraints and concepts - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/constraints',
      description: 'concepts、requires 運算式與約束的完整規則。',
    },
    {
      title: 'Type support (traits) - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/types',
      description: '標準 type traits 一覽與用途。',
    },
    {
      title: 'Modern C++ Programming — Templates I (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/11.Templates_and_metaprogramming_I.html',
      description: 'Busato 課程第 11 章 HTML 投影片，涵蓋函式樣板與 concepts 原文。',
    },
  ],
};

export default ch11TemplatesI;
