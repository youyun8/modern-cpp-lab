import type { ChapterContent } from '@/types/ChapterContent';

const ch12CallableUtilities: ChapterContent = {
  slug: 'ch12-callable-utilities',
  chapterLabel: '第 12.3 章',
  title: 'Tuple、apply、invoke 與 Callable 工具',
  group: '第 2 部：物件導向與泛型程式設計',
  description:
    'std::tuple、structured binding、std::apply、std::invoke、std::bind_front 與 callable traits：泛型呼叫與參數包組合的實務工具。',
  concept: {
    standard: 'C++20',
    body: '`std::tuple` 是固定長度、異質型別的值集合，是泛型程式中「把多個值打包」的基礎；結構化繫結能把 tuple、pair 或聚合拆成具名變數。`std::apply` 把 tuple 展開成函式呼叫引數，避免手寫 `index_sequence`；`std::invoke` 則統一呼叫普通函式、函式物件、lambda、成員函式指標與成員資料指標。配合 `std::invoke_result_t`、`std::is_invocable_v` 或 C++20 concepts（如 `std::invocable`），可以在泛型 API 中清楚檢查「這個東西能不能被這樣呼叫」。`std::reference_wrapper` 與 `std::ref` 用來在需要可複製包裝的地方保留參考語意；`std::bind_front` 則能固定前幾個引數，形成輕量 adaptor。',
  },
  code: {
    lang: 'cpp',
    code: `#include <functional>
#include <iostream>
#include <string>
#include <tuple>
#include <type_traits>

struct User {
    std::string name;
    int score{};

    int add_bonus(int bonus) const { return score + bonus; }
};

template <typename F, typename Tuple>
decltype(auto) call_with_tuple(F&& f, Tuple&& args) {
    return std::apply(std::forward<F>(f), std::forward<Tuple>(args));  // [1]
}

template <typename F, typename... Args>
requires std::invocable<F, Args...>  // [2]
decltype(auto) checked_invoke(F&& f, Args&&... args) {
    return std::invoke(std::forward<F>(f), std::forward<Args>(args)...);  // [3]
}

int main() {
    auto args = std::tuple{2, 3};
    std::cout << call_with_tuple(std::plus<>{}, args) << "\\n";

    User ada{"Ada", 95};
    std::cout << checked_invoke(&User::add_bonus, ada, 5) << "\\n";  // [4]
    std::cout << checked_invoke(&User::score, ada) << "\\n";         // [5]

    auto add_to_ada = std::bind_front(&User::add_bonus, std::cref(ada));  // [6]
    std::cout << add_to_ada(3) << "\\n";
}`,
    callouts: [
      { n: 1, text: '`std::apply` 將 tuple 元素展開成函式呼叫引數，免除手寫索引展開。' },
      {
        n: 2,
        text: '`std::invocable` 讓 API 在簽章處宣告 callable 需求，錯誤訊息比模板展開清楚。',
      },
      { n: 3, text: '`std::invoke` 統一處理函式、lambda、函式物件、成員函式指標與成員資料指標。' },
      { n: 4, text: '成員函式指標呼叫時，物件必須作為第一個實際引數傳入。' },
      { n: 5, text: '`std::invoke` 也能讀取成員資料指標，回傳 `ada.score`。' },
      { n: 6, text: '`std::bind_front` 固定前方引數；`std::cref` 避免複製物件並保留 const 參考。' },
    ],
  },
  deepDive: [
    {
      heading: 'tuple 與結構化繫結',
      body: '`std::tuple<Ts...>` 常用於泛型回傳多值、儲存異質參數包，或作為 `when_all` 這類非同步組合子的結果。結構化繫結 `auto [a, b] = value;` 對 pair、tuple、array 與聚合都可用，讓呼叫端不必寫 `std::get<0>`。\n\n但 tuple 欄位沒有名稱，若資料有穩定語意，公開 API 通常應回傳具名 struct；tuple 更適合短距離、泛型內部或明顯的 pair-like 場景。',
    },
    {
      heading: 'invoke 是泛型呼叫的共同語言',
      body: '直接寫 `f(args...)` 無法處理成員指標；`std::invoke` 把所有可呼叫形式統一成同一套規則，標準庫的 `std::thread`、`std::async`、ranges projection 與許多 adaptor 都以 invoke 語意為基礎。\n\n回傳型別用 `std::invoke_result_t<F, Args...>`，可呼叫性檢查用 `std::is_invocable_v` 或 concepts。這能避免在函式本體深處才爆出難讀錯誤。',
    },
    {
      heading: 'reference_wrapper 與 bind_front 的邊界',
      body: '`std::ref`／`std::cref` 產生可複製的參考包裝，常用於 thread、bind、tuple 等會複製參數的設施。它只是不擁有的參考，生命週期仍由呼叫端保證。\n\n`std::bind_front` 比舊式 `std::bind` 更單純：它只固定前幾個參數，不引入 `_1` 佔位符與複雜重排。需要更清楚的邏輯時，lambda 通常比 bind 更可讀。',
    },
  ],
  pitfalls: [
    '公開 API 濫用 `tuple` 回傳，呼叫端看不出每個欄位語意。',
    '把 `std::ref` 指向的物件銷毀後仍呼叫包裝器，造成懸置參考。',
    '在泛型呼叫中手寫 `f(args...)`，結果不支援成員函式或資料成員指標。',
    '過度使用舊式 `std::bind`，讓參數順序與生命週期難以審查。',
  ],
  bestPractices: [
    '泛型呼叫預設使用 `std::invoke`，並用 `std::invocable` 或 `is_invocable` 約束。',
    '短距離泛型組合可用 tuple；穩定公開資料優先用具名 struct。',
    '用 `std::apply` 處理 tuple 展開，只有必要時才手寫 `index_sequence`。',
    '簡單部分套用用 `std::bind_front` 或 lambda；需保留參考時明確用 `std::ref`／`cref`。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '`std::apply` 的主要用途是什麼？',
      options: [
        { id: 'a', text: '把 tuple 內容展開成函式呼叫引數' },
        { id: 'b', text: '把所有容器排序' },
        { id: 'c', text: '在執行期載入 shared library' },
        { id: 'd', text: '強制物件移動' },
      ],
      correctOptionId: 'a',
      explanation:
        '`std::apply(f, tuple)` 等價於把 tuple 的每個元素依序傳給 f，常用於泛型轉接與 tuple 展開。',
    },
    {
      id: 'q2',
      stem: '為什麼泛型程式常用 `std::invoke`？',
      options: [
        { id: 'a', text: '它只支援 lambda，但速度最快' },
        { id: 'b', text: '它統一處理一般 callable、成員函式指標與成員資料指標' },
        { id: 'c', text: '它會自動建立執行緒' },
        { id: 'd', text: '它會複製所有引數' },
      ],
      correctOptionId: 'b',
      explanation: '`std::invoke` 是標準庫泛型呼叫規則的核心，可涵蓋直接呼叫與成員指標呼叫。',
    },
    {
      id: 'q3',
      stem: '`std::ref(x)` 解決什麼問題？',
      options: [
        { id: 'a', text: '讓需要複製保存引數的設施仍能保留對 x 的參考語意' },
        { id: 'b', text: '把 x 轉成右值' },
        { id: 'c', text: '延長 x 的生命週期到程式結束' },
        { id: 'd', text: '把 x 變成 atomic' },
      ],
      correctOptionId: 'a',
      explanation: '`std::reference_wrapper` 是可複製的參考包裝；它不擁有物件，也不延長生命週期。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['tuple', 'apply', 'invoke', 'constraints'],
    caption:
      'Callable 工具鏈：tuple 打包引數，apply 展開，invoke 統一呼叫規則，concepts/traits 檢查可呼叫性。',
  },
  tryIt: {
    code: `#include <functional>
#include <iostream>
#include <tuple>

int add(int a, int b) { return a + b; }

int main() {
    auto args = std::tuple{20, 22};
    std::cout << std::apply(add, args) << '\\n';
    std::cout << std::invoke(std::plus<>{}, 3, 4) << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::tuple - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/utility/tuple',
      description: 'tuple、get、tuple_size 與相關工具。',
    },
    {
      title: 'std::apply - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/utility/apply',
      description: '將 tuple 展開為函式呼叫引數。',
    },
    {
      title: 'std::invoke - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/utility/functional/invoke',
      description: '標準泛型呼叫規則與成員指標支援。',
    },
  ],
};

export default ch12CallableUtilities;
