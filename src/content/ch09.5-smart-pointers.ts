import type { ChapterContent } from '@/types/ChapterContent';

const ch09SmartPointers: ChapterContent = {
  slug: 'ch09.5-smart-pointers',
  chapterLabel: '第 9.5 章',
  title: '智慧指標：unique_ptr、shared_ptr 與 weak_ptr',
  group: '第 2 部：物件導向與泛型程式設計',
  description:
    'RAII 自動記憶體管理的核心工具：std::unique_ptr 獨佔所有權、std::shared_ptr 參考計數共享所有權、std::weak_ptr 破除循環參考，以及 make_unique 與 make_shared 的工廠慣用法。',
  concept: {
    standard: 'C++20',
    body: '裸指標無法自動管理生命週期，是記憶體洩漏與重複釋放的主要來源。智慧指標把「擁有權」語意綁定在型別層級：std::unique_ptr 表示獨佔所有權，解構時自動 delete；std::shared_ptr 用參考計數追蹤共享所有權，最後一個持有者離開時自動釋放；std::weak_ptr 觀察 shared_ptr 管理的物件但不增加計數，透過 lock() 安全升級，是破除循環參考的標準方法。new/delete 幾乎不該出現在現代 C++ 業務程式碼中，工廠函式 make_unique 與 make_shared 以單一表達式完成配置與管理，是更安全、更高效且異常安全的建構方式。',
  },
  code: {
    lang: 'cpp',
    code: `#include <iostream>
#include <memory>
#include <string>
#include <vector>

struct Node {
    int value = 0;
    std::string name;
    std::unique_ptr<Node> next;          // [1] unique_ptr means "this Node owns the next one"
    std::shared_ptr<Node> shared_child;  // [2] Multiple parent nodes can share the same child
    std::weak_ptr<Node> weak_backref;    // [3] Weak reference, avoids a parent-child cycle

    explicit Node(std::string n, int v = 0) : value(v), name(std::move(n)) {
        std::cout << "Node(" << name << ") constructed\\n";
    }
    ~Node() { std::cout << "Node(" << name << ") destroyed\\n"; }
};

// Factory function: make_unique is safer and exception-safe compared to new-then-wrap. [4]
std::unique_ptr<Node> make_node(std::string name, int value) {
    return std::make_unique<Node>(std::move(name), value);
}

// When unique_ptr is a parameter, passing by value clearly signals "ownership transfer". [5]
void take_ownership(std::unique_ptr<Node> node) {
    std::cout << "take_ownership received: " << node->name << "\\n";
    // node is automatically destroyed when leaving scope
}

// When shared_ptr is a parameter, pass by const reference to avoid unnecessary refcount churn. [6]
void inspect(const std::shared_ptr<Node>& node) {
    if (node) {
        std::cout << "inspect: " << node->name << "\\n";
    }
}

int main() {
    auto a = make_node("alpha", 1);
    auto b = make_node("beta", 2);

    a->next = std::move(b);  // [7] Ownership moves from b to a->next; b is now empty
    // take_ownership(b);     // Compile error: b has already lost ownership

    auto shared_c = std::make_shared<Node>("shared_c", 3);  // [8]
    {
        auto copy = shared_c;  // [9] Reference count +1
        inspect(shared_c);     //   Passed by const&, count unchanged
        std::cout << "count = " << shared_c.use_count() << "\\n";  // [10]
    }  // copy destroyed, count -1
    std::cout << "count = " << shared_c.use_count() << "\\n";

    // weak_ptr observes without increasing the count. [11]
    std::weak_ptr<Node> weak = shared_c;
    std::cout << "weak ref count = " << shared_c.use_count() << "\\n";  // still 1

    if (auto locked = weak.lock()) {  // [12] Upgrade to shared_ptr
        std::cout << "lock succeeded: " << locked->name << "\\n";
    }

    shared_c.reset();  // [13] Release, reference count reaches zero
    if (auto locked = weak.lock()) {  // [14]
        std::cout << "still alive\\n";
    } else {
        std::cout << "object already released\\n";
    }

    // a and its linked Node chain are destroyed in cascade automatically at the end of main.
    return 0;
}`,
    callouts: [
      {
        n: 1,
        text: 'unique_ptr 是獨佔所有權：不可複製，只能移動（std::move），解構時自動 delete。',
      },
      {
        n: 2,
        text: 'shared_ptr 使用參考計數（通常一個 control block），多個 shared_ptr 可共同持有同一物件。',
      },
      {
        n: 3,
        text: 'weak_ptr 本身不影響計數，用於需要反向參考又不願形成循環的場景（如 observer/callback cache）。',
      },
      {
        n: 4,
        text: 'make_unique 把「new」藏在工廠內，即使建構子拋出例外也不會 memory leak。',
      },
      {
        n: 5,
        text: '以值傳遞 unique_ptr 表示「我會接管這份所有權」；呼叫端交出時需用 std::move。',
      },
      {
        n: 6,
        text: 'shared_ptr 傳入時用 const& 可避免不必要的原子計數增減；只在需要延長生命週期時才複製。',
      },
      {
        n: 7,
        text: 'std::move 把 unique_ptr 的所有權轉移走，來源物件變為 nullptr，不可再解引用。',
      },
      {
        n: 8,
        text: 'make_shared 比「先 new 再建構 shared_ptr」更省記憶體，因為它把物件與 control block 配置在一起。',
      },
      {
        n: 9,
        text: '複製 shared_ptr 讓參考計數原子遞增；解構時原子遞減，到 0 時釋放物件與控制區塊。',
      },
      {
        n: 10,
        text: 'use_count() 回傳當下持有者的數量，主要用於除錯，不要用它做程式邏輯判斷。',
      },
      {
        n: 11,
        text: 'weak_ptr 建立時不增加計數，因此不會阻止 shared_ptr 管理的物件被釋放。',
      },
      {
        n: 12,
        text: 'lock() 嘗試把 weak_ptr 升級為 shared_ptr；若物件已釋放，回傳空的 shared_ptr。',
      },
      {
        n: 13,
        text: 'reset() 明確釋放持有的物件，對 unique_ptr 與 shared_ptr 都適用。',
      },
      {
        n: 14,
        text: '物件已被釋放後 weak_ptr::lock() 回傳 nullptr，呼叫端可安全判斷、不會存取已釋放記憶體。',
      },
    ],
  },
  deepDive: [
    {
      heading: 'make_unique 與 make_shared 的異常安全性與效能優勢',
      body: '先 new 再包智慧指標有兩個風險：（1）若 new 成功但智慧指標建構途中拋出例外，原物件無法被自動釋放，造成 memory leak；（2）兩次獨立配置（物件記憶體 + control block）增加記憶體碎片與 cache miss。make_shared 把物件與 control block 配置在同一塊記憶體中，減少一次配置開銷與一個 cache line；但也有一個陷阱：如果把結果存進 weak_ptr，即使所有 shared_ptr 都釋放，物件記憶體仍會被 control block 佔住，直到最後一個 weak_ptr 也消失——這可能延遲大物件的實際歸還。對有這類記憶體壓力的場景，可用 std::allocate_shared 搭配自定義 deleter，或接受分離配置。',
    },
    {
      heading: '循環參考與 weak_ptr 的必要性',
      body: '兩個 shared_ptr 互相指向時，參考計數永遠不會降到零，造成 memory leak。經典場景是「父節點持有子節點、子節點持有回父節點的回呼」。解法是把其中一方的 shared_ptr 改為 weak_ptr：子節點用 weak_ptr 觀察父節點，需要存取時 lock() 升級；父節點仍用 shared_ptr 擁有子節點。升級失敗（回傳 nullptr）表示父節點已不存在，子節點可以安全地放棄回呼。這個 pattern 也適用於 cache、回呼註冊表等「需要指向但不想延長生命週期」的場景。',
    },
    {
      heading: '自訂刪除器：陣列、非 heap 配置與資源池',
      body: 'unique_ptr 的第二個樣板參數可指定刪除器型別，例如 unique_ptr<FILE, decltype(&fclose)> 可把 FILE* 包進 RAII而不需手寫 wrapper class。shared_ptr 的建構子接受刪除器函式物件，可管理非 new 來源的資源（fopen、socket、互斥斥鎖）。陣列專用型別 unique_ptr<T[]> 使用 delete[]，也可搭配自訂 deleter。make_unique_for_overwrite（C++20）則適合需要先取得未初始化空間、再在其中建構的場景（例如序列化反解）。',
    },
    {
      heading: 'shared_ptr 的控制區塊與原子計數成本',
      body: 'shared_ptr 的參考計數是原子的，每次複製與解構都有一次 atomic increment/decrement，在極度高頻的場景（如每次迭代都複製指標）可能成為隱性瓶頸。此外，control block 包含兩個計數器：強參考計數（shared_ptr）與弱參考計數（weak_ptr + shared_ptr 自己），以及一個 deleter 與一個 allocator。Pimpl 慣用法若用 shared_ptr 傳遞，control block 額外增加了間接層，對於確知只有單一擁有者的場景應改用 unique_ptr。',
    },
  ],
  pitfalls: [
    '從同一裸指標建構多個 shared_ptr，產生多個獨立 control block，造成雙重 delete。',
    '把 this 傳給接受 shared_ptr 的函式，卻未繼承 std::enable_shared_from_this，導致從 this 再建一個獨立 control block。',
    '在 unique_ptr 還活著時呼叫 .release() 卻未接手管理，造成資源洩漏。',
    '對 widget array 使用 unique_ptr<Widget> 而非 unique_ptr<Widget[]>，導致只 delete 第一個元素。',
    '在熱路徑頻繁複製 shared_ptr，忽視 atomic reference count 的同步成本。',
    '用 use_count() == 1 做邏輯判斷，陷入 race condition（另一執行緒可能在檢查與行動之間複製）。',
  ],
  bestPractices: [
    '業務程式碼幾乎不該出現 new/delete；工廠 make_unique/make_shared 是預設選擇。',
    '表達單一所有權用 unique_ptr，需要共享時再升級到 shared_ptr。',
    '可能形成循環參考的場景（tree parent-child、observer pattern）用 weak_ptr 打斷環。',
    'unique_ptr 以值傳遞表示所有權轉移；shared_ptr 以 const& 傳遞观察，以值傳遞延長生命週期。',
    '需要從成員函式取得 shared_ptr 時，讓類別繼承 std::enable_shared_from_this<T> 並呼叫 shared_from_this()。',
    '對非 heap 資源（如 FILE*、socket）使用 unique_ptr/shared_ptr 配合自訂 deleter，達成 RAII。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: 'std::make_shared 相較於「new 物件再傳給 std::shared_ptr 建構子」，主要優勢是什麼？',
      options: [
        { id: 'a', text: 'make_shared 會自動啟用多執行緒保護' },
        {
          id: 'b',
          text: '把物件與控制區塊配置在一起，減少一次配置與記憶體碎片，且更安全',
        },
        { id: 'c', text: 'make_shared 讓參考計數不需要 atomic 操作' },
        { id: 'd', text: 'make_shared 只能用在 C 風格陣列' },
      ],
      correctOptionId: 'b',
      explanation:
        'make_shared 把 T 與 control block 合併為單一配置區塊，不只少一次配置，也讓物件與計數更易 cache-local；同時避免「new 成功但 shared_ptr 建構失敗」的 memory leak 風險。',
    },
    {
      id: 'q2',
      stem: '兩個 shared_ptr 互相指向，即使程式不再使用這兩個物件，為什麼仍會 memory leak？',
      options: [
        { id: 'a', text: '因為 shared_ptr 不支援多執行緒' },
        { id: 'b', text: '因為參考計數永遠不會降到零，形成循環參考' },
        { id: 'c', text: '因為 control block 佔用了太多記憶體' },
        { id: 'd', text: '因為編譯器無法看到這兩個指標' },
      ],
      correctOptionId: 'b',
      explanation:
        '循環參考讓 A 持有 B、B 持有 A，兩者的強參考計數始終 >= 1，無論外部是否還有指標，物件都不會被釋放；應用 weak_ptr 打斷其中一方的所有權。',
    },
    {
      id: 'q3',
      stem: 'unique_ptr 傳入函式時，如何用參數型別表達「此函式會接管所有權」？',
      options: [
        { id: 'a', text: 'void foo(const std::unique_ptr<Node>& p);' },
        { id: 'b', text: 'void foo(std::unique_ptr<Node> p);' },
        { id: 'c', text: 'void foo(std::unique_ptr<Node>* p);' },
        { id: 'd', text: 'void foo(Node* p);' },
      ],
      correctOptionId: 'b',
      explanation:
        '以值傳遞 unique_ptr 表示函式會接管擁有權（移動語意），呼叫端必須用 std::move 傳入；其它選項無法表達所有權轉移。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['make_unique', 'unique_ptr', 'std::move', 'shared_ptr', 'weak_ptr'],
    caption:
      '智慧指標的所有權傳遞：make_unique 產生獨佔所有權，std::move 可轉移；需要共享時升級為 make_shared，循環參考則用 weak_ptr 打斷。',
  },
  tryIt: {
    code: `#include <iostream>
#include <memory>
#include <string>

struct Widget {
    std::string name;
    explicit Widget(std::string n) : name(std::move(n)) {
        std::cout << "Widget(" << name << ") constructed\\n";
    }
    ~Widget() { std::cout << "Widget(" << name << ") destroyed\\n"; }
};

int main() {
    auto p1 = std::make_unique<Widget>("alpha");
    // std::unique_ptr<Widget> p2 = p1;  // Error: cannot copy
    auto p2 = std::move(p1);             // Transfer ownership

    auto s1 = std::make_shared<Widget>("beta");
    {
        auto s2 = s1;  // Share ownership
        std::cout << "use_count = " << s1.use_count() << "\\n";
    }
    std::cout << "use_count = " << s1.use_count() << "\\n";

    std::weak_ptr<Widget> w = s1;
    if (auto locked = w.lock()) {
        std::cout << "locked: " << locked->name << "\\n";
    }
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::unique_ptr - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/memory/unique_ptr',
      description: '獨佔所有權智慧指標的完整介面、自訂刪除器與陣列專用型別。',
    },
    {
      title: 'std::shared_ptr - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/memory/shared_ptr',
      description: '參考計數共享所有權、control block 與 make_shared 說明。',
    },
    {
      title: 'std::weak_ptr - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/memory/weak_ptr',
      description: '弱參考機制、lock() 升級與觀察者模式應用。',
    },
    {
      title: 'C++ Core Guidelines — R.20: Prefer make_unique',
      href: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rr-make_unique',
      description: 'ISO C++ 核心準則中關於智慧指標工廠函式的建議。',
    },
  ],
};

export default ch09SmartPointers;
