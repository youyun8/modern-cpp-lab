import type { ChapterContent } from '@/types/ChapterContent';

const ind39Cpp26Outlook: ChapterContent = {
  slug: 'ind39-cpp26-outlook',
  chapterLabel: '第 68 章',
  title: 'C++26 展望：反射、模式匹配與合約',
  group: '第 20 部：C++20~26 語言與工具庫新特性',
  description:
    '探索 C++26 的未來：靜態反射（Reflection）、模式匹配（Pattern Matching）與合約（Contracts），這些特性將為 C++ 帶來根本性的表達力躍升。',
  concept: {
    standard: 'C++26',
    body: '雖然 C++20 與 C++23 完成了許多基礎建設（Concepts, Modules, Coroutines, Ranges），C++26 被廣泛認為是下一個具備「典範轉移」等級的標準。C++ 社群正積極推動三大功能：靜態反射（Static Reflection）、模式匹配（Pattern Matching）與合約編程（Contracts）。\n\n這些特性將消除大量依靠外部程式碼產生器（如 protobuf、moc）和樣板黑魔法編寫的樣板程式碼，讓 C++ 能以更安全、原生的方式描述複雜的型別操作與商業邏輯。',
  },
  deepDive: [
    {
      heading: '靜態反射（Static Reflection，P2996）',
      body: 'C++ 長期缺乏原生的反射機制，導致 JSON 序列化或列舉轉字串都需要依賴巨集。C++26 提案引入以 `^`（求值為編譯期中介資訊）與 `[: :]`（還原為型別或表達式）為語法的靜態反射。搭配 consteval 與 splice，你可以撰寫純 C++ 的迴圈來走訪結構體的所有成員並印出，甚至能從型別中萃取資訊來動態生成新的程式碼，完全取代傳統基於巨集與 SFINAE 的序列化函式庫。',
    },
    {
      heading: '模式匹配（Pattern Matching，P2688）',
      body: '受到 Rust 與 functional languages 的啟發，C++26 的 `inspect` 表達式將取代目前冗長且難讀的 `std::visit` 以及複雜的 `switch` 陳述。模式匹配允許你透過宣告式的語法，同時解構 `std::variant`、`std::tuple` 或一般類別，並且綁定變數。它不僅具備窮盡檢查（Exhaustiveness check），還允許在匹配分支加入 guard 條件（例如 `if x > 0`），讓和型別（Sum Types）的處理更加優雅。',
    },
    {
      heading: '合約（Contracts，P2900 系列）',
      body: '合約編程為 C++ 加入了在語言層級描述前提條件（Preconditions）、後置條件（Postconditions）與不變量（Invariants）的能力。例如，你可以宣告一個函式 `void push(int x) pre(size < capacity)`。與傳統的 `assert` 巨集不同，合約具有明確的語意，可由編譯器控制其是否要被編譯為執行期檢查或僅作為靜態分析與最佳化的提示，為高可靠性軟體提供了原生支援。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `// Note: The following is illustrative syntax from C++26 proposals, not yet implemented by mainstream compilers

#include <iostream>
#include <variant>

// 1. Imagined syntax for static reflection (P2996)
struct User {
    int id;
    std::string name;
};

/*
template <typename T>
void print_json(const T& obj) {
    std::cout << "{ ";
    // Use reflection to walk through all members of the class
    constexpr auto members = std::meta::members_of(^T);
    template for (constexpr auto member : members) {
        std::cout << "\\"" << std::meta::name_of(member) << "\\": " 
                  << obj.[:member:] << ", ";
    }
    std::cout << "}\\n";
}
*/

// 2. Imagined syntax for pattern matching (P2688)
using Result = std::variant<int, std::string>;

void handle_result(const Result& res) {
    /*
    inspect (res) {
        <int> i if (i == 404) => std::cout << "Not Found\\n";
        <int> i               => std::cout << "Code: " << i << '\\n';
        <std::string> msg     => std::cout << "Error: " << msg << '\\n';
    };
    */
}

// 3. Imagined syntax for contracts
/*
double safe_divide(double a, double b)
  pre (b != 0.0)
  post (r: r == a / b)
{
    return a / b;
}
*/

int main() {
    std::cout << "C++26 will bring Reflection, Pattern Matching, and Contracts!\\n";
    return 0;
}`,
    callouts: [
      {
        n: 1,
        text: '反射：利用 ^ 取出 meta-info，並使用 std::meta 的工具分析。',
      },
      {
        n: 2,
        text: '模式匹配：inspect 語法比 std::visit 加上 overloaded 慣用法更加簡潔直覺。',
      },
      {
        n: 3,
        text: '合約：在語言級別指定前置與後置條件。',
      },
    ],
  },
  pitfalls: [
    '標準定案風險：這些特性目前（截至 2026 年）大多仍在提案階段（WG21 委員會審議中），語法與功能可能會在最終標準發佈前發生變動。',
    '編譯器支援：大型特性的實作需要數年時間，即使 C++26 發佈，主流編譯器的完整支援可能仍需要一段過渡期。',
  ],
  bestPractices: [
    '關注 `std::visit` 與 `std::variant` 的發展，熟練掌握它們以便未來無縫銜接 Pattern Matching。',
    '留意開源社群對反射提案的實作分支（例如基於 clang 的 experimental 分支），提早理解 Meta-programming 的新典範。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '關於 C++26 的靜態反射提案（P2996），它的主要目標是取代哪種既有技術？',
      options: [
        { id: 'a', text: '為了實作 JSON 序列化與 Enum 轉換所寫的複雜巨集與程式碼產生器' },
        { id: 'b', text: '多執行緒的 Mutex 鎖' },
        { id: 'c', text: '硬體層級的 SIMD 向量化' },
        { id: 'd', text: '傳統的 C++ 指標' },
      ],
      correctOptionId: 'a',
      explanation:
        '靜態反射的核心價值在於提供標準的編譯期機制來萃取型別資訊，一舉消滅長久以來的巨集黑魔法。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['C++20 (基礎)', 'C++23 (修補與 Deducing This)', 'C++26 (反射、匹配、合約)'],
    caption: 'C++ 標準的演進：從基礎建設到表達力的全面躍升。',
  },
  tryIt: {
    code: `#include <iostream>

int main() {
    std::cout << "Waiting for C++26 to arrive...\\n";
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'P2996: Reflection for C++26',
      href: 'https://wg21.link/p2996',
      description: 'C++26 靜態反射提案文件。',
    },
    {
      title: 'P2688: Pattern Matching',
      href: 'https://wg21.link/p2688',
      description: '模式匹配提案。',
    },
  ],
};

export default ind39Cpp26Outlook;
