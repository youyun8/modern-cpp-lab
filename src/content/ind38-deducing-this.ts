import type { ChapterContent } from '@/types/ChapterContent';

const ind38DeducingThis: ChapterContent = {
  slug: 'ind38-deducing-this',
  chapterLabel: '第 67 章',
  title: 'Deducing this 與 Explicit Object Parameters（C++23）',
  group: '第 20 部：C++20~26 語言與工具庫新特性',
  description:
    'C++23 最具革命性的類別設計特性，透過顯式物件參數（Explicit Object Parameters），優雅地解決了重複撰寫方法重載與 CRTP（Curiously Recurring Template Pattern）帶來的複雜性。',
  concept: {
    standard: 'C++23',
    body: '在 C++ 中，類別的成員函式背後總是隱藏著一個指標 `this`。當你需要為同一個方法提供 `const`、非 `const`、`&` (lvalue) 與 `&&` (rvalue) 版本時（例如實作 `operator[]` 或 getter），你必須將相同的邏輯複製貼上四次，或者使用笨拙的 `const_cast` 委派。\n\nC++23 引入了「Deducing this」（顯式物件參數）。它允許你在成員函式的第一個參數加上 `this` 關鍵字，直接將呼叫此方法的物件作為一般參數傳入。這讓你可以使用樣板（例如 `this auto&& self`）一次性推導出物件的確切型別與值類別（Value Category），從而用一個函式取代過去的四個重載。',
  },
  deepDive: [
    {
      heading: '消滅多載地獄（Boilerplate Overloads）',
      body: '傳統上，如果要實作一個回傳內部成員參考的方法，我們至少要寫兩個版本：一個回傳 `T&` 的普通版本，以及一個回傳 `const T&` 的 `const` 版本。如果還需要支援 Move 語意（回傳 `T&&`），代碼量會倍增。透過 `template <typename Self> auto&& value(this Self&& self)`，編譯器會根據呼叫端的狀態，自動推導 `Self` 為 `MyClass&`、`const MyClass&` 或 `MyClass&&`，並利用完美轉發（Perfect Forwarding）正確回傳對應的參考型別。',
    },
    {
      heading: '簡化並取代 CRTP',
      body: '在 C++20 之前，為了在基礎類別（Base Class）中得知衍生類別（Derived Class）的型別以達成靜態多型，我們必須依賴 CRTP（把衍生類別當作樣板參數傳給基礎類別）。CRTP 語法複雜且難以閱讀。\n有了 Deducing this，基礎類別的方法可以直接宣告 `this auto&& self`，由於 `self` 在呼叫時會被推導為實際呼叫的衍生類別型別，因此不需任何 CRTP 的樣板繼承，就能在基礎類別內直接呼叫衍生類別的方法，語法更直覺也更符合直覺的物件導向認知。',
    },
    {
      heading: '遞迴 Lambda 的救星',
      body: '在 C++23 之前，Lambda 表達式不能直接呼叫自己。你必須把它包進 `std::function`（有執行期開銷），或把 Lambda 自己當作 `auto&` 參數傳遞給自己。現在，Lambda 也可以使用顯式物件參數：`auto fib = [](this auto const& self, int n) { ... return self(n-1) + self(n-2); };`，讓 Lambda 的遞迴寫法優雅且零成本。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <iostream>
#include <string>
#include <utility>

class DataBox {
    std::string data_ = "Secret";

public:
    // 傳統寫法：需要 const 與 non-const 兩個版本
    // std::string& get() { return data_; }
    // const std::string& get() const { return data_; }

    // C++23 顯式物件參數寫法：一個打天下
    template <typename Self>
    auto&& get(this Self&& self) {                         // [1]
        // std::forward-like 轉發內部成員
        return std::forward<Self>(self).data_; 
    }
};

// C++23 取代 CRTP 的靜態多型
struct Base {
    template <typename Self>
    void interface(this Self&& self) {                     // [2]
        std::cout << "Base pre-hook\\n";
        // 直接存取衍生物件的實作
        self.implementation(); 
        std::cout << "Base post-hook\\n";
    }
};

struct Derived : Base {
    void implementation() {
        std::cout << "Derived implementation!\\n";
    }
};

int main() {
    DataBox box;
    const DataBox cbox;

    // 根據物件本身是否 const，自動回傳 string& 或 const string&
    box.get() = "Changed"; 
    std::cout << cbox.get() << '\\n';                       // [3]

    Derived d;
    d.interface();                                         // [4]
    
    return 0;
}`,
    callouts: [
      {
        n: 1,
        text: '`this Self&& self` 將呼叫物件綁定為顯式的第一個參數，可精準保留 const 與 rvalue 屬性。',
      },
      {
        n: 2,
        text: '基礎類別不再需要寫成 `Base<Derived>`，透過 `this Self&&` 就能存取實際的衍生類別型別。',
      },
      {
        n: 3,
        text: '編譯器自動將對 `cbox.get()` 的呼叫推導為 `const DataBox&`。',
      },
      {
        n: 4,
        text: '完全取代 CRTP，寫法更乾淨，且無虛擬函式開銷。',
      },
    ],
  },
  pitfalls: [
    '遮蔽問題：顯式物件參數的名稱（如 `self`）會遮蔽原本的 `this` 指標，在函式內你必須使用 `self.member` 而不是 `this->member` 或隱式成員存取。',
    '靜態成員混淆：使用了顯式物件參數的方法，在技術上更接近一般的靜態函式加上額外參數，你不能在其中直接寫成員變數的名稱（必須寫 `self.data_`）。',
  ],
  bestPractices: [
    '當你的類別需要多個 CV 限制（const/volatile/&/&&）重載時，優先採用 Deducing this 重構。',
    '逐步汰換程式碼中的 CRTP 樣式，改用 Deducing this 以降低樣板程式碼的複雜度。',
    '寫遞迴 Lambda 時，將 `this auto& self` 作為標準起手式。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '使用 Deducing this (C++23) 取代 CRTP 的主要優勢為何？',
      options: [
        { id: 'a', text: '可以移除基礎類別對衍生類別的樣板依賴，讓繼承關係與呼叫語法更直覺' },
        { id: 'b', text: '可以將靜態多型轉換為虛擬函式的動態多型' },
        { id: 'c', text: '可以避免所有的編譯期錯誤' },
        { id: 'd', text: '可以讓類別自動支援反射' },
      ],
      correctOptionId: 'a',
      explanation:
        'Deducing this 讓基礎類別能透過 `this auto&& self` 直接推導出實際的衍生型別，完全不需 CRTP 的奇特遞迴樣板。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['呼叫端 d.interface()', '推導 this Self&& = Derived&', '呼叫 self.implementation()'],
    caption: 'C++23 Deducing this 實作靜態多型的流程，無需樣板繼承。',
  },
  tryIt: {
    code: `#include <iostream>

int main() {
    // C++23 遞迴 Lambda
    auto fib = [](this auto const& self, int n) -> int {
        if (n <= 1) return n;
        return self(n - 1) + self(n - 2);
    };

    std::cout << "fib(10) = " << fib(10) << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Explicit object parameter - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/member_functions#Explicit_object_parameter',
      description: 'Deducing this 特性的語法與技術細節。',
    },
    {
      title: 'P0847R7: Deducing this',
      href: 'https://wg21.link/p0847r7',
      description: '將 Deducing this 引入 C++23 的原始提案文件。',
    },
  ],
};

export default ind38DeducingThis;
