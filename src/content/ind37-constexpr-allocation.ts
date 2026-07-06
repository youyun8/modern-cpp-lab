import type { ChapterContent } from '@/types/ChapterContent';

const ind37ConstexprAllocation: ChapterContent = {
  slug: 'ind37-constexpr-allocation',
  chapterLabel: '第 66 章',
  title: 'constexpr 動態記憶體與容器（C++20）',
  group: '第 20 部：C++20~26 語言與工具庫新特性',
  description:
    'C++20 允許在編譯期進行動態記憶體配置，這讓 std::vector 與 std::string 成為編譯期強大的常數運算式計算工具。',
  concept: {
    standard: 'C++20',
    body: '一直以來，C++ 的 `constexpr` 編譯期求值能力受到一項巨大的限制：不能使用動態記憶體。這意味著如果要在編譯期計算字串或陣列，你必須使用 `std::array` 或固定長度的 `char` 陣列，寫起程式來充滿了大小計算與遞迴的痛苦。\n\nC++20 打破了這個限制。它允許在 `constexpr` 函式中呼叫 `new` 與 `delete`，這代表著 `std::vector` 與 `std::string` 終於能在常數運算式中使用了。你可以像寫一般程式一樣，在編譯期使用 `.push_back()` 或字串串接。唯一也是最嚴格的規則是：**「編譯期配置的記憶體，必須在編譯期釋放」**。',
  },
  deepDive: [
    {
      heading: '暫態配置（Transient Allocation）',
      body: 'C++20 的編譯期動態配置被稱為 Transient Allocation（暫態配置）。這表示你在編譯期 new 出來的記憶體，不能「活著」逃到執行期。如果你試圖把一個編譯期產生的 `std::vector` 變成全域的 `constexpr` 變數，編譯器會報錯，因為編譯器不知道如何把這些動態堆積記憶體序列化成執行期二進位檔的唯讀資料區段。\n\n正確的作法是：在 `constexpr` 函式內部使用 `vector` 與 `string` 進行複雜的計算（如字串分割、過濾、排序），最後把結果轉換回 `std::array` 或 `std::string_view`，然後再回傳並指派給 `constexpr` 變數。',
    },
    {
      heading: '標準容器的 constexpr 支援',
      body: '隨著這項解禁，C++20 標記了 `std::vector` 與 `std::string` 的大部分方法為 `constexpr`。你可以使用標準演算法對它們進行排序（`std::sort` 也在 C++20 變成 `constexpr`），甚至可以使用 `std::unique_ptr` 等依賴動態配置的工具。\n但請注意，其他節點型容器如 `std::map` 或 `std::list` 在 C++20 尚未完全 constexpr 化（部分在 C++23 中逐步支援）。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <vector>
#include <array>
#include <string>
#include <algorithm>
#include <iostream>

// 一個使用 std::vector 在編譯期進行過濾與計算的函式
consteval auto filter_even_numbers(const int* input, std::size_t size) {
    std::vector<int> temp; // [1]
    
    for (std::size_t i = 0; i < size; ++i) {
        if (input[i] % 2 == 0) {
            temp.push_back(input[i]);
        }
    }
    
    std::sort(temp.begin(), temp.end());
    
    // 把結果轉回固定長度的 std::array 才能回傳為 constexpr 常數 [2]
    std::array<int, 3> result{}; 
    std::copy(temp.begin(), temp.end(), result.begin());
    
    return result; 
    // temp 離開作用域，動態記憶體被釋放，符合 Transient Allocation 規則 [3]
}

int main() {
    constexpr int raw_data[] = { 7, 2, 9, 4, 8, 1, 6 };
    
    // 計算過程發生在編譯期
    constexpr auto evens = filter_even_numbers(raw_data, 7);
    
    for (int n : evens) {
        std::cout << n << " "; // 輸出: 2 4 6 
    }
    return 0;
}`,
    callouts: [
      {
        n: 1,
        text: '在 consteval/constexpr 函式內部使用 std::vector 進行彈性配置。',
      },
      {
        n: 2,
        text: '為了傳出結果並存成 constexpr 變數，必須轉換為不帶指標與動態記憶體的 std::array。',
      },
      {
        n: 3,
        text: '編譯器會驗證 vector 配置的記憶體在求值結束前已被正確解構釋放。',
      },
    ],
  },
  pitfalls: [
    '記憶體洩漏到執行期：試圖把包含動態配置記憶體的物件（如 `std::vector` 本身）宣告為全域 `constexpr` 變數會導致編譯失敗。',
    '未釋放記憶體：如果你的 constexpr 程式碼有 memory leak，編譯器會抓到並視為編譯錯誤。',
    '編譯期效能：編譯期配置記憶體與執行複雜邏輯會拖慢編譯速度，請謹慎使用於巨大的資料集。',
  ],
  bestPractices: [
    '把 `std::vector` 與 `std::string` 當作編譯期計算過程中的「暫存工作區」，將複雜邏輯寫得像執行期一樣簡單。',
    '編譯期計算完畢後，把成果萃取並複製進 `std::array` 或字串字面量中，以匯出至編譯期的常數空間。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '在 C++20 中，為什麼我們不能寫 `constexpr std::vector<int> v = {1, 2, 3};` 於全域作用域？',
      options: [
        { id: 'a', text: '因為 std::vector 的建構子尚未標記為 constexpr' },
        { id: 'b', text: '因為編譯期配置的記憶體必須在求值結束前釋放，不能洩漏到執行期的二進位資料中' },
        { id: 'c', text: '因為全域變數不允許使用 constexpr' },
        { id: 'd', text: '因為 std::vector 不支援 initializer_list' },
      ],
      correctOptionId: 'b',
      explanation:
        'C++20 的編譯期動態配置是暫態的（Transient）。記憶體必須在常數求值結束前被釋放，不能轉換為唯讀記憶體區段寫入執行檔。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['constexpr 進入點', 'std::vector/string 配置', '複雜邏輯與排序', '轉存 std::array 並釋放'],
    caption: 'C++20 constexpr 容器的典型工作流程：動態配置僅存在於計算期間。',
  },
  tryIt: {
    code: `#include <string>
#include <array>
#include <iostream>

consteval auto make_hello() {
    std::string s = "Hello";
    s += ", World!";
    
    std::array<char, 14> arr{};
    for (std::size_t i = 0; i < s.size(); ++i) {
        arr[i] = s[i];
    }
    arr[13] = '\\0';
    return arr;
}

int main() {
    constexpr auto msg = make_hello();
    std::cout << msg.data() << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'constexpr dynamic memory allocation - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/constexpr',
      description: '常數運算式中支援 new/delete 與容器的規則。',
    },
  ],
};

export default ind37ConstexprAllocation;
