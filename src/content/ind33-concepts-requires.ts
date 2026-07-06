import type { ChapterContent } from '@/types/ChapterContent';

const ind33ConceptsRequires: ChapterContent = {
  slug: 'ind33-concepts-requires',
  chapterLabel: '第 62 章',
  title: 'Concepts 與 requires（C++20）',
  group: '第 20 部：C++20 語言與工具庫新特性',
  description:
    'C++20 concepts 與 requires expression：把泛型 API 的型別契約寫進簽章，改善多載解析、錯誤訊息與可維護性。',
  concept: {
    standard: 'C++20',
    body: 'Concepts 讓樣板參數的需求成為介面的一部分，而不再藏在函式本體、`static_assert` 或複雜的 `enable_if` 中。`requires` expression 用來檢查語法與語意需求，例如某個型別是否可迭代、是否可轉成 `double`、某個運算式是否回傳指定型別；具名 concept 則把這些需求組合成可重用的契約。優點不只是錯誤訊息較短，還包含多載解析：當兩個 constrained overload 都可行時，更具體的約束可勝出，讓泛型 API 更接近一般函式的可讀性。',
  },
  deepDive: [
    {
      heading: 'requires expression 是編譯期契約檢查',
      body: '`requires(T x) { ... }` 不是執行期測試，而是編譯期檢查一組需求是否成立。需求可以是「這個運算式可編譯」、可以指定 `noexcept`，也可以用 trailing requirement 檢查結果是否符合另一個 concept，例如 `{ x.size() } -> std::convertible_to<std::size_t>`。\n\n這比舊式 SFINAE 更直接：你描述 API 需要什麼，而不是描述不符合時如何從候選集合中消失。',
    },
    {
      heading: '約束會參與多載解析',
      body: 'Concepts 的重要價值是約束排序。若 `std::random_access_range` 與 `std::ranges::input_range` 兩個多載都可接受 `std::vector<int>`，編譯器能知道 random access 是更嚴格的需求，因而選擇較具體的多載。這稱為 subsumption。\n\n實務上可用寬鬆 concept 表達一般路徑，再用更嚴格 concept 提供最佳化路徑；介面保持單純，最佳化決策交給編譯器的多載解析。',
    },
    {
      heading: '不要過度約束',
      body: 'Concept 是公開契約，寫得太嚴會拒絕其實可以工作的型別。例如函式只需要單趟讀取，就不該要求 `random_access_range`；只需要輸出到 `double`，就不該要求 `std::floating_point`。好的 concept 描述「最低必要能力」，不是描述你當下測試用的具體型別。\n\n過度約束會讓泛型程式變脆，也會使未來擴充困難。先從標準 concept（`std::integral`、`std::ranges::input_range`、`std::regular_invocable`）組合，再視需求命名自訂 concept。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <concepts>
#include <iostream>
#include <numeric>
#include <ranges>
#include <vector>

template <typename R>
concept NumericRange =
    std::ranges::input_range<R> &&
    std::convertible_to<std::ranges::range_value_t<R>, double>;  // [1]

template <NumericRange R>
double average(R&& values) {  // [2]
    double sum = 0.0;
    std::size_t count = 0;
    for (const auto& value : values) {
        sum += static_cast<double>(value);
        ++count;
    }
    return count == 0 ? 0.0 : sum / static_cast<double>(count);
}

template <std::integral T>
T next_even(T value) {  // [3]
    return value % 2 == 0 ? value + 2 : value + 1;
}

int main() {
    std::vector<int> samples{2, 4, 6, 8};

    std::cout << "average = " << average(samples) << '\\n';
    std::cout << "next even = " << next_even(7) << '\\n';
}`,
    callouts: [
      {
        n: 1,
        text: '自訂 concept 只描述平均值函式真正需要的最低能力：可迭代，且元素可轉成 double。',
      },
      {
        n: 2,
        text: '把 concept 放在樣板參數位置，函式簽章直接顯示型別契約。',
      },
      {
        n: 3,
        text: '標準 concept `std::integral` 讓整數限定比舊式 `enable_if` 更清楚。',
      },
    ],
  },
  pitfalls: [
    '用 concept 複製具體實作細節，導致 API 過度約束。',
    '把 `requires` 當成執行期檢查；它只在編譯期決定候選是否可用。',
    '在多載間使用彼此無法排序的約束，造成 ambiguous overload。',
    '為一次性需求命名過多 concept，反而降低可讀性。',
  ],
  bestPractices: [
    '優先使用標準 concept 組合需求；只有可重用或能清楚表達領域語意時才命名自訂 concept。',
    '約束最低必要能力，而不是測試時用到的最強型別能力。',
    '用更嚴格的 concept 提供最佳化多載，用較寬鬆的 concept 保留一般路徑。',
    '在公開 API 的函式簽章放置約束，讓錯誤訊息與文件自然對齊。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: 'Concepts 相較於舊式 `std::enable_if` 的主要好處是什麼？',
      options: [
        { id: 'a', text: '它把型別需求直接寫進 API，並改善診斷與多載解析' },
        { id: 'b', text: '它讓所有樣板都在執行期才決定型別' },
        { id: 'c', text: '它完全移除樣板實例化成本' },
        { id: 'd', text: '它只能用於 class template' },
      ],
      correctOptionId: 'a',
      explanation:
        'Concepts 是編譯期約束機制，讓需求成為簽章的一部分，也能參與 constrained overload 的排序。',
    },
    {
      id: 'q2',
      stem: '`requires` expression 的角色是什麼？',
      options: [
        { id: 'a', text: '在程式執行時丟出例外' },
        { id: 'b', text: '在編譯期檢查一組語法或語意需求是否成立' },
        { id: 'c', text: '強制函式 inline' },
        { id: 'd', text: '替代所有單元測試' },
      ],
      correctOptionId: 'b',
      explanation:
        '`requires` expression 會在編譯期檢查需求，例如運算式是否可編譯、結果是否符合另一個 concept。',
    },
    {
      id: 'q3',
      stem: '撰寫 concept 時為什麼要避免過度約束？',
      options: [
        { id: 'a', text: '過度約束會讓其實可用的型別被拒絕，使 API 變脆且難以擴充' },
        { id: 'b', text: '過度約束會讓程式改成動態型別' },
        { id: 'c', text: '過度約束會停用所有最佳化' },
        { id: 'd', text: '過度約束會使函式無法回傳值' },
      ],
      correctOptionId: 'a',
      explanation:
        'Concept 應描述最低必要能力；要求比演算法實際需求更強的能力，會不必要地排除可用型別。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['需求描述', 'concept 命名', 'requires 約束', '多載解析', '清楚診斷'],
    caption: 'Concepts 將泛型需求從實作細節提升為簽章中的契約，讓呼叫端與編譯器都能更早理解限制。',
  },
  tryIt: {
    code: `#include <concepts>
#include <iostream>
#include <string>

template <typename T>
concept Printable = requires(std::ostream& os, const T& value) {
    { os << value } -> std::same_as<std::ostream&>;
};

template <Printable T>
void print_value(const T& value) {
    std::cout << "value = " << value << '\\n';
}

int main() {
    print_value(42);
    print_value(std::string{"ready"});
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Constraints and concepts - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/constraints',
      description: 'C++20 constraints、requires expression 與 constrained overload 的語言規則。',
    },
    {
      title: 'Concepts library - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/concepts',
      description:
        '標準 concept，如 `std::integral`、`std::regular`、`std::invocable` 的完整列表。',
    },
    {
      title: 'Modern C++ Programming — Templates I',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/11.Templates_I.html',
      description: 'Busato 課程中樣板與 concepts 的原始投影片。',
    },
  ],
};

export default ind33ConceptsRequires;
