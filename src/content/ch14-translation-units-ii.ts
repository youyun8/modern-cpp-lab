import type { ChapterContent } from '@/types/ChapterContent';

const ch14TranslationUnitsII: ChapterContent = {
  slug: 'ch14-translation-units-ii',
  chapterLabel: 'Ch.14',
  title: '轉譯單元 II：Modules',
  group: 'C · 建置系統與慣例',
  description:
    'C++20 Modules、#include 機制與函式庫的組織：模組如何取代文字式的標頭包含，改善編譯速度與封裝。',
  concept: {
    standard: 'C++20',
    body:
      '傳統 #include 是純文字複製貼上：每個單元都重新解析被包含的標頭，造成重複工作與巨集洩漏。C++20 的 Modules 改為以編譯後的二進位模組介面（BMI）匯入，只需編譯一次即可重複使用，並且不傳遞巨集、不受包含順序影響。以 export module math; 宣告模組，用 export 標示對外符號，其餘為模組私有。使用端以 import math; 匯入。模組能顯著縮短大型專案的編譯時間並強化封裝，但需要建置系統與編譯器支援，且與既有標頭生態的整合仍在成熟中。過渡期可用 import <vector>; 形式匯入標準標頭單元。',
  },
  code: {
    lang: 'cpp',
    code: `// ---- math.ixx / math.cppm（模組介面單元）----
export module math;  // [1] 宣告模組名稱

export int add(int a, int b) {  // [2] export：對匯入端可見
    return a + b;
}

int helper() { return 1; }  // [3] 未 export：模組私有

export namespace geo {  // [4] 可 export 整個 namespace
double area(double r) { return 3.14159265 * r * r; }
}  // namespace geo

// ---- main.cpp（使用端）----
// import math;                          [5] 匯入編譯後的模組介面
// int main() { return add(2, 3) + (int)geo::area(1.0); }`,
    callouts: [
      { n: 1, text: 'export module math; 建立一個具名模組，取代以標頭檔為單位的組織方式。' },
      { n: 2, text: 'export 標示的符號才會對 import 端可見，形成明確的公開介面。' },
      { n: 3, text: '未加 export 的符號屬模組內部，外部無法存取，強化封裝。' },
      { n: 4, text: 'export 可套用於整個 namespace，一次公開其內所有符號。' },
      { n: 5, text: 'import math; 匯入編譯好的 BMI，不做文字展開，也不會洩漏巨集或受包含順序影響。' },
    ],
  },
  deepDive: [
    {
      heading: '模組的建置模型與 BMI',
      body:
        '每個具名模組有介面單元（`export module m;`）與可選的實作單元。編譯介面時產生二進位模組介面（BMI），供 `import` 使用。BMI 與編譯器、版本、旗標強相關，不可跨工具鏈散布，也不應納入版本控制。\n\n這帶來建置順序相依：使用 `import m;` 的單元必須在 `m` 的 BMI 產生後才能編譯。因此建置系統（CMake 3.28+、Ninja）必須理解模組相依圖，這也是模組工具鏈成熟較慢的原因。',
    },
    {
      heading: '遷移策略：header units 與 import std',
      body:
        'C++23 的 `import std;` 一次匯入整個標準庫，可大幅縮短編譯時間（在支援的工具鏈上）。既有標頭可用 header unit（`import <vector>;`）漸進採用，而不必立即改寫成具名模組。\n\n遷移時可用 global module fragment（在 `module;` 之後、`export module` 之前放 `#include`）容納尚未模組化的舊標頭。建議由葉節點模組開始、逐步向上遷移。',
    },
    {
      heading: '封裝與 ODR 的實質收益',
      body:
        '模組只匯出 `export` 的實體，其餘具內部連結，天然強化封裝並消除巨集洩漏——`import` 不會把被匯入模組的巨集帶入。相較 `#include` 的文字展開，模組不受包含順序影響，也不重複解析。\n\n代價是目前 IDE、靜態分析與跨編譯器互通仍在成熟中；大型專案宜評估工具鏈整備度後再全面採用。',
    },
  ],
  pitfalls: [
    '把 BMI 當成可散布產物或納入版控——它與編譯器版本、旗標綁定。',
    '建置系統不理解模組相依順序，導致找不到 BMI 而編譯失敗。',
    '期望被 `import` 的模組會傳遞其內部 `#define` 巨集——巨集不跨模組。',
    '對同一標頭同時 `#include` 與 `import`，造成重複與混亂。',
  ],
  bestPractices: [
    '在支援的工具鏈上使用 `import std;` 以縮短編譯時間。',
    '以 CMake 3.28+／Ninja 讓建置系統管理模組相依圖。',
    '透過 header units 與 global module fragment 漸進遷移舊標頭。',
    '全面採用前先評估 IDE 與靜態分析工具的模組支援度。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '相較於傳統 #include，C++20 Modules 的主要優點是什麼？',
      options: [
        { id: 'a', text: '完全不需要編譯' },
        { id: 'b', text: '編譯後的模組介面可重複使用，不做文字展開、不洩漏巨集，且與包含順序無關' },
        { id: 'c', text: '模組會自動平行化程式' },
        { id: 'd', text: '模組讓所有函式變成 virtual' },
      ],
      correctOptionId: 'b',
      explanation:
        'Modules 以編譯後的 BMI 匯入而非重複解析文字，改善編譯時間與封裝，且不傳遞巨集。參見 Ch.14 PDF 第 19 頁。',
    },
    {
      id: 'q2',
      stem: '在模組介面中，一個符號要能被 import 端使用，必須？',
      options: [
        { id: 'a', text: '以 export 標示' },
        { id: 'b', text: '以 static 標示' },
        { id: 'c', text: '放進匿名 namespace' },
        { id: 'd', text: '宣告為 private' },
      ],
      correctOptionId: 'a',
      explanation:
        '只有以 export 標示的實體才屬模組的公開介面；其餘為模組私有，外部不可見。參見 Ch.14 PDF 第 27 頁。',
    },
    {
      id: 'q3',
      stem: '為什麼 #include 被稱為「文字式」包含機制？',
      options: [
        { id: 'a', text: '因為它只能包含純文字檔' },
        { id: 'b', text: '因為前置處理器實際上把標頭內容原封不動貼進單元，每個單元都重新解析' },
        { id: 'c', text: '因為它會把程式轉成文字輸出' },
        { id: 'd', text: '因為它只在執行期作用' },
      ],
      correctOptionId: 'b',
      explanation:
        '#include 由前置處理器做文字複製貼上，導致重複解析與巨集洩漏，這正是 Modules 想解決的問題。參見 Ch.14 PDF 第 12 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['#include', 'module', 'BMI', '連結'],
    caption:
      '從文字包含到模組：#include 逐單元重新解析，Modules 則編譯出可重用的二進位模組介面（BMI）供匯入。',
  },
  tryIt: {
    code: `// 註：多數線上編譯器對 Modules 支援有限；以下為等價的傳統寫法示意。
#include <iostream>

int add(int a, int b) { return a + b; }
namespace geo {
double area(double r) { return 3.14159265 * r * r; }
}  // namespace geo

int main() {
    std::cout << "add(2,3) = " << add(2, 3) << '\\n';
    std::cout << "area(1.0) = " << geo::area(1.0) << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Modules - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/modules',
      description: 'C++20 Modules 的語法、介面單元與匯入規則。',
    },
    {
      title: 'Overview of modules in C++ (Microsoft Learn)',
      href: 'https://learn.microsoft.com/en-us/cpp/cpp/modules-cpp',
      description: 'MSVC 觀點的模組概觀與實務建置說明。',
    },
    {
      title: 'Modern C++ Programming — Translation Units II (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/14.Translation_units_II.html',
      description: 'Busato 課程第 14 章 HTML 投影片，涵蓋 Modules 原文。',
    },
  ],
};

export default ch14TranslationUnitsII;
