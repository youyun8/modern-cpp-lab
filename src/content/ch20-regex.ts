import type { ChapterContent } from '@/types/ChapterContent';

const ch20Regex: ChapterContent = {
  slug: 'ch20-regex',
  chapterLabel: '第 20.2 章',
  title: '正規表示式 <regex>',
  group: '第 4 部：STL 與工具庫',
  description:
    'C++11 的 `<regex>` 提供標準化的正規表示式比對、搜尋與取代，但也以「編譯期無法檢查、執行期偏慢」聞名；本章兼談用法與效能取捨。',
  concept: {
    standard: 'C++11',
    body: '`<regex>` 為 C++ 帶來標準化的正規表示式支援，核心是三個動作：`std::regex_match`（整個字串是否完全符合樣式）、`std::regex_search`（字串中是否存在符合的子區段）、`std::regex_replace`（比對並取代）。搭配 `std::smatch` / `std::cmatch` 可取出擷取群組（capture groups），並以 `std::sregex_iterator` 逐一走訪所有匹配。預設語法為 ECMAScript，也可切換到 basic、extended、grep 等風格。它的最大優點是「標準、可攜、功能完整」；但務實地說，`std::regex` 的執行期效能相對偏弱、編譯出的程式碼較肥，且樣式錯誤只能在執行期以例外形式浮現。因此它適合非熱路徑的解析工作，熱路徑則常改用手寫解析或第三方引擎（RE2、CTRE）。',
  },
  deepDive: [
    {
      heading: '三種操作與擷取群組',
      body: '`regex_match` 要求「整個」輸入字串符合樣式，常用於驗證（如檢查一個字串是否為合法 email 或日期）。`regex_search` 只需在字串某處找到符合的區段，適合抽取。`regex_replace` 則進行取代，並可在替換字串中以 `$1`、`$2` 引用擷取群組。\n\n擷取群組透過 `std::smatch`（對應 `std::string`）或 `std::cmatch`（對應 `const char*`）取得：`m[0]` 是整段匹配，`m[1]`、`m[2]` 依序是各括號群組。要遍歷所有匹配，用 `std::sregex_iterator`，避免自己手動推進位置而出錯。',
    },
    {
      heading: '效能陷阱：重複建構 regex 物件',
      body: '`std::regex` 最常見的效能殺手，是「在迴圈或熱路徑裡反覆建構 regex 物件」。建構 `std::regex` 需要編譯樣式，成本很高；若每次呼叫都重建，開銷會完全淹沒實際比對。\n\n正確做法是把 `std::regex` 建立一次（例如宣告為 `static const` 或提到迴圈外），之後重複使用。即便如此，`std::regex` 的比對本身仍比許多專用引擎慢，關鍵路徑應以剖析數據決定是否改用替代方案。',
    },
    {
      heading: '什麼時候別用 std::regex',
      body: '若樣式在編譯期就已知且效能重要，`CTRE`（Compile-Time Regular Expressions）能在編譯期把樣式轉成程式碼，速度快上數量級且沒有執行期建構成本。若需處理不受信任輸入或超大文本，`RE2` 保證線性時間、可避免災難性回溯（catastrophic backtracking）帶來的 ReDoS 風險。\n\n另外，對於「只是想切割字串或找固定子字串」這類簡單需求，`std::string::find`、`std::string_view` 或 C++20 的 `std::ranges` split view 通常更快也更清楚——別為了小事動用正規表示式引擎。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <iostream>
#include <regex>
#include <string>

int main() {
    const std::string text = "Order A-1024 and B-2048 have shipped";

    // Build once and reuse; declare const to avoid recompiling the pattern
    static const std::regex code_re(R"(([A-Z])-(\\d+))");   // [1]

    // Validation: does the whole string fully match?
    std::cout << std::boolalpha
              << std::regex_match("A-1024", code_re) << '\\n';  // [2]

    // Iterate over all matches and extract the capture groups
    for (std::sregex_iterator it(text.begin(), text.end(), code_re), end;
         it != end; ++it) {                                    // [3]
        const std::smatch& m = *it;
        std::cout << m[1] << " / " << m[2] << '\\n';            // [4]
    }

    // Replace: reference the second capture group with $2
    std::cout << std::regex_replace(text, code_re, "[$2]") << '\\n'; // [5]
    return 0;
}`,
    callouts: [
      {
        n: 1,
        text: '以原始字串字面值 `R"(...)"` 撰寫樣式，避免反斜線轉義地獄；建立一次後重用。',
      },
      {
        n: 2,
        text: '`regex_match` 要求整個字串完全符合，適合輸入驗證。',
      },
      {
        n: 3,
        text: '`std::sregex_iterator` 安全地遍歷所有匹配，不必手動推進位置。',
      },
      {
        n: 4,
        text: '`m[1]`、`m[2]` 是括號擷取群組，`m[0]` 則是整段匹配。',
      },
      {
        n: 5,
        text: '`regex_replace` 以 `$1`、`$2` 在替換字串中引用擷取群組。',
      },
    ],
  },
  pitfalls: [
    '在迴圈或熱路徑內反覆建構 `std::regex` 代價極高——建構會編譯樣式，務必建立一次後重用。',
    '樣式語法錯誤只能在執行期以 `std::regex_error` 例外浮現，編譯期無從檢查。',
    '`std::regex` 的比對效能與程式碼體積都偏重，不適合效能關鍵路徑或超大文本。',
    '複雜樣式可能發生災難性回溯（catastrophic backtracking），面對不受信任輸入有 ReDoS 風險。',
  ],
  bestPractices: [
    '把 `std::regex` 宣告為 `static const` 或提到迴圈外，只建構一次。',
    '用原始字串字面值 `R"(...)"` 撰寫樣式，避免雙重轉義造成的錯誤。',
    '簡單的搜尋／切割優先用 `std::string::find`、`string_view` 或 ranges，不要動用正規表示式。',
    '效能關鍵或編譯期已知樣式改用 CTRE；處理不受信任輸入改用線性時間保證的 RE2。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '關於 `std::regex` 的效能與正確用法，下列何者最正確？',
      options: [
        { id: 'a', text: '建構 `std::regex` 會編譯樣式、成本很高，應建立一次後重複使用' },
        { id: 'b', text: '樣式語法錯誤會在編譯期被偵測出來' },
        { id: 'c', text: '`std::regex` 在所有情境下都比手寫解析或 RE2 更快' },
        { id: 'd', text: '`regex_search` 要求整個字串完全符合樣式' },
      ],
      correctOptionId: 'a',
      explanation:
        '建構 `std::regex` 需編譯樣式，代價高，應重用。樣式錯誤只在執行期丟出 `regex_error`；`std::regex` 效能通常不及 RE2／CTRE；要求整段符合的是 `regex_match`，`regex_search` 只需找到子區段。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['編譯樣式（一次）', 'match / search / replace', '擷取群組 smatch', '效能取捨評估'],
    caption: '`<regex>` 功能完整且標準，但建構成本與執行效能促使熱路徑改採 CTRE 或 RE2。',
  },
  tryIt: {
    code: `#include <iostream>
#include <regex>
#include <string>

int main() {
    static const std::regex email_re(
        R"((\\w+)@(\\w+)\\.(\\w+))");
    const std::string s = "contact: alice@example.com";

    std::smatch m;
    if (std::regex_search(s, m, email_re)) {
        std::cout << "user: " << m[1] << '\\n';
        std::cout << "host: " << m[2] << '.' << m[3] << '\\n';
    }
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Regular expressions library - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/regex',
      description: 'regex_match／search／replace、smatch 與 iterator 的完整參考。',
    },
    {
      title: 'CTRE: Compile-Time Regular Expressions',
      href: 'https://github.com/hanickadot/compile-time-regular-expressions',
      description: '編譯期正規表示式，效能遠勝 std::regex 且無執行期建構成本。',
    },
  ],
};

export default ch20Regex;
