import type { ChapterContent } from '@/types/ChapterContent';

const ind32RangesViews: ChapterContent = {
  slug: 'ind32-ranges-views',
  chapterLabel: '第 61 章',
  title: 'Ranges 與 Views（C++20）',
  group: '第 20 部：C++20 語言與工具庫新特性',
  description:
    'C++20 ranges、views、projections、sentinels 與 borrowed ranges：用宣告式 pipeline 寫出可讀、惰性且較不易錯的資料處理。',
  concept: {
    standard: 'C++20',
    body: 'C++20 ranges 將「一段資料」提升為演算法的一等參數，讓 `std::ranges::sort(v)` 這類呼叫不再手動傳 `begin/end`，並加入 projection 參數，能直接依成員或轉換後的鍵排序與搜尋。views 是不擁有資料的惰性 range adaptor，例如 `filter`、`transform`、`take`、`drop` 可用 pipe 串成資料處理流程；它們通常只保存迭代器、述詞或函式物件，不會立即配置新容器。實務重點是生命週期：view 多半不擁有底層資料，若來源是暫時物件或被修改到迭代器失效，就可能產生懸置。',
  },
  deepDive: [
    {
      heading: 'ranges 演算法：容器、projection 與較清楚的介面',
      body: '`std::ranges` 演算法接受 range 物件本身，因此呼叫端可讀性高於傳統的 `std::sort(v.begin(), v.end())`。多數演算法還接受 projection：比較前先把元素映射到某個鍵，例如 `std::ranges::sort(users, {}, &User::score)`。這讓「依某個欄位排序」不用寫重複 lambda，也降低比較器寫錯的機率。\n\nranges 演算法回傳型別也更精準，例如部分演算法回傳包含多個迭代器的結果物件，而不是只回傳單一迭代器；這對管線化處理與錯誤診斷都有幫助。',
    },
    {
      heading: 'views 是惰性的，不是新容器',
      body: '`std::views::filter`、`transform`、`take` 等 adaptor 會建立一個描述流程的 view。元素通常在迭代時才被讀取與轉換，因此能避免中間容器配置，也能提早停止：`take(3)` 只需要產生前三個元素，不必掃完整個來源。\n\n惰性也意味著副作用要小心。若 transform lambda 修改外部狀態，實際執行次數與時間點取決於誰、何時、迭代了 view；同一個 view 被迭代多次也可能重複執行轉換。',
    },
    {
      heading: 'sentinel、borrowed range 與懸置問題',
      body: 'C++20 range 不要求 `begin` 與 `end` 型別相同；`end` 可以是 sentinel，代表停止條件。這讓 C 字串、串流或無限序列更自然地建模。\n\n生命週期是 ranges 最常見陷阱。`std::ranges::borrowed_range` 描述「從這個 range 取出的迭代器在 range 物件銷毀後是否仍可用」。標準庫會在危險情況回傳 `std::ranges::dangling`，但 view pipeline 中仍可能因捕獲參考、保存 `string_view` 或修改底層容器而出錯。規則很務實：view 不該比來源資料活得久。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <algorithm>
#include <iostream>
#include <ranges>
#include <string>
#include <string_view>
#include <vector>

struct Student {
    std::string name;
    int score{};
};

int main() {
    std::vector<Student> students{
        {"Ada", 98},
        {"Linus", 87},
        {"Grace", 93},
        {"Bjarne", 91},
        {"Barbara", 84},
    };

    std::ranges::sort(students, std::greater<>{}, &Student::score);  // [1]

    auto honor_roll = students                                      // [2]
        | std::views::filter([](const Student& s) { return s.score >= 90; })
        | std::views::transform([](const Student& s) -> std::string_view {
              return s.name;
          })
        | std::views::take(3);                                      // [3]

    std::cout << "honor roll:";
    for (std::string_view name : honor_roll) {
        std::cout << ' ' << name;
    }
    std::cout << '\\n';
}`,
    callouts: [
      {
        n: 1,
        text: 'projection 參數 `&Student::score` 讓排序直接以成績為鍵，不需要手寫比較器。',
      },
      {
        n: 2,
        text: 'view pipeline 不會立即建立新 vector，而是保存來源與 adaptor 的組合。',
      },
      {
        n: 3,
        text: '`take(3)` 展現惰性：只消費前三個符合條件的名稱，不必把所有中間結果 materialize。',
      },
    ],
  },
  pitfalls: [
    '讓 view 或 view 產生的 `string_view`／迭代器比底層容器活得更久，造成懸置。',
    '在 view pipeline 的 lambda 中放副作用，卻假設它會立即執行或只執行一次。',
    '修改底層容器導致迭代器失效後，仍繼續迭代先前建立的 view。',
    '假設 ranges 演算法都支援平行 execution policy；C++20/C++23 的 ranges 演算法大多仍是循序介面。',
  ],
  bestPractices: [
    '用 ranges 演算法取代手寫 `begin/end`，用 projection 表達排序或搜尋鍵。',
    '把 view 當成短生命週期的處理流程；需要保存結果時明確 materialize 到容器。',
    'pipeline 中的 lambda 優先保持純函式風格，避免副作用被惰性求值放大。',
    '需要平行化時先退回傳統 iterator-based 平行演算法，或確認所用標準庫是否已有對應擴充。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: 'C++20 ranges 演算法的 projection 參數主要解決什麼問題？',
      options: [
        { id: 'a', text: '讓演算法自動平行化' },
        { id: 'b', text: '在比較或處理前先把元素映射到某個鍵，例如依成員欄位排序' },
        { id: 'c', text: '把所有 view 立即複製成 vector' },
        { id: 'd', text: '避免任何 iterator 失效' },
      ],
      correctOptionId: 'b',
      explanation:
        'projection 讓演算法在比較前先取出或轉換鍵值，例如 `&Student::score`，可讀性比手寫比較器更高。',
    },
    {
      id: 'q2',
      stem: 'views 的「惰性」代表什麼？',
      options: [
        { id: 'a', text: '建立 pipeline 時通常不立即產生中間容器，元素在迭代時才被讀取與轉換' },
        { id: 'b', text: '所有 view 都會擁有底層資料' },
        { id: 'c', text: 'view 永遠可以安全保存到任意長的生命週期' },
        { id: 'd', text: 'view 一定比手寫迴圈更快' },
      ],
      correctOptionId: 'a',
      explanation:
        'views 通常只保存來源與 adaptor，真正的讀取和轉換發生在迭代時，因此可避免中間配置，但也必須注意生命週期。',
    },
    {
      id: 'q3',
      stem: '使用 ranges/view pipeline 時最常見的生命週期風險是什麼？',
      options: [
        { id: 'a', text: 'view 永遠會複製整份來源資料' },
        { id: 'b', text: 'view 或其中保存的參考比來源資料活得更久，造成懸置' },
        { id: 'c', text: 'projection 會改變原始容器型別' },
        { id: 'd', text: 'filter 會自動刪除不符合條件的元素' },
      ],
      correctOptionId: 'b',
      explanation:
        '多數 view 是非擁有檢視；如果來源容器被銷毀或修改到迭代器失效，繼續使用 view 就可能觸發未定義行為。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['range 來源', 'filter view', 'transform view', 'take view', '迭代消費'],
    caption: 'ranges pipeline：來源資料經由惰性 view adaptor 組合，直到被迭代時才逐步產生元素。',
  },
  tryIt: {
    code: `#include <algorithm>
#include <iostream>
#include <ranges>
#include <string>
#include <vector>

struct Task {
    std::string name;
    int priority{};
};

int main() {
    std::vector<Task> tasks{{"compile", 2}, {"test", 3}, {"format", 1}};
    std::ranges::sort(tasks, std::greater<>{}, &Task::priority);

    auto names = tasks | std::views::transform([](const Task& task) {
        return task.name;
    });

    for (const auto& name : names) {
        std::cout << name << '\\n';
    }
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Ranges library - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/ranges',
      description: 'C++20 ranges、views、range concepts 與 adaptor 的完整參考。',
    },
    {
      title: 'std::ranges::sort - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/algorithm/ranges/sort',
      description: 'ranges 版排序演算法、比較器與 projection 參數說明。',
    },
    {
      title: 'Modern C++ Programming — Containers and Algorithms',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/20.Containers_Algorithms.html',
      description: 'Busato 課程中 STL 容器與演算法的原始投影片。',
    },
  ],
};

export default ind32RangesViews;
