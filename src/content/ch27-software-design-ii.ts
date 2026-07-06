import type { ChapterContent } from '@/types/ChapterContent';

const ch27SoftwareDesignII: ChapterContent = {
  slug: 'ch27-software-design-ii',
  chapterLabel: '第 27 章',
  title: '軟體設計 II：CRTP 與 PIMPL',
  group: '第 7 部：軟體設計與工具',
  description:
    'CRTP、PIMPL 慣用法與常見設計模式：如何以靜態多型消除虛擬開銷，並以指標隔離實作降低編譯相依。',
  concept: {
    standard: 'C++23',
    body: 'CRTP（Curiously Recurring Template Pattern）讓基底樣板以衍生類別作為樣板參數（class D : Base<D>），基底可在編譯期呼叫衍生的方法，達成「靜態多型」：具介面共用之利，卻無虛擬函式的間接跳轉，可完全內聯，常用於 mixin 與高效能函式庫。PIMPL（Pointer to IMPLementation）把類別的私有成員藏到一個前置宣告的 Impl 結構，僅在標頭保留一個指標；好處是隱藏實作細節、降低編譯相依（改實作不需重編使用者）、並提供穩定的 ABI，代價是一次額外的間接與 heap 配置。其他常見模式包含 Strategy（以可替換物件封裝演算法）、Factory（集中物件建立）、Observer、Type Erasure（如 std::function）等；選擇時應以問題需求與效能預算為準，而非為模式而模式。',
  },
  code: {
    lang: 'cpp',
    code: `#include <print>

// CRTP：基底以衍生型別為樣板參數，達成可內聯的靜態多型。 [1]
template <typename Derived>
struct Shape {
    double area() const {
        return static_cast<const Derived*>(this)->areaImpl();  // [2]
    }
};

struct Circle : Shape<Circle> {
    double r;
    explicit Circle(double r) : r(r) {}
    double areaImpl() const { return 3.14159265 * r * r; }  // [3]
};

// PIMPL 骨架：標頭只見前置宣告與一個指標。 [4]
class Widget {
    struct Impl;   // 前置宣告，實作藏於 .cpp
    Impl* pimpl_;  // [5] 僅暴露一個指標，隱藏細節與相依
   public:
    Widget();
    ~Widget();
    int value() const;
};

int main() {
    Circle c{2.0};
    std::println("area = {:.3f}", c.area());  // 靜態多型，可完全內聯
    return 0;
}`,
    callouts: [
      { n: 1, text: 'CRTP 讓 Shape 在編譯期就知道實際衍生型別，呼叫可被內聯，無 vtable 開銷。' },
      {
        n: 2,
        text: 'static_cast 到 Derived 後呼叫其 areaImpl，這是靜態（編譯期）分派而非虛擬分派。',
      },
      { n: 3, text: '衍生類別提供 areaImpl 實作；介面共用但沒有執行期間接跳轉的成本。' },
      { n: 4, text: 'PIMPL 在標頭僅前置宣告 Impl，完整定義放在 .cpp，使用者無須看到私有細節。' },
      { n: 5, text: '只暴露一個指標即可隔離實作變動：改 Impl 不需重編譯使用者，並穩定 ABI。' },
    ],
  },
  deepDive: [
    {
      heading: 'CRTP 的機制與限制',
      body: 'CRTP 讓基底樣板在編譯期得知衍生型別，用於靜態多型與 mixin（把可重用行為注入衍生類別）。但在基底類別本體中，衍生類別尚不完整，因此不能直接使用衍生的成員定義——只能在成員函式本體（延後實例化）內透過 `static_cast` 存取。\n\n`std::enable_shared_from_this` 即為標準庫中的 CRTP 應用。CRTP 適合型別在編譯期已知、且需要零成本多型的場景。',
    },
    {
      heading: 'PIMPL 的成本與 ABI 細節',
      body: 'PIMPL 以一次間接與一次堆積配置換取編譯防火牆（改實作不需重編使用者）與穩定 ABI。關鍵陷阱：以 `std::unique_ptr<Impl>` 作成員時，其解構子需要 `Impl` 的完整定義，因此外層類別的解構子必須「宣告在標頭、定義在 .cpp」，否則會出現不完整型別錯誤。\n\nPIMPL 特別適合需維持二進位相容的函式庫發佈。',
    },
    {
      heading: '型別抹除與模式選擇',
      body: '`std::function`、`std::any` 以型別抹除提供統一介面，代價是間接呼叫與可能的堆積配置；自製型別抹除可針對需求最佳化。設計模式（Strategy、Factory、Observer）是溝通詞彙，但應因需求而用，而非為模式而模式。\n\n選擇時衡量：需要編譯期或執行期多型？需要 ABI 穩定嗎？熱路徑嗎？再據此挑選 CRTP、虛擬函式、PIMPL 或型別抹除。',
    },
  ],
  pitfalls: [
    '在 CRTP 基底類別本體中使用尚不完整的衍生型別成員。',
    'PIMPL 以 `unique_ptr<Impl>` 為成員，卻讓解構子留在標頭（不完整型別錯誤）。',
    '在熱路徑使用 `std::function`／`std::any`，付出型別抹除的間接成本。',
    '為套模式而套模式，徒增間接層與複雜度。',
  ],
  bestPractices: [
    'CRTP 用於編譯期多型與 mixin；經成員函式以 `static_cast` 存取衍生。',
    'PIMPL 用於 ABI 穩定的函式庫，並將解構子定義移到 .cpp。',
    '依「編譯期／執行期、ABI、熱路徑」選擇多型機制。',
    '模式服務於需求；先評估成本再引入型別抹除。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: 'CRTP 相較於虛擬函式的主要優勢是什麼？',
      options: [
        { id: 'a', text: '它在執行期動態決定型別' },
        { id: 'b', text: '它以編譯期的靜態多型取代虛擬分派，呼叫可被內聯、無 vtable 間接成本' },
        { id: 'c', text: '它讓程式碼更短，但一定更慢' },
        { id: 'd', text: '它自動管理記憶體' },
      ],
      correctOptionId: 'b',
      explanation:
        'CRTP 在編譯期解析呼叫，達成可內聯的靜態多型，適合效能敏感且型別在編譯期已知的情境。參見 Ch.27 PDF 第 22 頁。',
    },
    {
      id: 'q2',
      stem: 'PIMPL 慣用法的主要好處是什麼？',
      options: [
        { id: 'a', text: '讓程式執行更快' },
        { id: 'b', text: '隱藏實作細節、降低編譯相依（改實作不需重編使用者）並穩定 ABI' },
        { id: 'c', text: '消除所有記憶體配置' },
        { id: 'd', text: '讓類別自動變成多型' },
      ],
      correctOptionId: 'b',
      explanation:
        'PIMPL 把私有成員移到 .cpp 中的 Impl，減少標頭相依與重編譯，並提供穩定 ABI；代價是一次間接與配置。參見 Ch.27 PDF 第 38 頁。',
    },
    {
      id: 'q3',
      stem: 'std::function 是哪一種技術的典型例子？',
      options: [
        { id: 'a', text: 'CRTP' },
        { id: 'b', text: 'Type Erasure（型別抹除）' },
        { id: 'c', text: 'PIMPL' },
        { id: 'd', text: 'SFINAE' },
      ],
      correctOptionId: 'b',
      explanation:
        'std::function 以型別抹除包裝任何可呼叫物件，提供統一介面而隱藏其具體型別。參見 Ch.27 PDF 第 49 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['CRTP', 'PIMPL', 'Strategy', 'Factory'],
    caption:
      '設計工具箱：CRTP 提供靜態多型，PIMPL 隔離實作，Strategy 與 Factory 等模式封裝變化點。',
  },
  tryIt: {
    code: `#include <iostream>

template <typename Derived>
struct Shape {
    double area() const { return static_cast<const Derived*>(this)->areaImpl(); }
};
struct Circle : Shape<Circle> {
    double r;
    Circle(double r) : r(r) {}
    double areaImpl() const { return 3.14159265 * r * r; }
};
struct Square : Shape<Square> {
    double s;
    Square(double s) : s(s) {}
    double areaImpl() const { return s * s; }
};

int main() {
    Circle c{2.0};
    Square q{3.0};
    std::cout << "circle = " << c.area() << '\\n';
    std::cout << "square = " << q.area() << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'CRTP - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/crtp',
      description: 'Curiously Recurring Template Pattern 的定義與用途。',
    },
    {
      title: 'PImpl idiom - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/pimpl',
      description: 'PIMPL 慣用法的動機、實作與取捨。',
    },
    {
      title: 'Modern C++ Programming — Software Design II (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/27.Design_II.html',
      description: 'Busato 課程第 27 章 HTML 投影片，涵蓋 CRTP 與 PIMPL 原文。',
    },
  ],
};

export default ch27SoftwareDesignII;
