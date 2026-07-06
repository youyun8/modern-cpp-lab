import type { ChapterContent } from '@/types/ChapterContent';

const labParallelStl: ChapterContent = {
  slug: 'lab-parallel-stl',
  title: '平行化實驗室：平行 STL',
  group: '平行化實驗室',
  description:
    'std::execution 執行策略深入解析：seq／par／par_unseq／unseq 的差異、std::transform_reduce 與 std::for_each 的用法，以及 par_unseq 何時不安全。',
  concept: {
    standard: 'C++17',
    body:
      'C++17 為多數標準演算法加入執行策略參數。std::execution::seq 依序執行；par 允許多執行緒平行；unseq（C++20）允許單執行緒內向量化交錯；par_unseq 同時平行且向量化。策略越強，對呼叫端的限制越嚴：par 禁止資料競爭，par_unseq 額外禁止在元素函式內取得鎖或做無法交錯的操作（否則造成死鎖或未定義行為）。std::transform_reduce 是 map-reduce 的慣用組合，能一次完成轉換與歸約，並易於平行化。',
  },
  code: {
    lang: 'cpp',
    code: `#include <algorithm>
#include <execution>            // [1]
#include <numeric>
#include <vector>

double parallelDot(const std::vector<double>& a,
                   const std::vector<double>& b) {
  return std::transform_reduce(          // [2]
      std::execution::par_unseq,          // [3]
      a.begin(), a.end(), b.begin(),
      0.0,                                // init
      std::plus<>{},                      // reduce
      std::multiplies<>{});               // transform
}

void normalizeInPlace(std::vector<double>& data, double scale) {
  std::for_each(std::execution::par,      // [4]
                data.begin(), data.end(),
                [scale](double& x) { x *= scale; }); // [5]
}

// DANGER: taking a lock inside a par_unseq element function may deadlock,
// because unsequenced execution can interleave calls on one thread. [6]`,
    callouts: [
      { n: 1, text: '<execution> 標頭引入 std::execution::seq／par／unseq／par_unseq 策略物件。' },
      { n: 2, text: 'std::transform_reduce 一次完成「轉換」與「歸約」，是 map-reduce 的標準寫法。' },
      { n: 3, text: 'par_unseq 同時要求可平行與可向量化，限制最嚴、潛在效能最高。' },
      { n: 4, text: 'std::for_each 搭配 par 策略把元素處理分散到多個執行緒。' },
      { n: 5, text: 'Lambda 明確以 [scale] 值捕獲純量，避免共享可變狀態造成競爭。' },
      { n: 6, text: 'par_unseq 下不可在元素函式內上鎖或配置記憶體，否則可能死鎖或未定義行為。' },
    ],
  },
  quiz: [
    {
      id: 'q1',
      stem: '下列哪一個執行策略「同時」允許多執行緒平行與 SIMD 向量化？',
      options: [
        { id: 'a', text: 'std::execution::seq' },
        { id: 'b', text: 'std::execution::par' },
        { id: 'c', text: 'std::execution::unseq' },
        { id: 'd', text: 'std::execution::par_unseq' },
      ],
      correctOptionId: 'd',
      explanation:
        'par 僅平行、unseq 僅向量化；par_unseq 兩者兼具，因此對元素函式的限制也最嚴格。參見 Ch.25 PDF 第 55 頁。',
    },
    {
      id: 'q2',
      stem: '在 par_unseq 策略下，於元素函式中呼叫 std::mutex::lock() 會發生什麼？',
      options: [
        { id: 'a', text: '完全安全，標準保證可行' },
        { id: 'b', text: '可能造成死鎖或未定義行為' },
        { id: 'c', text: '會自動退化為 seq 策略' },
        { id: 'd', text: '編譯器一定會拒絕編譯' },
      ],
      correctOptionId: 'b',
      explanation:
        '未定序執行可能在同一執行緒上交錯呼叫，若在其中上鎖將導致死鎖；標準明訂此為未定義行為。參見 Ch.25 PDF 第 58 頁。',
    },
    {
      id: 'q3',
      stem: 'std::transform_reduce 相較於先 transform 再 reduce 的主要好處是？',
      options: [
        { id: 'a', text: '它一定會用到 GPU' },
        { id: 'b', text: '可避免產生中間容器並更易於平行歸約' },
        { id: 'c', text: '它會自動排序輸出' },
        { id: 'd', text: '它不需要提供初始值' },
      ],
      correctOptionId: 'b',
      explanation:
        'transform_reduce 融合轉換與歸約，省去中間暫存容器，且歸約運算需可結合以利平行拆分。參見 Ch.25 PDF 第 52 頁。',
    },
  ],
  diagram: {
    key: 'execution-policies',
    caption:
      '執行策略排程示意：切換分頁比較 seq／par／unseq／par_unseq 如何把 8 個元素分派到執行緒與向量通道。',
  },
  tryIt: {
    code: `#include <algorithm>
#include <execution>
#include <iostream>
#include <numeric>
#include <vector>

// Build with an OpenMP-backed parallel STL to see real speedups, e.g.
//   g++ -std=c++23 -O2 -pthread -march=native main.cpp
// On some toolchains libtbb is required to link the parallel algorithms.
int main() {
  std::vector<double> a(1'000'000, 1.5);
  std::vector<double> b(1'000'000, 2.0);

  double dot = std::transform_reduce(
      std::execution::par_unseq,
      a.begin(), a.end(), b.begin(),
      0.0, std::plus<>{}, std::multiplies<>{});

  std::for_each(std::execution::par, a.begin(), a.end(),
                [](double& x) { x *= 0.5; });

  std::cout << "dot = " << dot << '\\n';
  std::cout << "a[0] = " << a.front() << '\\n';
  return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::execution policies - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/algorithm/execution_policy_tag_t',
      description: 'seq／par／unseq／par_unseq 策略標籤的正式定義。',
    },
    {
      title: 'std::transform_reduce - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/algorithm/transform_reduce',
      description: '融合轉換與歸約的平行演算法，含多種多載說明。',
    },
    {
      title: 'P0024R2: Parallelism TS into the IS',
      href: 'https://wg21.link/P0024',
      description: '將平行演算法納入標準的 ISO 提案文件。',
    },
    {
      title: 'Modern C++ Programming — Optimization III (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/25.Optimization_III.html',
      description: 'Busato 第 25 章投影片，涵蓋平行演算法與擴充性。',
    },
    {
      title: 'Parallel Algorithms in C++ (Rainer Grimm)',
      href: 'https://www.modernescpp.com/index.php/parallel-algorithm-of-the-standard-template-library/',
      description: 'Rainer Grimm 對平行 STL 執行策略與效能的實作導讀。',
    },
  ],
};

export default labParallelStl;
