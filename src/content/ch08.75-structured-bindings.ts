import type { ChapterContent } from '@/types/ChapterContent';

const ch08StructuredBindings: ChapterContent = {
  slug: 'ch08.75-structured-bindings',
  chapterLabel: '第 8.75 章',
  title: 'Structured Bindings：結構化綁定與解構式宣告',
  group: '第 1 部：基礎概念 Foundations',
  description:
    'C++17 structured bindings（auto [x, y] = ...）語法：解構 tuple、pair、array 與 struct 回傳值，以及 C++20 NTTP 字串與綁定別名的進階用法。',
  concept: {
    standard: 'C++20',
    body: '結構化綁定讓你一次從聚合型別或 tuple-like 物件中取出多個命名變數，而不必逐一 access。C++17 引入 auto [a, b, c] = expr 語法，適用於 array、struct、pair、tuple、map 的 pair 元素等。被綁定的物件會被複製或移動到一個隱藏變數，然後各綁定名稱參考到其成員或 tuple 元素。C++20 進一步放寬限制，允許 static lambda 與特定情境中使用結構化綁定。此語法與 RAII、tuple 回傳值搭配，能讓「回傳多個值」的介面變得乾淨、可讀，取代傳出參數（out-parameters）與手動 std::tie。',
  },
  code: {
    lang: 'cpp',
    code: `#include <iostream>
#include <map>
#include <string>
#include <tuple>
#include <utility>

// When returning multiple values, prefer returning a tuple or struct instead of using out-parameters. [1]
std::pair<int, std::string> find_item(int key) {
    return {key, std::string{"item#"} + std::to_string(key)};
}

// Use structured bindings to receive both return values at once, with clear names. [2]
auto [id, name] = find_item(42);

// Can also bind to references to avoid copying large objects. [3]
auto& [ref_id, ref_name] = find_item(100);

// Walk a map in a loop: name key and value directly. [4]
void print_map(const std::map<int, std::string>& items) {
    for (const auto& [key, value] : items) {  // [5]
        std::cout << key << " -> " << value << "\\n";
    }
}

// Structured bindings can also destructure arrays. [6]
std::tuple<int, double, std::string> get_metrics() {
    return {7, 3.14, "ok"};
}

// C++20 allows an init-statement inside for. [7]
struct Point { int x; int y; };
Point center{10, 20};
auto [cx, cy] = center;  // [8] Structured binding of an aggregate type

// Example combined with if-init. [9]
int main() {
    auto [status, payload] = find_item(7);  // [10]
    std::cout << status << ": " << payload << "\\n";

    auto [metric_i, metric_d, metric_s] = get_metrics();  // [11]
    std::cout << metric_i << ", " << metric_d << ", " << metric_s << "\\n";

    std::map<int, std::string> m{{1, "one"}, {2, "two"}};
    print_map(m);

    // Check the insert return value, unpacking pair<bool, iterator> at once. [12]
    auto [iter, inserted] = m.insert({3, "three"});
    std::cout << "inserted=" << inserted << " value=" << iter->second << "\\n";
    return 0;
}`,
    callouts: [
      {
        n: 1,
        text: '回傳 tuple/pair 比用 out-parameter 更清楚，呼叫端用結構化綁定一次命名所有回傳值。',
      },
      {
        n: 2,
        text: 'auto [id, name] 依序綁定到 pair 的 first 與 second，命名比 .first/.second 可讀得多。',
      },
      {
        n: 3,
        text: 'auto& [ref_id, ref_name] 綁定到引用，避免複製大型回傳物件；需確保來源生命週期足夠長。',
      },
      {
        n: 4,
        text: 'range-based for 與結構化綁定是天作之合：map 元素是 pair<const Key, T>，直接叫 key 與 value。',
      },
      {
        n: 5,
        text: 'const auto& 避免 map value 被複製；key 本來就是 const，所以整體綁定後不可修改。',
      },
      {
        n: 6,
        text: 'array 與 tuple 同樣支援 structured bindings；元素數量必須與綁定名稱數量一致，否則編譯錯誤。',
      },
      {
        n: 7,
        text: 'C++20 在 for、if、switch 中新增初始化子句，變數範圍限縮在條件內。',
      },
      {
        n: 8,
        text: '聚合型別（所有成員 public、無虛擬函式等）也可以用結構化綁定，成員依宣告順序配對。',
      },
      {
        n: 9,
        text: 'if-init 與結構化綁定合用，讓一次呼叫+多值拆解都在一個 if 語句內完成。',
      },
      {
        n: 10,
        text: 'auto [status, payload] 兩個名稱一次拆開，省去手動寫 std::get<0>(result) 的瑣碎。',
      },
      {
        n: 11,
        text: 'tuple 元素數量必須與綁定位置完全一致，編譯器會檢查數量是否對齊。',
      },
      {
        n: 12,
        text: 'std::map::insert 回傳 pair<iterator, bool>，結構化綁定讓「是否為新元素」一目瞭然。',
      },
    ],
  },
  deepDive: [
    {
      heading: '背後機制：隱藏變數與別名參考',
      body: '結構化綁定不是「解構」成獨立變數，而是編譯器產生一個隱藏的物件 e（把整個右值複製或移動進去），然後每個綁定名稱都是 e 的某個成員的參考（alias）。例如 auto [a, b] = pair，編譯器等同產生 auto e = pair 然後 decltype(pair)::first& a = e.first; 等語法。理解這點很重要：結構化綁定名稱不是「獨立變數」，而是參考；對它們取 sizeof 會得到底層成員的大小，對它們做 std::move 會 move 到底層成員，而隱藏變數 e 才是實際被管理壽命的實體。',
    },
    {
      heading: '引用綁定與生命週期陷阱',
      body: '如果用 auto& [a, b] = 右值表達式（例如函式回傳值），編譯器會延長隱藏物件的生命週期到綁定所在的作用域結束，因此 a、b 仍然有效。但如果用 auto&& [a, b]（萬用參考綁定）來綁定一個將死（即將過期）的臨時物件，仍然會發生懸置參考——結構化綁定本身不提供額外的生命週期保護。最安全的方式是 auto [a, b]（複製）或 const auto& [a, b]（底層物件為 const，適用於 tuple 內含 copyable 小物件）；對大型物件應先儲存到明確變數，再拆成引用。',
    },
    {
      heading: 'std::tie 的互補角色',
      body: '在 C++17 之前，回傳多值常見的「接收」方式是用 std::tie：int id; std::string name; std::tie(id, name) = find_item(42); tie 會把每個變數當成 lvalue reference 綁定到右邊 tuple 的對應元素。結構化綁定出現後，std::tie 的用途縮小到「必須先宣告變數、再從 tuple 賦值」的場景，以及 std::ignore 的用法（例如 std::tie(iter, std::ignore) = map.insert(...)，只提取第一個元素）。對新程式碼，優先使用結構化綁定，因為它一次宣告並命名所有元件，可讀性更好。',
    },
    {
      heading: '自訂型別支援結構化綁定',
      body: '任何符合「tuple-like」介面的型別都可被結構化綁定，編譯器會去查找 std::tuple_size<T>::value 與 std::tuple_element<I, T>::type，並以 get<I>(t) 取得元素。標準型別如 pair、tuple、array、optional、expected（C++23）都實作了這些特化。你可以對自己的型別特化 std::tuple_size 與 std::tuple_element，並提供 get 的多載，讓它也能被 auto [a, b] = myType 拆解。',
    },
  ],
  pitfalls: [
    '綁定名稱數量與 tuple/struct 成員數量不一致，編譯器報錯訊息可能指向隱藏變數而非顯而易見的原因。',
    '以 auto& 綁定函式回傳的 tuple，認為變數是獨立副本；它們其實是引用，修改它等於修改原始物件。',
    'structured bindings 不能用於 left-value 賦值的目標（例如 auto [a, b] 不能重新賦值綁定名稱），綁定後名稱即固定。',
    '對含 std::string_view 的 tuple 用 auto [a, b] = f()，若 f() 回傳的 string_view 指向其內部 std::string，string_view 可能懸置。',
    '忘記結構化綁定不能用於 lambda capture（C++20 前），需要用顯式變數。',
  ],
  bestPractices: [
    '回傳多值優先用 tuple/pair/struct + structured bindings，取代 out-parameter。',
    '迴圈走訪 map 時一律用 const auto& [key, value]，避免複製 value。',
    '只需要 tuple 部分元素時，可用 std::tie + std::ignore 提取，或引入 C++26 的 _ placeholder。',
    '對自訂型別若期望 common API 能被結構化綁定，實作 std::tuple_size、std::tuple_element 與 get<I>()。',
    '不要用結構化綁定拆解暫時 tuple 中指向臨時物件的 pointer/reference，避免懸置。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '結構化綁定 auto [x, y] = func() 的回傳型別是 std::pair<int, std::string> 時，x 與 y 分別對應什麼？',
      options: [
        { id: 'a', text: 'x 對應 second（string），y 對應 first（int）' },
        { id: 'b', text: 'x 對應 first（int），y 對應 second（string）' },
        { id: 'c', text: '兩者都是對整個 pair 的别名；不會拆開' },
        { id: 'd', text: 'depends on compiler optimization' },
      ],
      correctOptionId: 'b',
      explanation:
        '結構化綁定依 tuple-like 型別的元素順序配對名稱；對 pair 而言，[0] 是 first，[1] 是 second。',
    },
    {
      id: 'q2',
      stem: 'auto [a, b] = tuple 與 auto& [a, b] = tuple 的主要差異是什麼？',
      options: [
        { id: 'a', text: '兩者完全相同，只是寫法不同' },
        { id: 'b', text: 'auto 會複製 tuple 元素到隱藏變數，auto& 則讓 a、b 參考原始元素' },
        { id: 'c', text: 'auto& 只能用於 primitive 型別' },
        { id: 'd', text: 'auto 會自動把元素轉成 const 參考' },
      ],
      correctOptionId: 'b',
      explanation:
        'auto [a,b] 會先把整個 tuple 複製到隱藏變數 e，a、b 是 e 的成員引用；auto& [a,b] 會讓隱藏變數 e 為 reference，因此 a、b 最終參考到原始物件。',
    },
    {
      id: 'q3',
      stem: 'std::tie 在現代 C++ 中的主要殘留用途是什麼？',
      options: [
        { id: 'a', text: '取代所有結構化綁定' },
        { id: 'b', text: '配合 std::ignore 只提取 tuple 的部分元素，或需要先宣告變數再賦值的場景' },
        { id: 'c', text: '讓 lvalue 可以參加到 rvalue tuple' },
        { id: 'd', text: '讓 lambda 能 capture tuple' },
      ],
      correctOptionId: 'b',
      explanation:
        '結構化綁定出現後，tie 主要只剩 std::tie(a, std::ignore) = tup 這類「只拆部分元素」的用途，或需要先宣告變數的情境。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['tuple/pair', '結構化綁定', 'map 迴圈', 'tie + ignore'],
    caption: '結構化綁定把 tuple-like 型別的元素直接命名，讓回傳多值與 map 迴圈都變得清晰可讀。',
  },
  tryIt: {
    code: `#include <iostream>
#include <map>
#include <string>

std::pair<int, std::string> find_item(int key) {
    return {key, std::string{"item#"} + std::to_string(key)};
}

int main() {
    auto [id, name] = find_item(42);
    std::cout << id << ": " << name << "\\n";

    std::map<int, std::string> m{{1, "alpha"}, {2, "beta"}};
    for (const auto& [k, v] : m) {
        std::cout << k << " -> " << v << "\\n";
    }
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Structured binding declaration - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/structured_binding',
      description: '結構化綁定的完整語言規則，包含隱藏變數的生命週期與別名參考說明。',
    },
    {
      title: 'std::tuple_size - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/utility/tuple_size',
      description: '讓自訂型別可被結構化綁定的 tuple-like 介面規範。',
    },
    {
      title: 'std::tie - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/utility/tuple/tie',
      description: '與 std::ignore 配合提取 tuple 部分元素的傳統工具。',
    },
  ],
};

export default ch08StructuredBindings;
