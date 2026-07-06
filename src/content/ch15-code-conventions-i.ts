import type { ChapterContent } from '@/types/ChapterContent';

const ch15CodeConventionsI: ChapterContent = {
  slug: 'ch15-code-conventions-i',
  chapterLabel: 'Ch.15',
  title: '程式慣例 I：專案結構',
  group: 'C · 建置系統與慣例',
  description:
    '專案佈局、命名慣例與標頭檔組織原則：如何安排 include／src／tests 目錄並維持一致的命名風格。',
  concept: {
    standard: 'C++23',
    body: '良好的專案結構讓程式易於瀏覽、建置與測試。常見佈局把公開標頭放在 include/<專案名>/、實作放在 src/、測試放在 tests/，並以 CMake 描述目標與相依。標頭應以 #pragma once 或 include guard 防止重複包含，並遵循「self-contained header」原則：每個標頭都能獨立編譯，自行 include 其所需。命名慣例雖無單一標準，但重點是一致：常見以 PascalCase 命名型別、snake_case 或 camelCase 命名函式與變數、UPPER_CASE 命名巨集，並避免以底線開頭的保留名稱。include 順序建議由「自身標頭 → 專案標頭 → 第三方 → 標準庫」，有助於暴露隱藏的相依。',
  },
  code: {
    lang: 'bash',
    code: `myproject/
├── include/myproject/       # [1] 公開標頭，對外 API
│   └── engine.hpp
├── src/                     # [2] 實作檔（.cpp）
│   ├── engine.cpp
│   └── main.cpp
├── tests/                   # [3] 單元測試
│   └── engine_test.cpp
├── third_party/             # [4] 外部相依（或用套件管理器）
└── CMakeLists.txt           # [5] 建置設定的單一入口`,
    callouts: [
      {
        n: 1,
        text: '公開標頭置於 include/<專案名>/，使用端以 #include <myproject/engine.hpp> 引用，路徑清楚。',
      },
      { n: 2, text: 'src/ 存放實作；每個 .cpp 對應一個轉譯單元，定義只出現一次。' },
      { n: 3, text: 'tests/ 與程式碼分離，便於獨立建置與 CI 執行。' },
      { n: 4, text: 'third_party/ 隔離外部程式碼；現代做法多改用 vcpkg／Conan 等套件管理器。' },
      { n: 5, text: 'CMakeLists.txt 作為建置的單一事實來源，描述目標、相依與編譯選項。' },
    ],
  },
  deepDive: [
    {
      heading: 'include 機制與 IWYU',
      body: '以 `<>` 引用系統／第三方標頭、以 `""` 引用專案標頭。公開標頭置於 `include/<專案名>/` 讓引用路徑帶命名前綴，避免與其他函式庫衝突。\n\n遵循 include-what-you-use：每個檔案直接引用它實際用到的標頭，不倚賴間接傳遞的包含。前置宣告可切斷不必要的相依、加快編譯，但需注意不能對不完整型別取 `sizeof` 或存取成員。',
    },
    {
      heading: '公開 API 邊界與封裝',
      body: '把公開標頭與內部實作標頭分離：使用者只該看到穩定的公開介面。API 邊界常以 PIMPL 隱藏實作、降低重編譯，並以 inline namespace 做版本化（如 `v1`）以在不破壞既有使用者下演進。\n\n清楚的邊界讓函式庫的 ABI 與相依可控，是可長期維護的關鍵。',
    },
    {
      heading: '以 target 為中心的 CMake',
      body: '現代 CMake 以 target 表達一切：`target_include_directories`、`target_compile_features`、`target_link_libraries` 搭配 `PUBLIC`／`PRIVATE`／`INTERFACE` 控制「使用需求（usage requirements）」的傳遞。\n\n避免全域的 `include_directories`／`add_definitions`，因為它們污染所有 target、難以推理。以 `install(EXPORT)` 匯出 target 讓下游能 `find_package` 取用。',
    },
  ],
  pitfalls: [
    '使用相對路徑 `#include "../../foo.hpp"`，脆弱且難以重構。',
    '對外洩漏內部實作標頭，使用者依賴了不穩定的細節。',
    '出現「上帝標頭」（把所有東西塞進單一巨大標頭），拖慢編譯。',
    '標頭間循環包含，或倚賴間接傳遞的 `#include`。',
  ],
  bestPractices: [
    '每個標頭都自足（self-contained）並可獨立編譯；套用 include-what-you-use。',
    '公開標頭置於帶專案前綴的 include 目錄；分離公開與內部標頭。',
    '以前置宣告與 PIMPL 降低相依與重編譯。',
    '以 target 為中心撰寫 CMake，正確設定 PUBLIC／PRIVATE 可見性。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '「self-contained header（自足標頭）」原則指的是什麼？',
      options: [
        { id: 'a', text: '標頭檔不能超過 100 行' },
        { id: 'b', text: '每個標頭都能獨立編譯，自行 include 其所需的一切' },
        { id: 'c', text: '標頭檔不可以有任何 include' },
        { id: 'd', text: '所有標頭必須放在同一個資料夾' },
      ],
      correctOptionId: 'b',
      explanation:
        '自足標頭能單獨編譯而不依賴外部先行 include，避免隱藏的相依與脆弱的包含順序。參見 Ch.15 PDF 第 22 頁。',
    },
    {
      id: 'q2',
      stem: '#pragma once 的用途是什麼？',
      options: [
        { id: 'a', text: '讓標頭只被編譯一次以防止重複包含' },
        { id: 'b', text: '讓函式變成 inline' },
        { id: 'c', text: '停用最佳化' },
        { id: 'd', text: '標記檔案為唯讀' },
      ],
      correctOptionId: 'a',
      explanation:
        '#pragma once（或傳統 include guard）確保同一標頭在單一轉譯單元中只被包含一次，避免重複定義。參見 Ch.15 PDF 第 15 頁。',
    },
    {
      id: 'q3',
      stem: '關於命名慣例，最重要的原則是什麼？',
      options: [
        { id: 'a', text: '一定要用 PascalCase' },
        { id: 'b', text: '在整個專案中保持一致，並避免使用保留名稱（如以底線加大寫開頭）' },
        { id: 'c', text: '變數名稱越短越好' },
        { id: 'd', text: '所有名稱都用全大寫' },
      ],
      correctOptionId: 'b',
      explanation:
        '沒有唯一正確的命名風格，但整個專案的一致性最重要；同時要避開標準保留的識別字。參見 Ch.15 PDF 第 34 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['include/', 'src/', 'tests/', 'CMake'],
    caption: '典型專案佈局：公開標頭、實作與測試分離，並由 CMake 作為建置的單一入口統整。',
  },
  tryIt: {
    code: `#include <iostream>

// 想像這是 include/myproject/engine.hpp 的內容（自足標頭）
struct Engine {
  int rpm = 0;
  void rev(int by) { rpm += by; }
};

int main() {
  Engine e;
  e.rev(1500);
  std::cout << "rpm = " << e.rpm << '\\n';
  return 0;
}`,
  },
  furtherReading: [
    {
      title: 'C++ Core Guidelines',
      href: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines',
      description: 'Stroustrup 與 Sutter 主編的權威風格與實務指南。',
    },
    {
      title: 'Canonical Project Structure (Pitchfork)',
      href: 'https://api.csswg.org/bikeshed/?force=1&url=https://raw.githubusercontent.com/vector-of-bool/pitchfork/develop/data/spec.bs',
      description: '一份廣被引用的 C++ 專案目錄結構規範。',
    },
    {
      title: 'Modern C++ Programming — Code Conventions I (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/15.Code_conventions_I.html',
      description: 'Busato 課程第 15 章 HTML 投影片，涵蓋專案結構原文。',
    },
  ],
};

export default ch15CodeConventionsI;
