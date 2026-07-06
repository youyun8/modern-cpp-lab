import type { ChapterContent } from '@/types/ChapterContent';

const ch10OopII: ChapterContent = {
  slug: 'ch10-oop-ii',
  chapterLabel: '第 10 章',
  title: 'OOP II：多型與運算子重載',
  group: '第 2 部：物件導向與泛型程式設計',
  description:
    '虛擬函式、動態多型與運算子重載：vtable 的運作、override／final 的正確用法，以及何時該避免虛擬函式。',
  concept: {
    standard: 'C++23',
    body: '動態多型透過虛擬函式達成：基底類別以 virtual 宣告介面，衍生類別以 override 覆寫。呼叫時經由 vtable（虛擬函式表）在執行期分派到實際型別的實作。基底類別若要被多型使用，其解構子必須為 virtual，否則透過基底指標刪除衍生物件會導致未定義行為。override 讓編譯器檢查你確實覆寫了某函式，final 則禁止再被覆寫或繼承。虛擬呼叫有間接跳轉成本且阻礙內聯，效能敏感處可改用樣板或 CRTP 的靜態多型。運算子重載讓自訂型別支援 +、==、<=> 等語法；C++20 的三向比較運算子 <=> 可一次生成全部關係運算子。',
  },
  code: {
    lang: 'cpp',
    code: `#include <memory>
#include <print>
#include <vector>

struct Shape {
    virtual ~Shape() = default;       // [1] 多型基底必須有 virtual 解構子
    virtual double area() const = 0;  // [2] 純虛擬函式：抽象介面
};

struct Circle : Shape {
    double r;
    explicit Circle(double r) : r(r) {}
    double area() const override {  // [3] override 讓編譯器檢查簽章
        return 3.141592653589793 * r * r;
    }
};

struct Square final : Shape {  // [4] final：不可再被繼承
    double s;
    explicit Square(double s) : s(s) {}
    double area() const override { return s * s; }
};

int main() {
    std::vector<std::unique_ptr<Shape>> shapes;  // [5] 以基底指標統一管理
    shapes.push_back(std::make_unique<Circle>(1.0));
    shapes.push_back(std::make_unique<Square>(2.0));
    for (const auto& s : shapes) std::println("area = {:.3f}", s->area());  // 執行期分派
    return 0;
}`,
    callouts: [
      {
        n: 1,
        text: '若基底類別會被多型刪除，解構子必須為 virtual，否則 delete 基底指標是未定義行為。',
      },
      { n: 2, text: '= 0 宣告純虛擬函式，使 Shape 成為抽象類別，強制衍生類別提供實作。' },
      { n: 3, text: 'override 明確表達覆寫意圖；若簽章不符（漏掉 const 等）編譯器會報錯。' },
      { n: 4, text: 'final 禁止 Square 再被繼承，可讓編譯器去虛擬化（devirtualize）以最佳化。' },
      { n: 5, text: '以 unique_ptr<Shape> 的容器統一持有不同衍生型別，呼叫時經 vtable 動態分派。' },
    ],
  },
  deepDive: [
    {
      heading: '物件佈局、vtable 與去虛擬化',
      body: '具虛擬函式的物件內含一個指向 vtable 的 vptr；虛擬呼叫是一次間接跳轉，難以內聯且對分支預測不友善。當編譯器能證明實際型別（例如經 `final` 標記或區域物件）時，可去虛擬化（devirtualization）以恢復內聯。\n\n熱路徑上大量的小型虛擬呼叫會成為瓶頸；此時應考慮以樣板／CRTP 的靜態多型，或以資料導向設計批次處理同型別物件。',
    },
    {
      heading: '虛擬解構子與物件切片',
      body: '多型基底必須有虛擬解構子，否則經基底指標 `delete` 衍生物件是 UB。以值（而非參考／指標）複製多型物件會發生物件切片（slicing），只複製基底部分並遺失衍生狀態與 vtable。\n\n需要多型複製時採 clone 慣用法（虛擬的 `clone()` 回傳 `unique_ptr<Base>`）。以容器保存多型物件時一律用智慧指標而非值。',
    },
    {
      heading: '三向比較與名稱隱藏',
      body: 'C++20 的 `operator<=>` 搭配 `= default` 可一次生成一致的關係運算子，並自動處理 `==`（通常需另行 `= default`）。設計比較時要注意 `<=>` 的回傳類型（`strong_ordering`／`partial_ordering`）。\n\n衍生類別若定義與基底同名的函式會隱藏基底的所有同名多載（name hiding），需以 `using Base::f;` 引入。漏寫 `override` 可能意外造成隱藏而非覆寫。',
    },
  ],
  pitfalls: [
    '多型基底缺少虛擬解構子，經基底指標刪除衍生物件屬 UB。',
    '以值複製多型物件造成物件切片，遺失衍生型別資訊。',
    '在建構子／解構子中呼叫虛擬函式，分派到的是當前（非最終）型別。',
    '衍生類別同名函式隱藏基底多載，且漏寫 `override` 造成意外隱藏。',
  ],
  bestPractices: [
    '多型基底一律宣告虛擬（或 protected 非虛擬）解構子。',
    '覆寫時一致使用 `override`；不再被繼承的類別／函式標 `final` 以利去虛擬化。',
    '多型物件以智慧指標保存；需複製時提供虛擬 `clone()`。',
    '偏好組合優於深繼承；效能熱路徑考慮靜態多型。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '為什麼會被多型使用的基底類別，其解構子應宣告為 virtual？',
      options: [
        { id: 'a', text: '為了讓程式編譯更快' },
        { id: 'b', text: '否則透過基底指標 delete 衍生物件會導致未定義行為（衍生解構子不被呼叫）' },
        { id: 'c', text: 'virtual 解構子可以節省記憶體' },
        { id: 'd', text: '這只是風格偏好，沒有實質差異' },
      ],
      correctOptionId: 'b',
      explanation:
        '非 virtual 解構子透過基底指標刪除衍生物件時，只會呼叫基底解構子，屬未定義行為並可能洩漏資源。參見 Ch.10 PDF 第 26 頁。',
    },
    {
      id: 'q2',
      stem: 'override 關鍵字的作用是什麼？',
      options: [
        { id: 'a', text: '建立一個新的虛擬函式' },
        { id: 'b', text: '要求編譯器驗證此函式確實覆寫了基底的某個虛擬函式' },
        { id: 'c', text: '禁止函式被呼叫' },
        { id: 'd', text: '讓函式變成 inline' },
      ],
      correctOptionId: 'b',
      explanation:
        'override 讓編譯器檢查簽章是否真的匹配基底虛擬函式，避免因手誤（如漏 const）而意外新增一個函式。參見 Ch.10 PDF 第 31 頁。',
    },
    {
      id: 'q3',
      stem: 'C++20 的三向比較運算子 <=>（spaceship）主要好處是什麼？',
      options: [
        { id: 'a', text: '它讓程式自動平行化' },
        { id: 'b', text: '定義一個 <=> 即可由編譯器生成 <、<=、>、>= 等全部關係運算子' },
        { id: 'c', text: '它取代了所有算術運算子' },
        { id: 'd', text: '它只適用於整數' },
      ],
      correctOptionId: 'b',
      explanation:
        'operator<=> 搭配 = default 可一次生成一致的關係運算子，大幅減少樣板程式碼。參見 Ch.10 PDF 第 49 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['基底類別', '虛擬函式', '衍生類別', 'vtable'],
    caption:
      '動態多型的運作：基底宣告虛擬介面，衍生類別覆寫實作，執行期透過 vtable 分派到正確函式。',
  },
  tryIt: {
    code: `#include <iostream>
#include <memory>
#include <vector>

struct Shape {
    virtual ~Shape() = default;
    virtual double area() const = 0;
};
struct Circle : Shape {
    double r;
    Circle(double r) : r(r) {}
    double area() const override { return 3.14159265 * r * r; }
};
struct Square : Shape {
    double s;
    Square(double s) : s(s) {}
    double area() const override { return s * s; }
};

int main() {
    std::vector<std::unique_ptr<Shape>> shapes;
    shapes.push_back(std::make_unique<Circle>(1.0));
    shapes.push_back(std::make_unique<Square>(2.0));
    for (const auto& s : shapes) std::cout << "area = " << s->area() << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Virtual functions - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/virtual',
      description: '虛擬函式、覆寫規則與純虛擬函式的完整說明。',
    },
    {
      title: 'Default comparisons (operator<=>) - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/default_comparisons',
      description: 'C++20 三向比較與自動生成關係運算子。',
    },
    {
      title: 'Modern C++ Programming — OOP II (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/10.Object_oriented_programming_II.html',
      description: 'Busato 課程第 10 章 HTML 投影片，涵蓋多型與運算子重載原文。',
    },
  ],
};

export default ch10OopII;
