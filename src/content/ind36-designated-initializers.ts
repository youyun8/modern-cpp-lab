import type { ChapterContent } from '@/types/ChapterContent';

const ind36DesignatedInitializers: ChapterContent = {
  slug: 'ind36-designated-initializers',
  chapterLabel: '第 65 章',
  title: '指定初始化 Designated Initializers（C++20）',
  group: '第 20 部：C++20~26 語言與工具庫新特性',
  description:
    'C++20 的 Designated Initializers，從根本解決傳統聚合初始化中參數順序錯置的臭蟲，讓設定檔與結構體的初始化更清晰。',
  concept: {
    standard: 'C++20',
    body: '在 C++20 之前，初始化一個具有多個成員的結構體（struct）通常仰賴聚合初始化（aggregate initialization），如 `Point p {1, 2}`。這種方式的問題在於，若成員型別相同，開發者很容易不小心對調傳入的順序（例如原本是 x, y，卻傳入 y, x），編譯器不會有任何警告。C++20 從 C99 借鏡並適應了「指定初始化（Designated Initializers）」，允許我們以 `.member_name = value` 的語法來明確指定要初始化的欄位。這不僅大幅提升了程式碼的可讀性，也消除了位置依賴所帶來的潛在臭蟲。',
  },
  deepDive: [
    {
      heading: '語法與 C 語言的差異',
      body: 'C++20 的指定初始化語法看似與 C99 相同（例如 `.x = 1, .y = 2`），但有一些重要限制。首先，初始化的順序必須與結構體中成員宣告的順序完全一致；如果宣告順序是 `x` 然後 `y`，你不能寫 `.y = 2, .x = 1`。這是因為 C++ 保證物件初始化的順序與記憶體佈局順序一致，以確保解構時的順序正確。\n\n其次，C++ 不允許陣列的指定初始化（如 `[0] = 5`），也不允許嵌套指定初始化。',
    },
    {
      heading: '配合預設成員初始化的威力',
      body: '指定初始化的一大亮點是可以跳過某些欄位，讓它們退回到宣告時提供的預設成員初始化值。這非常適合用來實作「設定物件（Configuration Object）」模式。在沒有具名參數的 C++ 中，當一個函式需要接受十幾個選選參數時，可以改為傳遞一個 `Config` 結構體。呼叫端只需指定非預設的欄位，其餘自動填入預設值，程式碼自解釋性極高。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <iostream>
#include <string>

struct WindowConfig {
    int width = 800;          // [1]
    int height = 600;
    bool fullscreen = false;
    std::string title = "App";
};

void init_window(const WindowConfig& config) {
    std::cout << "Creating: " << config.title 
              << " (" << config.width << "x" << config.height << ")\\n";
}

int main() {
    // Traditional aggregate initialization: order can't be shuffled, and it's easy to forget which is width and which is height
    // WindowConfig config1 {1024, 768, true, "My Game"};

    // C++20 designated initializers: explicit, safe, and can skip fields that should keep their default value
    WindowConfig config2 {
        .width = 1024,
        .height = 768,
        // fullscreen keeps its default of false
        .title = "Designated Game"  // [2]
    };

    init_window(config2);           // [3]
    return 0;
}`,
    callouts: [
      {
        n: 1,
        text: '結構體定義了各欄位的預設初始值。',
      },
      {
        n: 2,
        text: '初始化時指定 `.width`, `.height`, `.title`，未指定的 `.fullscreen` 自動使用預設的 false。順序必須與結構宣告相同。',
      },
      {
        n: 3,
        text: '消除了具名參數的需求，傳遞設定物件時語意清晰。',
      },
    ],
  },
  pitfalls: [
    '順序錯置：指定的欄位順序若不符合結構體內的宣告順序，編譯器會報錯。',
    '無法與部分建構子共存：只能用於聚合體（aggregates）。一旦你寫了自訂的建構子，就無法再使用指定初始化。',
    '無法在同一初始化清單中混合使用「指定」與「未指定（傳統聚合）」的語法。',
  ],
  bestPractices: [
    '對於「選項、參數、組態」等具有許多資料成員的單純結構體，優先使用指定初始化。',
    '結合結構體內的預設成員初始化（default member initializers），讓設定物件更加簡潔。',
    '別為了使用指定初始化而把本應封裝的類別退化成公開的結構體，它適用於純資料聚合。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '關於 C++20 指定初始化，以下哪項敘述是正確的？',
      options: [
        { id: 'a', text: '欄位初始化的順序必須與結構體宣告的順序相同' },
        { id: 'b', text: '可以任意打亂欄位的順序，與 C99 相同' },
        { id: 'c', text: '可以混合使用指定與未指定初始化的語法' },
        { id: 'd', text: '即使結構體有自訂的建構子，依然可以強制使用' },
      ],
      correctOptionId: 'a',
      explanation:
        'C++ 嚴格要求初始化順序必須與宣告順序一致，以保證建構與解構的順序性。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['設定參數', 'Designated Initializers', '可跳過預設欄位', '提高可讀性'],
    caption: 'C++20 的指定初始化是消滅參數順序錯置與實現具名參數風格的重要工具。',
  },
  tryIt: {
    code: `#include <iostream>
#include <string>

struct Employee {
    int id;
    std::string name;
    std::string department = "Engineering";
};

int main() {
    Employee emp {
        .id = 42,
        .name = "Alice"
        // department keeps its default of Engineering
    };
    std::cout << emp.name << " works in " << emp.department << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Aggregate initialization - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/aggregate_initialization',
      description: 'C++ 聚合初始化與 Designated Initializers 的規則。',
    },
  ],
};

export default ind36DesignatedInitializers;
