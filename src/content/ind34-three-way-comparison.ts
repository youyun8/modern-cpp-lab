import type { ChapterContent } from '@/types/ChapterContent';

const ind34ThreeWayComparison: ChapterContent = {
  slug: 'ind34-three-way-comparison',
  chapterLabel: '第 63 章',
  title: '三向比較與預設比較（C++20）',
  group: '第 20 部：C++20 語言與工具庫新特性',
  description:
    'C++20 spaceship operator `<=>`、defaulted comparison、strong/weak/partial ordering，以及如何減少重複且易錯的比較運算子。',
  concept: {
    standard: 'C++20',
    body: 'C++20 的三向比較運算子 `<=>` 會一次描述小於、等於、大於三種關係，並讓編譯器在許多情況下自動產生 `<`、`<=`、`>`、`>=` 等關係運算。對只需依成員逐一比較的值型別，`auto operator<=>(const T&) const = default;` 可大幅減少樣板式程式碼，也避免 `operator<` 與 `operator==` 不一致。比較結果不是單純 `int`，而是 `std::strong_ordering`、`std::weak_ordering` 或 `std::partial_ordering`，用來表達型別本身的排序語意，例如浮點數含 NaN 時只能形成 partial ordering。',
  },
  deepDive: [
    {
      heading: 'defaulted comparison 適合值型別',
      body: '若型別的比較語意正好是「依宣告順序比較所有成員」，defaulted `<=>` 是最簡潔且最不容易出錯的寫法。編譯器會依序比較成員，並推導適合的 comparison category。\n\n這特別適合版本號、座標、鍵值物件等純值型別。少寫五六個比較運算子不只是省程式碼，也避免未來新增成員時忘記同步更新某個比較函式。',
    },
    {
      heading: 'comparison category 表達排序強度',
      body: '`std::strong_ordering` 表示完全可替換的強排序，例如整數與多數純值型別；`std::weak_ordering` 表示可排序但等價不一定代表完全相同，例如大小寫不敏感字串比較；`std::partial_ordering` 表示可能無法比較，例如浮點 NaN 與任何值都 unordered。\n\n不要把 `<=>` 當成回傳 `-1/0/1` 的 C 風格函式。呼叫端應與 `0` 比較或使用產生出的關係運算，讓 category 的語意保留下來。',
    },
    {
      heading: '自訂排序要維持一致性',
      body: '當型別的排序不是成員宣告順序時，可以手寫 `<=>`。此時仍需確保 `operator==` 與排序語意一致，否則 associative container、binary search 或 deduplication 都可能出現難以追蹤的錯誤。\n\n對複合排序，常見做法是用 `std::tie` 或明確分層比較重要欄位。若排序只服務某個演算法，優先使用演算法的 comparator 或 ranges projection，不一定要把該排序寫成型別的全域語意。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <algorithm>
#include <compare>
#include <iostream>
#include <string>
#include <vector>

struct Version {
    int major{};
    int minor{};
    int patch{};

    auto operator<=>(const Version&) const = default;  // [1]
};

std::ostream& operator<<(std::ostream& os, const Version& version) {
    return os << version.major << '.' << version.minor << '.' << version.patch;
}

struct Job {
    int priority{};
    std::string name;

    auto operator<=>(const Job& other) const {
        return other.priority <=> priority;  // [2]
    }

    bool operator==(const Job& other) const = default;  // [3]
};

int main() {
    std::vector<Version> versions{{1, 9, 0}, {2, 0, 0}, {1, 10, 3}};
    std::ranges::sort(versions);

    std::cout << "latest = " << versions.back() << '\\n';
    std::cout << "is newer = " << std::boolalpha << (Version{2, 0, 0} > Version{1, 10, 3})
              << '\\n';

    std::vector<Job> jobs{{2, "compile"}, {3, "test"}, {1, "format"}};
    std::ranges::sort(jobs);
    std::cout << "first job = " << jobs.front().name << '\\n';
}`,
    callouts: [
      {
        n: 1,
        text: 'defaulted `<=>` 依成員宣告順序比較，並自動支援常用關係運算。',
      },
      {
        n: 2,
        text: 'Job 需要高 priority 排前面，因此手寫 `<=>` 將比較方向反轉。',
      },
      {
        n: 3,
        text: '手寫 `<=>` 時仍應明確提供與排序語意一致的 `operator==`。',
      },
    ],
  },
  pitfalls: [
    '把 `<=>` 回傳值當成整數處理，而不是使用 comparison category 或與 `0` 比較。',
    '手寫 `<=>` 卻讓 `operator==` 與排序邏輯不一致。',
    '對含浮點 NaN 的型別假設一定有 total ordering，忽略 `partial_ordering` 的 unordered 狀態。',
    '把某個局部演算法需要的排序寫成型別的全域 `<=>`，污染型別語意。',
  ],
  bestPractices: [
    '純值型別優先使用 defaulted `<=>`，讓編譯器維護成員比較。',
    '只在排序是型別的自然語意時才定義 `<=>`；局部排序用 comparator 或 projection。',
    '理解 strong、weak、partial ordering 的差異，尤其是浮點數與等價但不相同的資料。',
    '手寫 `<=>` 時同步檢查 `operator==`，確保 container 與演算法行為一致。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '`auto operator<=>(const T&) const = default;` 最適合哪種型別？',
      options: [
        { id: 'a', text: '比較語意就是依成員宣告順序逐一比較的值型別' },
        { id: 'b', text: '需要以外部環境狀態決定排序的型別' },
        { id: 'c', text: '不能被複製的型別' },
        { id: 'd', text: '所有含浮點數的型別，完全不用考慮 NaN' },
      ],
      correctOptionId: 'a',
      explanation: 'defaulted comparison 會依成員宣告順序比較，適合版本號、座標、鍵值等純值型別。',
    },
    {
      id: 'q2',
      stem: '`std::partial_ordering` 常見於哪種情境？',
      options: [
        { id: 'a', text: '浮點數可能出現 NaN，導致某些值彼此 unordered' },
        { id: 'b', text: '所有整數比較' },
        { id: 'c', text: '字串字典序一定不穩定' },
        { id: 'd', text: '沒有任何型別會用到它' },
      ],
      correctOptionId: 'a',
      explanation:
        '浮點 NaN 與任何值比較都不是小於、等於或大於，因此浮點比較是 partial ordering 的典型來源。',
    },
    {
      id: 'q3',
      stem: '若排序只服務某一個演算法，而不是型別的自然語意，較好的做法是什麼？',
      options: [
        { id: 'a', text: '為型別定義全域 `<=>` 並永遠使用這個排序' },
        { id: 'b', text: '在該演算法呼叫處使用 comparator 或 ranges projection' },
        { id: 'c', text: '移除 `operator==`' },
        { id: 'd', text: '改用 C-style cast' },
      ],
      correctOptionId: 'b',
      explanation: '局部排序應留在演算法呼叫處，避免把一次性的排序需求誤寫成型別的全域比較語意。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['成員比較', '<=>', 'ordering category', '關係運算', '演算法排序'],
    caption:
      '三向比較以單一運算子描述排序關係，並透過 ordering category 保留強排序、弱排序或偏序語意。',
  },
  tryIt: {
    code: `#include <algorithm>
#include <compare>
#include <iostream>
#include <vector>

struct Point {
    int x{};
    int y{};
    auto operator<=>(const Point&) const = default;
};

int main() {
    std::vector<Point> points{{2, 1}, {1, 5}, {1, 2}};
    std::ranges::sort(points);

    for (const Point& point : points) {
        std::cout << point.x << ',' << point.y << '\\n';
    }
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Default comparisons - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/default_comparisons',
      description: 'C++20 defaulted comparison 與 rewritten candidates 的語言規則。',
    },
    {
      title: 'Three-way comparison - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/operator_comparison',
      description: '`operator<=>`、comparison category 與關係運算改寫規則。',
    },
    {
      title: 'std::strong_ordering - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/utility/compare/strong_ordering',
      description: 'comparison category 之一，說明強排序結果的使用方式。',
    },
  ],
};

export default ind34ThreeWayComparison;
