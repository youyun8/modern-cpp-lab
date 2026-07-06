import type { ChapterContent } from '@/types/ChapterContent';

const ch19StringView: ChapterContent = {
  slug: 'ch19-string-view',
  chapterLabel: '第 19.1 章',
  title: 'std::string_view：非擁有字串檢視',
  group: '第 4 部：STL 與工具庫',
  description:
    'std::string_view 的表示法、參數設計、切片、與生命週期陷阱：如何用非擁有字串檢視避免複製但不製造懸置。',
  concept: {
    standard: 'C++17',
    body: '`std::string_view` 是對一段字元序列的非擁有檢視，通常只保存指標與長度；它可指向 `std::string`、字串字面值、緩衝區的一部分，適合作為唯讀函式參數，讓 API 同時接受 `std::string`、`const char*` 與子字串而不配置新字串。它不保證以 null 結尾，也不負責延長來源生命週期；因此不能把指向暫時 `std::string`、區域字串或會重新配置的字串內容的 view 長期保存。設計規則很簡單：`string_view` 適合「借來讀一下」，若要儲存、跨執行緒、傳給需要 C 字串的 API，通常要轉成 `std::string` 擁有資料。',
  },
  code: {
    lang: 'cpp',
    code: `#include <iostream>
#include <string>
#include <string_view>
#include <vector>

bool starts_with(std::string_view text, std::string_view prefix) {  // [1]
    return text.size() >= prefix.size() && text.substr(0, prefix.size()) == prefix;
}

std::vector<std::string_view> split_words(std::string_view line) {  // [2]
    std::vector<std::string_view> words;
    std::size_t pos = 0;
    while (pos < line.size()) {
        while (pos < line.size() && line[pos] == ' ') ++pos;
        const std::size_t start = pos;
        while (pos < line.size() && line[pos] != ' ') ++pos;
        if (start != pos) words.push_back(line.substr(start, pos - start));  // [3]
    }
    return words;
}

int main() {
    std::string log = "WARN disk almost full";

    if (starts_with(log, "WARN")) {  // [4]
        std::cout << "warning line\\n";
    }

    for (std::string_view word : split_words(log)) {  // [5]
        std::cout << '[' << word << ']';
    }
    std::cout << '\\n';
}`,
    callouts: [
      {
        n: 1,
        text: '`string_view` 參數以值傳遞即可；物件很小，複製只是複製指標與長度。',
      },
      {
        n: 2,
        text: '回傳的 `vector<string_view>` 只借用 `line` 指向的來源資料，不擁有字元內容。',
      },
      {
        n: 3,
        text: '`substr` 仍是 view；它不配置、不複製，只改變指標與長度。',
      },
      {
        n: 4,
        text: '同一個 API 可接受 `std::string` 與字串字面值，呼叫端不需要手動轉型或配置。',
      },
      {
        n: 5,
        text: '`log` 必須活得比這些 `string_view` 久；若 `log` 被銷毀或重新配置，view 就懸置。',
      },
    ],
  },
  deepDive: [
    {
      heading: '表示法與成本模型',
      body: '`std::string_view` 類似 `std::span<const char>` 的字串版本：它保存一個 `const char*` 與長度，提供 `find`、`substr`、比較等字串操作。傳值成本極低，通常比 `const std::string&` 更通用，因為它能直接表示字串的一小段而不需要配置。\n\n它不擁有資料、不會配置、不會補 `\\0`。這些正是它快的原因，也是所有生命週期風險的來源。',
    },
    {
      heading: '生命週期：string_view 不延長來源',
      body: '`std::string_view sv = std::string{"temporary"};` 會在完整運算式結束後懸置，因為暫時 `std::string` 已銷毀。`return local_string;` 轉成 `string_view` 也是同樣錯誤。把 `string_view` 放進容器、物件成員或非同步任務時，必須明確證明來源字串仍然有效。\n\n即使來源物件還活著，修改 `std::string` 也可能讓 view 失效：追加內容造成重新配置後，原本的指標不再有效。',
    },
    {
      heading: '不保證 null 結尾',
      body: '`string_view` 可指向字串中間的一段，因此 `data()` 回傳的指標後面不一定有 `\\0`，也可能在 view 的長度之後還有其他字元。傳給只接受 C 字串的 API（如部分 `printf` 或 C 函式）前，不可只傳 `sv.data()` 並假設安全。\n\n需要 C 字串或要長期保存時，建立 `std::string owned{sv};`，再使用 `owned.c_str()` 或保存 owned。',
    },
    {
      heading: 'API 設計準則',
      body: '函式只同步讀取字串內容時，參數用 `std::string_view` 很合適；函式需要保存資料時，成員應使用 `std::string`，建構子可接 `string_view` 後複製，或接 `std::string` 後移入。回傳值則要看所有權：回傳來源中的切片可用 `string_view`，回傳新產生的字串必須用 `std::string`。\n\n與 ranges/views 一樣，`string_view` 是借用工具，不是所有權工具。',
    },
  ],
  pitfalls: [
    '把 `std::string_view` 指向暫時 `std::string`，完整運算式結束後立即懸置。',
    '回傳指向區域 `std::string` 的 `string_view`，呼叫端拿到已失效的檢視。',
    '把 `sv.data()` 傳給需要 null 結尾的 C API，卻忘了 view 可能只是中間切片。',
    '保存 `string_view` 成員但沒有保存或約束來源字串生命週期。',
  ],
  bestPractices: [
    '唯讀同步參數用 `std::string_view`，傳值即可。',
    '需要儲存、跨執行緒或交給 C 字串 API 時，轉成擁有資料的 `std::string`。',
    '回傳 `string_view` 前確認它指向呼叫端提供且仍有效的來源資料。',
    '對 `std::string` 做可能重新配置的修改後，重新取得所有相關 view。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '`std::string_view` 的核心語意是什麼？',
      options: [
        { id: 'a', text: '擁有並管理一份可變字串' },
        { id: 'b', text: '非擁有地檢視一段字元序列，通常保存指標與長度' },
        { id: 'c', text: '一定指向 null 結尾字串' },
        { id: 'd', text: '只能由 `std::string` 建立，不能用字串字面值' },
      ],
      correctOptionId: 'b',
      explanation:
        '`std::string_view` 不擁有資料，只是一個輕量檢視；它不配置、不延長來源生命週期，也不保證 null 結尾。',
    },
    {
      id: 'q2',
      stem: '下列哪段最容易造成懸置 `string_view`？',
      options: [
        { id: 'a', text: '`void f(std::string_view s) { print(s); }` 並立即使用' },
        { id: 'b', text: '`std::string_view sv = std::string{"tmp"};`' },
        { id: 'c', text: '`std::string text = "abc"; std::string_view sv = text;` 且 text 仍活著' },
        { id: 'd', text: '`std::string_view sv = "literal";`' },
      ],
      correctOptionId: 'b',
      explanation:
        '暫時 `std::string` 在完整運算式結束後銷毀，`sv` 仍指向已失效的緩衝區；字串字面值則有靜態生命週期。',
    },
    {
      id: 'q3',
      stem: '為什麼不能總是把 `sv.data()` 當作 C 字串傳給舊式 API？',
      options: [
        { id: 'a', text: '`data()` 會複製整個字串，成本太高' },
        { id: 'b', text: '`string_view` 不保證 view 範圍後方有 null 結尾' },
        { id: 'c', text: '`data()` 只能在 C++23 使用' },
        { id: 'd', text: '`string_view` 永遠是空字串' },
      ],
      correctOptionId: 'b',
      explanation:
        '`string_view` 可能只檢視原字串中間一段，`data()` 後方不一定立即是 `\\0`；需要 C 字串時應建立 `std::string`。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['來源字串', 'string_view', 'substr/view', '同步讀取'],
    caption:
      'string_view 是非擁有檢視：它借用來源字串的字元範圍，切片仍是 view，來源生命週期決定安全性。',
  },
  tryIt: {
    code: `#include <iostream>
#include <string>
#include <string_view>

std::string_view first_word(std::string_view line) {
    auto pos = line.find(' ');
    return line.substr(0, pos == std::string_view::npos ? line.size() : pos);
}

int main() {
    std::string text = "compile quickly";
    std::string_view word = first_word(text);
    std::cout << word << '\\n';

    std::string owned{word};  // 需要保存時複製成擁有資料的 string
    std::cout << owned << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::basic_string_view - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/string/basic_string_view',
      description: 'string_view 的介面、複雜度與注意事項。',
    },
    {
      title: 'std::basic_string - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/string/basic_string',
      description: 'std::string 的所有權、重新配置與字串操作參考。',
    },
    {
      title: 'Modern C++ Programming — Utilities (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/19.Utilities.html',
      description: 'Busato 課程第 19 章工具庫投影片，與 string_view 相關的工具庫脈絡。',
    },
  ],
};

export default ch19StringView;
