import type { ChapterContent } from '@/types/ChapterContent';

const ch20ContainersAlgorithms: ChapterContent = {
  slug: 'ch20-containers-algorithms',
  chapterLabel: 'Ch.20',
  title: '容器與演算法',
  group: 'D · STL 與工具庫',
  description:
    '序列與關聯容器、迭代器、ranges 以及標準演算法：如何依存取模式選擇容器，並以演算法取代手寫迴圈。',
  concept: {
    standard: 'C++20',
    body:
      'STL 由容器、迭代器與演算法三者組成。序列容器（vector、deque、list、array）依插入與存取模式取捨：vector 連續記憶體、隨機存取快、尾端插入攤銷 O(1)，是預設首選；list 支援 O(1) 任意位置插入但快取不友善。關聯容器分為紅黑樹版（map／set，有序、O(log n)）與雜湊版（unordered_map／set，平均 O(1)）。迭代器把容器與演算法解耦；演算法（sort、find、accumulate、count_if、transform 等）以迭代器區間運作，取代易錯的手寫迴圈。C++20 ranges 提供 std::ranges::sort(v) 這類直接吃容器的版本，並支援可組合的惰性視圖。選對容器與善用演算法，是寫出清楚且高效程式的關鍵。',
  },
  code: {
    lang: 'cpp',
    code: `#include <algorithm>
#include <print>
#include <ranges>
#include <unordered_map>
#include <vector>

int main() {
    std::vector<int> v{5, 3, 8, 1, 9, 2, 7};

    std::ranges::sort(v);                      // [1] ranges 版直接吃容器
    auto it = std::ranges::lower_bound(v, 7);  // [2] 有序區間二分搜尋
    std::println("first >= 7 at index {}", it - v.begin());

    int big = std::ranges::count_if(v,  // [3] 宣告式計數
                                    [](int x) { return x > 4; });
    std::println("count > 4 = {}", big);

    std::unordered_map<std::string, int> freq;                  // [4] 平均 O(1) 查找
    for (std::string w : {"a", "b", "a", "c", "a"}) ++freq[w];  // [5] operator[] 自動插入
    std::println("freq[a] = {}", freq["a"]);
    return 0;
}`,
    callouts: [
      { n: 1, text: 'std::ranges::sort 直接接受容器，免去 begin()／end() 的樣板寫法。' },
      { n: 2, text: 'lower_bound 在已排序區間以二分搜尋找第一個不小於目標的元素，複雜度 O(log n)。' },
      { n: 3, text: 'count_if 以述詞計數，取代手寫迴圈與計數器，意圖更清楚。' },
      { n: 4, text: 'unordered_map 以雜湊表實作，平均查找／插入為 O(1)，不保證順序。' },
      { n: 5, text: 'operator[] 若鍵不存在會以值初始化插入，因此 ++freq[w] 可直接累計次數。' },
    ],
  },
  deepDive: [
    {
      heading: '容器選擇、複雜度與記憶體佈局',
      body:
        '`std::vector` 是預設；已知大小時 `reserve` 可避免多次重新配置與元素移動。節點型容器（`list`、`map`）雖有 O(1)／O(log n) 的插入保證，但每元素獨立配置、快取不友善，實測常慢於 `vector`。\n\nC++23 的 `std::flat_map`／`flat_set` 以排序 `vector` 實作，查找為 O(log n) 但快取友善、迭代快，適合讀多寫少的場景。選容器要同時看漸進複雜度與實際記憶體行為。',
    },
    {
      heading: '迭代器失效與 ranges 投影',
      body:
        '各容器有明確的迭代器／參考失效規則：`vector` 的 `push_back` 觸發重新配置會使所有迭代器失效；`unordered_map` 的元素參考在 rehash 後仍穩定（但迭代器失效），而 `vector` 的參考不穩定。誤解這些規則是常見的懸置來源。\n\nranges 演算法接受投影（projection），如 `std::ranges::sort(v, {}, &Item::key)` 直接依成員排序，並可用 `|` 組合視圖，寫出宣告式且不易錯的資料處理。',
    },
    {
      heading: '演算法與慣用法',
      body:
        '`std::sort` 為 introsort（quicksort + heapsort 保底 O(n log n)），需穩定性時用 `stable_sort`。插入建構物件用 `emplace_back` 就地建構，避免多餘的暫時物件與移動。\n\n移除元素用 erase-remove 慣用法，或 C++20 更直觀的 `std::erase`／`std::erase_if`。理解這些慣用法能寫出正確且高效的容器操作。',
    },
  ],
  pitfalls: [
    '在對 `vector` 迭代時 `push_back`／`insert`，重新配置使迭代器失效。',
    '因漸進複雜度誤選 `list`，實際因快取不友善而更慢。',
    '迴圈中反覆 `push_back` 卻未先 `reserve`，觸發多次重新配置。',
    '誤解 `vector` 與 `unordered_map` 的參考／迭代器穩定性差異。',
  ],
  bestPractices: [
    '預設用 `vector` 並在已知大小時 `reserve`；讀多寫少考慮 `flat_map`。',
    '移除元素用 `std::erase`／`std::erase_if` 或 erase-remove 慣用法。',
    '善用 ranges 演算法與投影，寫出宣告式且安全的操作。',
    '依「存取模式 + 複雜度 + 快取行為」三者共同選擇容器。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '在大多數情況下，序列容器的合理預設選擇是什麼？',
      options: [
        { id: 'a', text: 'std::list，因為插入最快' },
        { id: 'b', text: 'std::vector，因為連續記憶體、快取友善且隨機存取快' },
        { id: 'c', text: 'std::forward_list，因為最省記憶體' },
        { id: 'd', text: 'std::deque，因為兩端都能插入' },
      ],
      correctOptionId: 'b',
      explanation:
        'vector 連續存放、快取友善、隨機存取 O(1)、尾端插入攤銷 O(1)，是最常見的預設容器。參見 Ch.20 PDF 第 20 頁。',
    },
    {
      id: 'q2',
      stem: 'std::map 與 std::unordered_map 的查找複雜度分別為何？',
      options: [
        { id: 'a', text: '兩者都是 O(1)' },
        { id: 'b', text: 'map 為 O(log n)（有序），unordered_map 平均為 O(1)（無序）' },
        { id: 'c', text: '兩者都是 O(n)' },
        { id: 'd', text: 'map 為 O(1)，unordered_map 為 O(log n)' },
      ],
      correctOptionId: 'b',
      explanation:
        'map 以平衡樹實作提供有序遍歷與 O(log n)；unordered_map 以雜湊表提供平均 O(1) 但無序。參見 Ch.20 PDF 第 34 頁。',
    },
    {
      id: 'q3',
      stem: '為何鼓勵以標準演算法（如 count_if、transform）取代手寫迴圈？',
      options: [
        { id: 'a', text: '演算法一定比迴圈快很多倍' },
        { id: 'b', text: '它們表達意圖更清楚、較不易出錯，並可與迭代器／ranges 通用組合' },
        { id: 'c', text: '手寫迴圈在 C++20 已被禁止' },
        { id: 'd', text: '演算法不需要任何標頭' },
      ],
      correctOptionId: 'b',
      explanation:
        '標準演算法把常見操作命名化，減少邊界錯誤、提升可讀性，並能與 ranges 組合。參見 Ch.20 PDF 第 46 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['容器', '迭代器', 'ranges', '演算法'],
    caption:
      'STL 的組成：容器儲存資料，迭代器抽象走訪，ranges 與演算法在其上提供可組合的操作。',
  },
  tryIt: {
    code: `#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{5, 3, 8, 1, 9, 2, 7};
    std::ranges::sort(v);
    for (int x : v) std::cout << x << ' ';
    std::cout << '\\n';
    auto big = std::ranges::count_if(v, [](int x) { return x > 4; });
    std::cout << "count > 4 = " << big << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Containers library - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/container',
      description: '各容器的複雜度保證與介面比較。',
    },
    {
      title: 'Algorithms library - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/algorithm',
      description: '標準演算法與其 ranges 版本一覽。',
    },
    {
      title: 'Modern C++ Programming — Containers & Algorithms (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/20.Containers_iterators_algorithms.html',
      description: 'Busato 課程第 20 章 HTML 投影片，涵蓋容器與演算法原文。',
    },
  ],
};

export default ch20ContainersAlgorithms;
