import type { ChapterContent } from '@/types/ChapterContent';

const ch13TranslationUnitsI: ChapterContent = {
  slug: 'ch13-translation-units-i',
  chapterLabel: 'Ch.13',
  title: '轉譯單元 I：連結與 ODR',
  group: 'C · 建置系統與慣例',
  description:
    '轉譯單元、連結性（linkage）與單一定義原則（ODR）：宣告與定義的差異、internal／external linkage，以及如何避免多重定義。',
  concept: {
    standard: 'C++23',
    body:
      '一個轉譯單元（translation unit）是一個 .cpp 及其展開後的所有標頭。宣告（declaration）告訴編譯器某符號存在，定義（definition）提供其實體；同一符號可多次宣告，但受單一定義原則（ODR）約束：在整個程式中，非 inline 的函式與變數只能有唯一定義。連結性決定符號的可見範圍：external linkage 可跨轉譯單元存取（一般全域函式與變數），internal linkage 僅限本單元（以 static 或匿名 namespace 標記）。在標頭中定義非 inline 的函式或全域變數會在多個單元產生重複定義而連結失敗；解法是宣告放標頭、定義放單一 .cpp，或使用 inline／constexpr。',
  },
  code: {
    lang: 'cpp',
    code: `// ---- math.hpp（標頭：只放宣告與 inline 定義）----
#pragma once
int add(int a, int b);      // [1] 宣告：無函式本體
inline int square(int x) {  // [2] inline 允許出現在多個單元
    return x * x;
}
constexpr double kPi = 3.141592653589793;  // [3] constexpr 隱含 inline

// ---- math.cpp（唯一定義處）----
// #include "math.hpp"
int add(int a, int b) { return a + b; }  // [4] 定義只出現一次

// ---- util.cpp（本檔專用符號）----
namespace {  // [5] 匿名 namespace：internal linkage
int secret() { return 42; }
}  // namespace`,
    callouts: [
      { n: 1, text: '宣告只描述符號存在與其型別／簽章，可在多個標頭與單元中重複出現。' },
      { n: 2, text: 'inline 函式可在多個轉譯單元各有一份相同定義，連結器會合併，不違反 ODR。' },
      { n: 3, text: 'constexpr 變數具有隱含的 inline 語意，可安全定義於標頭並跨單元共用。' },
      { n: 4, text: '非 inline 函式的定義在整個程式中只能出現一次，通常放在對應的單一 .cpp。' },
      { n: 5, text: '匿名 namespace 賦予其內符號 internal linkage，僅本轉譯單元可見，避免名稱衝突。' },
    ],
  },
  deepDive: [
    {
      heading: 'inline 的真正語意與 inline 變數',
      body:
        '`inline` 的現代意義並非「請內聯」，而是「此定義可出現在多個轉譯單元，連結器應合併為一」。這正是 header-only 函式庫的基礎。C++17 的 inline 變數讓標頭中的全域變數／類別靜態成員也能安全單一化。\n\n因此標頭中要放函式或變數定義時，應標 `inline`（`constexpr` 已隱含 inline），否則多個單元包含即違反 ODR。',
    },
    {
      heading: '連結性的三個類別',
      body:
        '符號有外部連結（跨單元可見）、內部連結（僅本單元）與無連結（區域）。命名空間範圍的 `const` 變數預設為內部連結（與 C 不同）；需要跨單元共享要加 `extern`。\n\n匿名命名空間賦予內部連結，且比檔案範圍 `static` 更通用（可用於型別）。理解連結性是設計乾淨函式庫介面、避免符號衝突的基礎。',
    },
    {
      heading: 'ODR 違反的沉默後果',
      body:
        'ODR 違反（同一實體有兩個不同定義、或以不同編譯旗標／型別佈局編譯後連結在一起）是未定義行為，且常常沉默——連結成功卻在執行期詭異崩潰。\n\n混用不同 `-D` 巨集、不同標準版本或不同結構體佈局的目的檔是典型來源。LTO 與部分連結器提供 ODR 檢查，可在建置期揪出部分違反。',
    },
  ],
  pitfalls: [
    '在標頭放置非 `inline` 的函式或變數定義，多單元包含後連結失敗或違反 ODR。',
    '以不同編譯旗標／巨集定義編譯各單元後連結，造成沉默的 ODR 違反與崩潰。',
    '誤以為命名空間範圍的 `const` 具外部連結——它預設是內部連結。',
    '在標頭以 `static` 定義函式，導致每個單元各有一份副本而非共享。',
  ],
  bestPractices: [
    '標頭中的函式／變數定義一律標 `inline`（或使用 `constexpr`／樣板）。',
    '標頭常數用 inline 變數或 `constexpr` 共享單一定義。',
    'TU 私有的符號放匿名命名空間，而非檔案範圍 `static`。',
    '確保所有目的檔以一致的旗標、巨集與標準版本編譯，避免 ODR 違反。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '單一定義原則（ODR）對非 inline 的函式有何規定？',
      options: [
        { id: 'a', text: '整個程式中最多只能有一個定義' },
        { id: 'b', text: '每個轉譯單元都必須有一個定義' },
        { id: 'c', text: '完全不能有定義' },
        { id: 'd', text: '定義數量沒有限制' },
      ],
      correctOptionId: 'a',
      explanation:
        'ODR 要求非 inline 的函式與變數在整個程式中只有唯一定義，否則連結時會出現多重定義錯誤。參見 Ch.13 PDF 第 24 頁。',
    },
    {
      id: 'q2',
      stem: '在標頭檔中放置一個普通（非 inline）的函式「定義」，通常會發生什麼？',
      options: [
        { id: 'a', text: '完全沒問題' },
        { id: 'b', text: '被多個 .cpp include 後產生重複定義，連結失敗' },
        { id: 'c', text: '編譯器自動忽略重複' },
        { id: 'd', text: '程式執行變慢但可連結' },
      ],
      correctOptionId: 'b',
      explanation:
        '多個單元 include 同一標頭會各得一份定義，違反 ODR 導致連結錯誤；應改用 inline 或把定義移到單一 .cpp。參見 Ch.13 PDF 第 31 頁。',
    },
    {
      id: 'q3',
      stem: '要讓某個符號僅在其所在的轉譯單元內可見，最佳做法是？',
      options: [
        { id: 'a', text: '把它放進匿名 namespace（或標記 static）' },
        { id: 'b', text: '將它宣告為 extern' },
        { id: 'c', text: '把它放進標頭檔' },
        { id: 'd', text: '將它宣告為 virtual' },
      ],
      correctOptionId: 'a',
      explanation:
        '匿名 namespace 或 static 賦予 internal linkage，使符號僅限本單元，避免污染全域命名空間。參見 Ch.13 PDF 第 40 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['原始碼', '轉譯單元', '目的檔', '連結'],
    caption:
      '從原始碼到執行檔：每個 .cpp 連同其標頭形成轉譯單元，編譯為目的檔後由連結器解析符號並合併。',
  },
  tryIt: {
    code: `#include <iostream>

inline int square(int x) { return x * x; }  // inline 可安全共用
constexpr double kPi = 3.14159265358979;

namespace {
int secret() { return 42; }  // internal linkage
}  // namespace

int main() {
    std::cout << "square(5) = " << square(5) << '\\n';
    std::cout << "kPi = " << kPi << '\\n';
    std::cout << "secret = " << secret() << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'One Definition Rule - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/definition',
      description: 'ODR 的精確條文與例外（inline、樣板等）。',
    },
    {
      title: 'Storage class specifiers / linkage - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/storage_duration',
      description: 'internal 與 external linkage 的規則。',
    },
    {
      title: 'Modern C++ Programming — Translation Units I (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/13.Translation_units_I.html',
      description: 'Busato 課程第 13 章 HTML 投影片，涵蓋連結與 ODR 原文。',
    },
  ],
};

export default ch13TranslationUnitsI;
