import type { ChapterContent } from '@/types/ChapterContent';

const ch12CompileTimeProgramming: ChapterContent = {
  slug: 'ch12-compile-time-programming',
  chapterLabel: '第 12.2 章',
  title: '編譯期程式設計：constexpr、NTTP 與 traits',
  group: '第 2 部：物件導向與泛型程式設計',
  description:
    'constexpr／consteval／constinit、非型別樣板參數、type traits、index_sequence 與編譯期分派：把檢查與計算移到編譯期。',
  concept: {
    standard: 'C++20',
    body: '現代 C++ 的編譯期程式設計不只是在樣板裡做型別技巧；`constexpr` 讓函式可在常數運算式中求值，`consteval` 強制呼叫必須發生在編譯期，`constinit` 保證靜態儲存期物件以靜態初始化完成。非型別樣板參數（NTTP）可把整數、列舉、指標，甚至 C++20 的 structural class type 當成樣板參數，讓型別攜帶編譯期值。type traits 與 `if constexpr` 可在單一函式內依型別特性選擇分支；`std::integer_sequence`／`index_sequence` 則負責把「編譯期索引」展開到 tuple、array 或參數包。重點是節制：編譯期計算能提升安全性與最佳化，但也會增加編譯時間與錯誤訊息複雜度。',
  },
  code: {
    lang: 'cpp',
    code: `#include <array>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <string_view>
#include <type_traits>

consteval std::uint32_t hash_literal(std::string_view text) {  // [1]
    std::uint32_t h = 2166136261u;
    for (char c : text) {
        h ^= static_cast<unsigned char>(c);
        h *= 16777619u;
    }
    return h;
}

template <auto N>
struct Block {  // [2]
    std::array<std::byte, N> bytes{};
};

template <typename T>
constexpr std::string_view category() {
    if constexpr (std::is_integral_v<T>)       // [3]
        return "integral";
    else if constexpr (std::is_floating_point_v<T>)
        return "floating";
    else
        return "other";
}

int main() {
    constexpr auto id = hash_literal("orders");  // [4]
    Block<64> cache_line{};

    std::cout << "id=" << id << "\\n";
    std::cout << "block=" << cache_line.bytes.size() << "\\n";
    std::cout << category<double>() << "\\n";    // [5]
}`,
    callouts: [
      { n: 1, text: '`consteval` 立即函式要求每次呼叫都在編譯期完成，適合產生編譯期 ID。' },
      {
        n: 2,
        text: '`template <auto N>` 是 NTTP，讓型別攜帶編譯期值；`Block<64>` 與 `Block<128>` 是不同型別。',
      },
      { n: 3, text: '`if constexpr` 只實體化被選中的分支，可用 type traits 寫出型別分派。' },
      {
        n: 4,
        text: '`constexpr` 變數在常數運算式中保存 `consteval` 的結果，可用於 switch、陣列大小等場景。',
      },
      { n: 5, text: '編譯器在實體化 `category<double>` 時只保留浮點分支。' },
    ],
  },
  deepDive: [
    {
      heading: 'constexpr、consteval、constinit 的分工',
      body: '`constexpr` 表示「可在編譯期求值」，但若引數不是常數，也可在執行期執行；`consteval` 表示「必須在編譯期求值」，常用於字面值解析、編譯期雜湊、產生固定表格。`constinit` 不代表 const，而是保證靜態儲存期物件不經動態初始化，降低 static initialization order fiasco 的風險。\n\nAPI 設計上，能執行期使用就選 `constexpr`，必須拒絕執行期呼叫才選 `consteval`；全域可變狀態若需要保證初始化時機才考慮 `constinit`。',
    },
    {
      heading: 'NTTP 與 structural type',
      body: '非型別樣板參數讓值參與型別系統，例如 `Matrix<float, 3, 3>`、`FixedString<\"name\">` 或 policy 旗標。C++20 放寬限制，允許符合 structural type 條件的類別值作為 NTTP，讓編譯期字串與設定物件更自然。\n\n代價是每個不同值通常都會產生不同實例，可能增加二進位體積與編譯時間。若值的差異不需要影響最佳化，應改用執行期參數。',
    },
    {
      heading: 'traits、tag dispatch 與 detection idiom',
      body: 'type traits 是編譯期查詢與轉換工具，例如 `std::remove_cvref_t<T>`、`std::is_trivially_copyable_v<T>`。C++20 concepts 讓很多舊式 detection idiom 可讀性大幅改善，但理解 `std::void_t` 與偵測「某表達式是否合法」仍有助於維護舊碼。\n\ntag dispatch 透過空型別標籤選擇實作；`if constexpr` 則適合把型別分支收在同一函式內。公開介面優先使用 concepts，內部細節再用 traits 分流。',
    },
    {
      heading: 'index_sequence 與參數包展開',
      body: '`std::index_sequence<0,1,2>` 是把編譯期索引包裝成型別的工具，常搭配 `std::make_index_sequence<N>` 展開 tuple、array 或參數包。`std::apply` 背後也使用類似機制，把 tuple 中第 0 到第 N-1 個元素展開成函式呼叫引數。\n\n當你需要「對 tuple 的每個元素做事」時，先找 `std::apply` 是否足夠；只有在需要自訂索引邏輯時才手寫 index sequence。',
    },
    {
      heading: 'if consteval：區分編譯期與執行期路徑（C++23）',
      body: 'C++23 的 `if consteval` 讓你在同一個 `constexpr` 函式裡，為「此次呼叫發生在編譯期」與「發生在執行期」提供不同實作。當函式在常數運算式中求值時進入 `if consteval` 分支，否則進入 `else` 分支。典型用途是編譯期走純 `constexpr` 相容的慢速實作，執行期則改用編譯器內建函式（intrinsics）或不可 constexpr 的高速路徑。\n\n它與 C++20 的 `std::is_constant_evaluated()` 目的相近，但更安全：`if constexpr (std::is_constant_evaluated())` 是常見陷阱，因為該函式在此情境永遠回傳 `true`，導致 `else` 分支被靜默忽略；`if consteval` 是語言層級構造，不會踩到這個坑。注意 `if consteval` 沒有「帶條件」的形式，只判斷「當下是否處於編譯期求值」。',
    },
  ],
  pitfalls: [
    '把大量資料生成放進 `constexpr`，導致每次編譯都重做重工作。',
    '用過多 NTTP 值製造大量型別實例，造成二進位膨脹。',
    '誤以為 `constinit` 代表不可修改；它只約束初始化時機。',
    '在公開 API 暴露複雜 traits 錯誤訊息，而不是用 concepts 給清楚診斷。',
    '把 `std::is_constant_evaluated()` 寫進 `if constexpr` 條件：它在該處恆為 `true`，會讓執行期分支被靜默丟棄；需要分流時改用 `if consteval`。',
  ],
  bestPractices: [
    '能同時支援編譯期與執行期就用 `constexpr`；必須編譯期才用 `consteval`。',
    '用 concepts 表達公開約束，traits 與 `if constexpr` 留給內部實作。',
    '用 `constinit` 管理非區域靜態物件的初始化時機。',
    '量測編譯時間與二進位體積，避免把所有邏輯都推到編譯期。',
    '需要為編譯期與執行期提供不同實作時，優先用 C++23 的 `if consteval`（搭配一般 `if`），而非 `if constexpr (std::is_constant_evaluated())`。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '`consteval` 與 `constexpr` 的主要差異是什麼？',
      options: [
        { id: 'a', text: '`consteval` 呼叫必須在編譯期求值，`constexpr` 函式也可在執行期執行' },
        { id: 'b', text: '`constexpr` 已在 C++20 被移除' },
        { id: 'c', text: '`consteval` 只能用於類別，不能用於函式' },
        { id: 'd', text: '兩者完全相同' },
      ],
      correctOptionId: 'a',
      explanation:
        '`consteval` 是立即函式，任何呼叫都必須形成常數運算式；`constexpr` 則是允許編譯期求值，但也能執行期呼叫。',
    },
    {
      id: 'q2',
      stem: '`template <auto N>` 的作用是什麼？',
      options: [
        { id: 'a', text: '宣告一個執行期整數參數' },
        { id: 'b', text: '宣告非型別樣板參數，讓編譯期值參與型別實體化' },
        { id: 'c', text: '自動平行化樣板' },
        { id: 'd', text: '禁止樣板被特化' },
      ],
      correctOptionId: 'b',
      explanation: 'NTTP 讓值成為樣板參數，例如 `Block<64>`，編譯器會為不同值建立不同型別或實例。',
    },
    {
      id: 'q3',
      stem: '`if constexpr` 在泛型程式中的關鍵價值是什麼？',
      options: [
        { id: 'a', text: '所有分支都會執行，但比較快' },
        { id: 'b', text: '條件於編譯期決定，未選中的分支不會對該實體化形成語意檢查' },
        { id: 'c', text: '它只能用於整數型別' },
        { id: 'd', text: '它會自動產生虛擬函式' },
      ],
      correctOptionId: 'b',
      explanation:
        '`if constexpr` 讓泛型函式可依型別特性選擇合法分支，取代許多遞迴樣板或 SFINAE 分流。',
    },
    {
      id: 'q4',
      stem: 'C++23 的 `if consteval` 相較於 `if constexpr (std::is_constant_evaluated())` 的主要優點是什麼？',
      options: [
        {
          id: 'a',
          text: '它能在編譯期與執行期路徑間安全分流，避免 `is_constant_evaluated()` 在 `if constexpr` 中恆為真的陷阱',
        },
        { id: 'b', text: '它可以完全取代 `consteval` 函式' },
        { id: 'c', text: '它接受一個布林條件，用來判斷任意運算式是否為常數' },
        { id: 'd', text: '它只能用在樣板函式中' },
      ],
      correctOptionId: 'a',
      explanation:
        '`if constexpr (std::is_constant_evaluated())` 會讓該函式恆回傳 `true`，靜默丟棄執行期分支；`if consteval` 是語言構造，能正確區分編譯期與執行期路徑，且不帶額外條件。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['constexpr', 'traits', 'NTTP', '實體化'],
    caption:
      '編譯期程式設計流程：常數求值與 traits 產生決策，NTTP 把值帶入型別，最後由樣板實體化產生具體程式碼。',
  },
  tryIt: {
    code: `#include <iostream>
#include <string_view>

consteval int length_of(std::string_view text) {
    return static_cast<int>(text.size());
}

template <auto N>
struct Buffer {
    char data[N]{};
};

int main() {
    Buffer<length_of("compile")> b;
    std::cout << sizeof(b.data) << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Constant expressions - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/constant_expression',
      description: 'constexpr／consteval／常數運算式的語言規則。',
    },
    {
      title: 'Template parameters - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/template_parameters',
      description: '型別、非型別與樣板樣板參數的完整規則。',
    },
    {
      title: 'std::integer_sequence - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/utility/integer_sequence',
      description: 'index_sequence 與參數包展開工具。',
    },
  ],
};

export default ch12CompileTimeProgramming;
