import type { ChapterContent } from '@/types/ChapterContent';

const ch19Utilities: ChapterContent = {
  slug: 'ch19-utilities',
  chapterLabel: 'Ch.19',
  title: '工具庫：span、format、variant',
  group: 'D · STL 與工具庫',
  description:
    'std::span、std::mdspan、std::format 與 std::variant 等現代工具：如何以零成本檢視、安全格式化與型別安全的和型別改善程式。',
  concept: {
    standard: 'C++23',
    body:
      'C++17 起標準庫加入多個高價值工具。std::span（C++20）是對連續記憶體的非擁有檢視，攜帶指標與長度，讓函式接受任意陣列／vector 而不必樣板化或傳指標與大小；std::mdspan（C++23）把此概念推廣到多維。std::format／std::print（C++20／23）提供型別安全、可本地化的格式化，取代 printf 與冗長的 iostream。std::optional 表示「可能沒有值」，std::variant 是型別安全的和型別（可持有數種型別之一），搭配 std::visit 做窮盡式處理；std::expected（C++23）則以值傳遞錯誤，取代例外於可預期的失敗路徑。這些工具都以零或極低成本提供更強的安全性與表達力。',
  },
  code: {
    lang: 'cpp',
    code: `#include <print>
#include <span>
#include <string>
#include <variant>
#include <vector>

// std::span：接受任意連續序列而不複製、不樣板化。 [1]
long long sum(std::span<const int> data) {
    long long s = 0;
    for (int x : data) s += x;
    return s;
}

using Value = std::variant<int, double, std::string>;  // [2] 型別安全和型別

std::string describe(const Value& v) {
    return std::visit(
        [](const auto& x) {               // [3] 窮盡式處理
            return std::format("{}", x);  // [4]
        },
        v);
}

int main() {
    std::vector<int> v{1, 2, 3, 4};
    int raw[] = {10, 20, 30};
    std::println("vector sum = {}", sum(v));    // [5] 傳 vector
    std::println("array sum  = {}", sum(raw));  //    傳 C 陣列

    Value a = 42, b = 3.14, c = std::string{"hi"};
    std::println("{} / {} / {}", describe(a), describe(b), describe(c));
    return 0;
}`,
    callouts: [
      { n: 1, text: 'std::span<const int> 是非擁有檢視，函式因此能接受 vector、std::array 或 C 陣列而不複製。' },
      { n: 2, text: 'std::variant 一次只持有其中一種型別的值，是型別安全的和型別（取代 union）。' },
      { n: 3, text: 'std::visit 對 variant 目前持有的型別分派到對應處理，確保所有情況都被涵蓋。' },
      { n: 4, text: 'std::format 以 {} 佔位產生型別安全的字串，泛型 lambda 可統一處理各型別。' },
      { n: 5, text: '同一個 sum 函式無需多載即可接受 vector 與原生陣列，展現 span 的通用性。' },
    ],
  },
  deepDive: [
    {
      heading: 'span／mdspan 的語意與邊界安全',
      body:
        '`std::span` 是非擁有檢視，預設不做邊界檢查；`subspan`、`first`、`last` 越界是 UB，需自行確保範圍。extent 可為動態或編譯期固定（`std::span<int, 4>`），後者讓編譯器最佳化更積極。\n\n`std::mdspan`（C++23）為多維檢視，可指定佈局（`layout_right`／`layout_left`／`layout_stride`），正好對應 C／Fortran 記憶體序與 BLAS／GPU 資料佈局，是撰寫可攜高效數值核心的利器。',
    },
    {
      heading: 'format／print 的檢查、擴充與效能',
      body:
        '`std::format` 對「編譯期常數格式字串」做編譯期檢查；執行期動態格式字串則改用 `std::vformat`。為自訂型別特化 `std::formatter` 即可讓其支援 `{}`。\n\n效能敏感處用 `std::format_to` 直接寫入既有緩衝區，避免配置暫時字串。相較 `iostream`，格式化 API 更快且無 `<<` 串接的型別不符風險。',
    },
    {
      heading: '和型別與現代錯誤處理',
      body:
        '`std::variant` + `std::visit`（搭配 overloaded 慣用法）可窮盡處理各種型別；若在賦值中拋出例外，variant 可能進入 `valueless_by_exception` 狀態，需留意。`std::get<T>` 型別不符會拋 `bad_variant_access`。\n\n可預期的失敗優先用 `std::optional`／`std::expected`（C++23），並善用其 monadic 操作 `and_then`／`transform`／`or_else` 串接，寫出無巢狀 if 的錯誤處理流程。',
    },
  ],
  pitfalls: [
    '`std::span`／`string_view` 指向暫時物件或已釋放記憶體，造成懸置。',
    '`std::span::subspan` 等越界操作不檢查邊界，屬未定義行為。',
    '`std::get<T>` 對 variant 目前未持有的型別呼叫，拋出 `bad_variant_access`。',
    '對執行期動態格式字串誤用 `std::format`——應改用 `std::vformat`。',
  ],
  bestPractices: [
    '以 `span`／`string_view` 作唯讀參數（傳值即可），但勿指向暫時物件。',
    '為自訂型別特化 `std::formatter`；高效輸出用 `std::format_to`。',
    '數值核心以 `mdspan` 表達多維佈局，對應 BLAS／GPU 記憶體序。',
    '可復原錯誤用 `expected` 並以 monadic 操作串接。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: 'std::span 的關鍵特性是什麼？',
      options: [
        { id: 'a', text: '它擁有並複製底層資料' },
        { id: 'b', text: '它是對連續記憶體的非擁有檢視，攜帶指標與長度' },
        { id: 'c', text: '它只能檢視 std::vector' },
        { id: 'd', text: '它會自動釋放記憶體' },
      ],
      correctOptionId: 'b',
      explanation:
        'std::span 不擁有資料，只是「指標 + 長度」的輕量檢視，讓函式接受任意連續序列而不複製。參見 Ch.19 PDF 第 18 頁。',
    },
    {
      id: 'q2',
      stem: 'std::variant 搭配 std::visit 的主要好處是什麼？',
      options: [
        { id: 'a', text: '它可以同時持有所有型別的值' },
        { id: 'b', text: '提供型別安全的和型別，並以窮盡式的方式處理目前持有的型別' },
        { id: 'c', text: '它比 union 更省記憶體且不需要知道型別' },
        { id: 'd', text: '它自動平行化程式' },
      ],
      correctOptionId: 'b',
      explanation:
        'variant 是型別安全的和型別，std::visit 依當前持有型別分派，鼓勵涵蓋所有可能情況。參見 Ch.19 PDF 第 40 頁。',
    },
    {
      id: 'q3',
      stem: '相較於 printf，std::format／std::print 的優勢主要在於？',
      options: [
        { id: 'a', text: '型別安全與可擴充的格式化，避免格式字串與引數不符的錯誤' },
        { id: 'b', text: '它總是比 printf 快十倍' },
        { id: 'c', text: '它不需要任何標頭' },
        { id: 'd', text: '它只支援整數' },
      ],
      correctOptionId: 'a',
      explanation:
        'std::format 在編譯期／執行期檢查型別與佔位符，避免 printf 常見的格式不符 UB，並可為自訂型別擴充。參見 Ch.19 PDF 第 29 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['span', 'mdspan', 'format', 'variant'],
    caption:
      '現代工具庫一覽：span／mdspan 提供非擁有檢視，format 提供安全格式化，variant 提供型別安全和型別。',
  },
  tryIt: {
    code: `#include <iostream>
#include <numeric>
#include <span>
#include <vector>

long long sum(std::span<const int> data) { return std::accumulate(data.begin(), data.end(), 0LL); }

int main() {
    std::vector<int> v{1, 2, 3, 4};
    int raw[] = {10, 20, 30};
    std::cout << "vector sum = " << sum(v) << '\\n';
    std::cout << "array sum  = " << sum(raw) << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::span - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/container/span',
      description: '非擁有連續序列檢視的介面與用法。',
    },
    {
      title: 'std::format - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/utility/format/format',
      description: '格式化字串語法與自訂型別擴充。',
    },
    {
      title: 'Modern C++ Programming — Utilities (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/19.Utilities.html',
      description: 'Busato 課程第 19 章 HTML 投影片，涵蓋工具庫原文。',
    },
  ],
};

export default ch19Utilities;
