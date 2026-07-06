import type { ChapterContent } from '@/types/ChapterContent';

const ch12ForwardingReferences: ChapterContent = {
  slug: 'ch12-forwarding-references',
  chapterLabel: '第 12.1 章',
  title: '參考與完美轉發：&、&&、std::forward',
  group: '第 2 部：物件導向與泛型程式設計',
  description:
    '左值參考、右值參考、轉發參考、參考塌陷與完美轉發：如何設計保留值類別且不產生多餘複製的泛型 API。',
  concept: {
    standard: 'C++20',
    body: '`T&` 繫結左值，`const T&` 可延長暫時物件生命週期並作唯讀借用，`T&&` 在非推導脈絡代表右值參考，常用於接收可被移動的暫時值；但在 `template<class T> void f(T&&)` 或 `auto&&` 這種型別推導脈絡中，它是轉發參考。轉發參考會依實際引數推導成左值或右值，再透過參考塌陷規則合成最終型別；`std::forward<T>(x)` 根據推導出的 `T` 保留原始值類別，讓泛型包裝器把引數「完美轉發」給下一層。設計重點是語意而非符號：讀取用 `const&`，擁有或儲存用值與 `std::move`，泛型轉交才用 `T&&` + `std::forward`。',
  },
  code: {
    lang: 'cpp',
    code: `#include <iostream>
#include <string>
#include <utility>

void consume(const std::string& s) {  // [1]
    std::cout << "read/copy path: " << s << '\\n';
}

void consume(std::string&& s) {  // [2]
    std::cout << "move path: " << s << '\\n';
}

template <typename T>
void relay(T&& value) {  // [3]
    consume(std::forward<T>(value));  // [4]
}

template <typename T, typename... Args>
T make_object(Args&&... args) {
    return T(std::forward<Args>(args)...);  // [5]
}

struct Token {
    std::string text;
    explicit Token(std::string value) : text(std::move(value)) {}
};

int main() {
    std::string name = "left value";
    relay(name);                    // T = std::string&, calls the const& overload
    relay(std::string{"temporary"}); // T = std::string, calls the && overload

    Token token = make_object<Token>("forwarded text");
    std::cout << token.text << '\\n';
}`,
    callouts: [
      {
        n: 1,
        text: '`const std::string&` 表示唯讀借用：可接左值，也可接暫時值，但不取得所有權。',
      },
      {
        n: 2,
        text: '`std::string&&` 是具體右值參考多載，表示呼叫端允許此函式移動資源。',
      },
      {
        n: 3,
        text: '在型別推導脈絡中，`T&&` 是轉發參考；傳左值時 `T` 推導為 `std::string&`。',
      },
      {
        n: 4,
        text: '`std::forward<T>` 依 `T` 的推導結果保留左值／右值類別；若改成 `std::move`，左值也會被誤轉成右值。',
      },
      {
        n: 5,
        text: '工廠、emplace、包裝器是完美轉發的典型用途：外層不解讀引數，只把它們正確交給內層建構。',
      },
    ],
  },
  deepDive: [
    {
      heading: '& 與 &&：宣告符號不是完整故事',
      body: '`T&` 只能繫結可命名的左值，常用於輸出參數或可變借用；`const T&` 可繫結左值與暫時值，適合大型唯讀參數。`T&&` 在具體型別上是右值參考，但「具名的右值參考變數本身是左值」：`void f(std::string&& s) { g(s); }` 會把 `s` 當左值傳出，若要轉移必須寫 `g(std::move(s))`。\n\n因此 `&&` 只表示型別可繫結右值，不表示這個運算式永遠是右值。實務上要同時判斷型別與值類別。',
    },
    {
      heading: '參考塌陷與轉發參考',
      body: '參考塌陷規則只有四種：`& & -> &`、`& && -> &`、`&& & -> &`、`&& && -> &&`。在 `template<class T> void f(T&&)` 中，若傳入左值，`T` 推導成 `U&`，最後 `U& &&` 塌陷為 `U&`；若傳入右值，`T` 推導成 `U`，最後成為 `U&&`。\n\n`std::forward<T>(x)` 正是利用這個推導結果恢復呼叫端原本的值類別。`const T&&` 不是轉發參考，類別樣板成員中的 `T&&` 若 `T` 已由類別決定也不是轉發參考。',
    },
    {
      heading: 'API 設計：什麼時候該轉發',
      body: '完美轉發適合「透明包裝」：工廠函式、`emplace`、scope guard、轉接 callback 等外層不應改變引數語意的場景。若函式會保存資料，通常應改用傳值接收，再移入成員：`Widget(std::string name) : name_(std::move(name)) {}`，這讓左值複製、右值移動，介面也更簡單。\n\n過度使用轉發參考會讓多載解析變得貪婪，攔截本該走到 `std::string_view`、`initializer_list` 或複製建構子的呼叫。公開 API 應以概念約束、明確多載或傳值設計降低驚訝。',
    },
    {
      heading: 'OOP 與樣板設計中的所有權邊界',
      body: 'OOP 介面要先說清楚所有權：`T&`／`T*` 表示非擁有借用，`std::unique_ptr<T>` 表示轉移所有權，`std::shared_ptr<T>` 表示共享所有權，`std::span`／`std::string_view` 表示非擁有範圍。樣板可把這些語意泛型化，但不應掩蓋它們。\n\n把「借用、擁有、轉移、轉發」分開命名與建模，會比單純把所有參數都寫成 `auto&&` 更可維護。',
    },
  ],
  pitfalls: [
    '在轉發函式中用 `std::move(value)`，把呼叫端的左值也誤當成可移動資源。',
    '在具體右值參考參數上誤用 `std::forward<T>`；沒有推導出的 `T` 時應用 `std::move`。',
    '以轉發參考撰寫過度泛化的建構子，攔截複製／移動建構或 `initializer_list` 多載。',
    '把轉發進來的參考保存到物件內，卻沒有證明來源生命週期足夠長。',
  ],
  bestPractices: [
    '讀取大型物件用 `const&`，要保存資料用傳值加 `std::move`，透明轉接才用轉發參考。',
    '只對推導出的 `T&&` 使用 `std::forward<T>`；具名右值參考再次傳出時用 `std::move`。',
    '公開的轉發建構子加上 concepts／requires，避免吃掉不該吃的多載。',
    '所有權用型別表達：借用用參考或 view，擁有用值或智慧指標，轉移用 `unique_ptr` 或右值。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '在 `template<class T> void f(T&& x)` 中，`T&&` 何時是轉發參考？',
      options: [
        { id: 'a', text: '只要看到 `&&` 就一定是轉發參考' },
        { id: 'b', text: '當 `T` 是此函式呼叫時被推導出的型別參數時' },
        { id: 'c', text: '只有 `T` 是 `const` 時' },
        { id: 'd', text: '只有函式是 virtual 時' },
      ],
      correctOptionId: 'b',
      explanation:
        '`T&&` 必須位在型別推導脈絡中才是轉發參考；若 `T` 已經由類別樣板或別處決定，就只是右值參考。',
    },
    {
      id: 'q2',
      stem: '為什麼轉發函式通常寫 `std::forward<T>(x)` 而不是 `std::move(x)`？',
      options: [
        { id: 'a', text: '`std::forward<T>` 會保留呼叫端原本的左值／右值類別' },
        { id: 'b', text: '`std::move` 不能用在字串' },
        { id: 'c', text: '`std::forward<T>` 會複製所有物件' },
        { id: 'd', text: '兩者完全相同，只是命名不同' },
      ],
      correctOptionId: 'a',
      explanation:
        '`std::move` 會無條件轉成右值；`std::forward<T>` 依 `T` 的推導結果保留左值或右值，才符合完美轉發語意。',
    },
    {
      id: 'q3',
      stem: '下列哪個 API 設計最適合「保存一份字串到物件成員」？',
      options: [
        { id: 'a', text: '`Widget(std::string name) : name_(std::move(name)) {}`' },
        { id: 'b', text: '`Widget(const std::string&& name)` 並保存參考' },
        { id: 'c', text: '`Widget(auto&& name)` 並把 `name` 的參考存起來' },
        { id: 'd', text: '只接受 `char*` 並假設呼叫端永遠有效' },
      ],
      correctOptionId: 'a',
      explanation:
        '傳值加 `std::move` 清楚表達物件會擁有自己的字串；左值呼叫時複製，右值呼叫時移動，生命週期最容易推理。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['左值/右值', '參考塌陷', 'std::forward', 'API 所有權'],
    caption:
      '參考與轉發的決策鏈：先判斷值類別，再由參考塌陷決定型別，最後以 forward/move 表達轉接或轉移。',
  },
  tryIt: {
    code: `#include <iostream>
#include <string>
#include <utility>

void sink(const std::string&) { std::cout << "const&\\n"; }
void sink(std::string&&) { std::cout << "&&\\n"; }

template <typename T>
void relay(T&& value) {
    sink(std::forward<T>(value));
}

int main() {
    std::string s = "hello";
    relay(s);
    relay(std::string{"world"});
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'References - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/reference',
      description: '左值參考、右值參考、轉發參考與參考塌陷規則。',
    },
    {
      title: 'Value categories - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/value_category',
      description: 'lvalue、xvalue、prvalue 等值類別的語言規則。',
    },
    {
      title: 'std::forward - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/utility/forward',
      description: '完美轉發的標準工具函式與範例。',
    },
  ],
};

export default ch12ForwardingReferences;
