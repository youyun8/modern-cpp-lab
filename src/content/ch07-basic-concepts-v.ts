import type { ChapterContent } from '@/types/ChapterContent';

const ch07BasicConceptsV: ChapterContent = {
  slug: 'ch07-basic-concepts-v',
  chapterLabel: 'Ch.07',
  title: '基本概念 V：記憶體模型',
  group: 'A · 基礎概念',
  description:
    'heap 與 stack、const/constexpr 以及各種型別轉換：物件的儲存期、常數正確性與四種具名轉換的取捨。',
  concept: {
    standard: 'C++23',
    body: '物件依儲存期分類：自動儲存期（stack 上的區域變數，離開作用域即銷毀）、動態儲存期（heap 上以 new／智慧指標配置）、靜態與執行緒儲存期。stack 快速但容量有限，heap 彈性但需管理與付出配置成本，實務上以 std::vector 與智慧指標包裝 heap 記憶體。const 表示不可修改（常數正確性），constexpr 更進一步要求可在編譯期求值，consteval 則強制編譯期。型別轉換應優先使用四種具名轉換：static_cast（一般安全轉換）、const_cast（增刪 const，罕用）、reinterpret_cast（位元重解讀，危險）、dynamic_cast（多型向下轉型並檢查）；避免 C 風格轉換以保留意圖與安全。',
  },
  code: {
    lang: 'cpp',
    code: `#include <memory>
#include <print>

struct Widget {
  int id;
};

constexpr int square(int x) { return x * x; }  // [1] 可於編譯期求值

int main() {
  int on_stack = 42;  // [2] 自動儲存期，離開即銷毀
  auto on_heap = std::make_unique<Widget>(Widget{7});  // [3] 動態儲存期

  const int limit = 100;           // [4] 常數正確性：不可再修改
  constexpr int nine = square(3);  // [5] 編譯期常數
  static_assert(nine == 9);

  double d = 3.9;
  int truncated = static_cast<int>(d);  // [6] 明確的具名轉換

  std::println("stack={}, heap id={}, limit={}, nine={}, trunc={}", on_stack,
               on_heap->id, limit, nine, truncated);
  return 0;  // on_heap 於此自動釋放
}`,
    callouts: [
      {
        n: 1,
        text: 'constexpr 函式在引數為常數運算式時於編譯期求值，可用於陣列大小或 static_assert。',
      },
      { n: 2, text: '區域變數位於 stack，配置與釋放幾乎零成本，但生命週期綁定作用域。' },
      {
        n: 3,
        text: 'std::make_unique 於 heap 配置並以 unique_ptr 擁有，離開作用域自動 delete，避免洩漏。',
      },
      {
        n: 4,
        text: 'const 宣告不可變狀態，是常數正確性的基礎，也讓編譯器與讀者都能信任該值不變。',
      },
      { n: 5, text: 'constexpr 變數要求初始值為常數運算式；square(3) 於編譯期算出 9。' },
      { n: 6, text: 'static_cast 明確表達轉換意圖，比 C 風格 (int)d 更安全、更易搜尋。' },
    ],
  },
  deepDive: [
    {
      heading: '儲存期、生命週期與初始化順序',
      body: '自動、動態、靜態與執行緒儲存期各有生命週期規則。跨轉譯單元的非區域靜態物件初始化順序未定義，即著名的 static initialization order fiasco；以「函式內 static 區域變數」（Meyers singleton）或 `constinit` 可規避。\n\n回傳指向區域變數的參考／指標會產生懸置；被移動後的物件處於有效但未指定狀態。清楚掌握誰擁有、誰只是借用，是避免記憶體錯誤的核心。',
    },
    {
      heading: 'const 家族：const／constexpr／consteval／constinit',
      body: '`const` 表達不可修改的常數正確性；`constexpr` 要求可在編譯期求值（但也可在執行期）；`consteval`（C++20）強制立即函式必於編譯期求值；`constinit` 保證靜態儲存期物件於編譯期完成初始化，避免 SIOF 又不強制 const。\n\n善用它們能把更多錯誤移到編譯期，並讓常數進入樣板參數、陣列大小等常數運算式脈絡。',
    },
    {
      heading: '轉換家族與 RTTI 成本',
      body: '`static_cast` 做編譯期已知的安全轉換；`dynamic_cast` 在多型階層做執行期檢查，依賴 RTTI 且有成本；`const_cast` 僅增刪 cv 限定，用它去修改本質為 const 的物件是 UB；`reinterpret_cast` 位元重解讀，違反嚴格別名時是 UB。\n\n型別雙關應改用 `std::bit_cast`（C++20）。避免 C 風格轉換，因為它會在上述語意間靜默切換，難以審查。',
    },
  ],
  pitfalls: [
    '跨轉譯單元的靜態物件初始化順序未定義（SIOF），造成啟動期崩潰。',
    '回傳指向區域變數的參考或指標，產生懸置存取。',
    '以 `const_cast` 修改本質為 const 的物件——屬未定義行為。',
    '以 `reinterpret_cast` 做型別雙關，違反嚴格別名規則。',
  ],
  bestPractices: [
    '偏好堆疊配置與 RAII 容器／智慧指標，避免裸 `new`／`delete`。',
    '以 Meyers singleton 或 `constinit` 規避靜態初始化順序問題。',
    '盡量以 `constexpr`／`consteval` 把運算與檢查移到編譯期。',
    '一律使用具名轉換；型別雙關改用 `std::bit_cast`。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '關於 stack 與 heap 記憶體，下列敘述何者正確？',
      options: [
        { id: 'a', text: 'heap 配置一定比 stack 快' },
        { id: 'b', text: 'stack 配置快但容量有限且生命週期綁定作用域；heap 彈性但需管理' },
        { id: 'c', text: 'stack 上的物件永遠不會被銷毀' },
        { id: 'd', text: 'heap 記憶體會在離開作用域時自動釋放' },
      ],
      correctOptionId: 'b',
      explanation:
        'stack 配置僅移動堆疊指標，極快但容量有限；heap 較彈性但需以智慧指標或容器管理生命週期。參見 Ch.07 PDF 第 14 頁。',
    },
    {
      id: 'q2',
      stem: 'const 與 constexpr 的關鍵差異為何？',
      options: [
        { id: 'a', text: '兩者完全相同' },
        { id: 'b', text: 'const 表示不可修改；constexpr 進一步要求該值可在編譯期求值' },
        { id: 'c', text: 'constexpr 只能用於函式，不能用於變數' },
        { id: 'd', text: 'const 會讓程式變慢' },
      ],
      correctOptionId: 'b',
      explanation:
        'const 只保證執行期不可修改；constexpr 額外要求編譯期即可求值，能用於常數運算式脈絡。參見 Ch.07 PDF 第 33 頁。',
    },
    {
      id: 'q3',
      stem: '要在多型繼承階層中安全地向下轉型並在失敗時得到通知，應使用哪種轉換？',
      options: [
        { id: 'a', text: 'reinterpret_cast' },
        { id: 'b', text: 'const_cast' },
        { id: 'c', text: 'dynamic_cast' },
        { id: 'd', text: 'C 風格轉換 (Derived*)' },
      ],
      correctOptionId: 'c',
      explanation:
        'dynamic_cast 於執行期檢查型別；指標失敗時回傳 nullptr，參考失敗則丟出 std::bad_cast。參見 Ch.07 PDF 第 48 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['stack', 'heap', 'const', 'cast'],
    caption:
      '記憶體與型別的核心工具：stack／heap 決定物件的儲存期，const 保障不可變性，具名轉換明確表達型別意圖。',
  },
  tryIt: {
    code: `#include <iostream>
#include <memory>

struct Widget {
  int id;
};
constexpr int square(int x) { return x * x; }

int main() {
  auto w = std::make_unique<Widget>(Widget{7});
  constexpr int nine = square(3);
  double d = 3.9;
  std::cout << "heap id = " << w->id << '\\n';
  std::cout << "nine = " << nine << '\\n';
  std::cout << "static_cast<int>(3.9) = " << static_cast<int>(d) << '\\n';
  return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Storage duration - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/storage_duration',
      description: '自動、動態、靜態與執行緒儲存期的定義。',
    },
    {
      title: 'constexpr - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/constexpr',
      description: 'constexpr／consteval 的規則與編譯期求值。',
    },
    {
      title: 'Modern C++ Programming — Basic Concepts V (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/07.Basic_concepts_V.html',
      description: 'Busato 課程第 7 章 HTML 投影片，涵蓋記憶體模型原文。',
    },
  ],
};

export default ch07BasicConceptsV;
