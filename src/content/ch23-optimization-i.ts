import type { ChapterContent } from '@/types/ChapterContent';

const ch23OptimizationI: ChapterContent = {
  slug: 'ch23-optimization-i',
  chapterLabel: '第 23 章',
  title: '最佳化 I：架構與記憶體階層',
  group: '第 6 部：效能最佳化',
  description:
    '效能最佳化的理論基礎：Amdahl 定律、Gustafson 定律、指令層級平行（ILP）、SIMD／SIMT、記憶體階層、快取一致性，以及 TLP 與 DLP 的差異。',
  concept: {
    standard: 'C++17',
    body: '效能來自於理解硬體。Amdahl 定律指出：加速比受限於程式中無法平行化的部分；Gustafson 定律則說明放大問題規模可攤平序列開銷。平行性有多種層次：指令層級平行（ILP）由亂序執行與管線提供，資料層級平行（DLP）由 SIMD／SIMT 提供，執行緒層級平行（TLP）由多核提供。記憶體階層（L1→L2→L3→DRAM→Disk）延遲相差數個數量級，而快取一致性協定（如 MESI）維持多核視圖一致。最佳化的第一步是找出瓶頸落在計算還是記憶體。',
  },
  code: {
    lang: 'cpp',
    code: `#include <cstddef>
#include <vector>

// Row-major traversal is cache-friendly: consecutive iterations touch
// consecutive addresses, maximising spatial locality. [1]
double sumRowMajor(const std::vector<double>& matrix, std::size_t rows, std::size_t cols) {
    double acc = 0.0;
    for (std::size_t r = 0; r < rows; ++r) {  // [2]
        for (std::size_t c = 0; c < cols; ++c) {
            acc += matrix[r * cols + c];
        }
    }
    return acc;
}

// Column-major traversal jumps by 'cols' each step, defeating the cache
// and causing frequent DRAM misses. [3]
double sumColMajor(const std::vector<double>& matrix, std::size_t rows, std::size_t cols) {
    double acc = 0.0;
    for (std::size_t c = 0; c < cols; ++c) {
        for (std::size_t r = 0; r < rows; ++r) {
            acc += matrix[r * cols + c];  // [4]
        }
    }
    return acc;
}

// Amdahl's Law: theoretical speedup with fraction p parallelised. [5]
constexpr double amdahlSpeedup(double p, double n) { return 1.0 / ((1.0 - p) + p / n); }`,
    callouts: [
      { n: 1, text: '列優先（row-major）走訪符合 C++ 陣列的記憶體佈局，善用空間區域性。' },
      { n: 2, text: '內層迴圈連續存取相鄰位址，一條快取行可服務多次迭代。' },
      { n: 3, text: '欄優先走訪每步跨越一整列，快取行幾乎每次都失效。' },
      { n: 4, text: '相同的資料、相同的計算，只因存取順序不同就可能慢上數倍。' },
      { n: 5, text: 'amdahlSpeedup 以 constexpr 在編譯期即可計算理論加速上限。' },
    ],
  },
  deepDive: [
    {
      heading: 'Roofline 模型與瓶頸判定',
      body: '最佳化前先判斷是計算受限（compute-bound）還是記憶體受限（memory-bound）。算術強度（arithmetic intensity，每位元組資料的浮點運算數）決定你落在 roofline 圖的哪一區：低強度受記憶體頻寬限制，高強度才受峰值算力限制。\n\n記憶體受限的核心，增加 FLOPs 或換更快的 ALU 無濟於事——應改善資料重用與存取模式；反之則往向量化與指令層級平行著手。',
    },
    {
      heading: 'SIMD 與自動向量化',
      body: '編譯器自動向量化要求：連續存取、無資料相依循環、無指標別名疑慮。以 `__restrict` 承諾指標不重疊、確保對齊、避免迴圈中的函式呼叫，都能幫助向量化。可用 `-fopt-info-vec` 檢視是否成功。\n\n需要手動控制時使用 intrinsics 或未來的 `std::simd`；資料佈局改為 SoA（structure of arrays）通常比 AoS 更利於向量化。',
    },
    {
      heading: '快取一致性、NUMA 與 TLB',
      body: '多核以 MESI 類協定維持快取一致性，跨核心寫入同一快取行會產生一致性流量（偽共享的根源）。在 NUMA 系統上，記憶體有「近／遠」之分，遵循 first-touch 原則由使用該資料的執行緒初始化，可提升區域性。\n\n大型工作集還會受 TLB 未命中影響，huge pages 可緩解。這些硬體效應往往比指令數更決定實際效能。',
    },
  ],
  pitfalls: [
    '在記憶體受限的核心上一味增加算力或 FLOPs，效能毫無改善。',
    '指標別名（aliasing）阻止編譯器向量化，卻未使用 `__restrict`。',
    '忽略 NUMA 佈局，資料被配置在遠端節點造成頻寬瓶頸。',
    '跨步（strided）或隨機存取破壞空間區域性，快取命中率低落。',
  ],
  bestPractices: [
    '先用 roofline／perf 判定計算或記憶體受限，再對症下藥。',
    '促成向量化：連續且對齊的存取、`__restrict`、SoA 佈局。',
    '在 NUMA 系統遵循 first-touch，讓資料靠近使用它的執行緒。',
    '以分塊（blocking）與資料重用改善快取區域性。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '若一支程式有 80% 可完美平行化，依 Amdahl 定律，在無限多處理器下的理論加速上限為何？',
      options: [
        { id: 'a', text: '無限大' },
        { id: 'b', text: '5 倍' },
        { id: 'c', text: '8 倍' },
        { id: 'd', text: '80 倍' },
      ],
      correctOptionId: 'b',
      explanation:
        '加速上限為 1 / (1 - p) = 1 / 0.2 = 5 倍；序列部分（20%）決定了天花板。參見 Ch.23 PDF 第 19 頁。',
    },
    {
      id: 'q2',
      stem: 'SIMD 與 SIMT 屬於哪一種平行層次？',
      options: [
        { id: 'a', text: '執行緒層級平行（TLP）' },
        { id: 'b', text: '資料層級平行（DLP）' },
        { id: 'c', text: '任務層級平行（Task-Level）' },
        { id: 'd', text: '網路層級平行' },
      ],
      correctOptionId: 'b',
      explanation:
        'SIMD／SIMT 讓單一指令同時作用於多筆資料，屬資料層級平行（DLP）；多核心才對應 TLP。參見 Ch.23 PDF 第 33 頁。',
    },
    {
      id: 'q3',
      stem: '相較於 DRAM，L1 快取的存取延遲大約落在哪個數量級？',
      options: [
        { id: 'a', text: '兩者幾乎相同' },
        { id: 'b', text: 'L1 約為 DRAM 的十分之一到百分之一' },
        { id: 'c', text: 'L1 比 DRAM 慢' },
        { id: 'd', text: 'L1 與磁碟相當' },
      ],
      correctOptionId: 'b',
      explanation:
        'L1 約 1 ns，DRAM 約 100 ns，相差約兩個數量級；因此提升快取命中率是最佳化關鍵。參見 Ch.23 PDF 第 47 頁。',
    },
  ],
  diagram: {
    key: 'memory-ladder',
    caption:
      '記憶體階層延遲階梯（對數尺度）：從 L1 快取到磁碟，延遲相差數個數量級。將滑鼠移入或以鍵盤聚焦可查看說明。',
  },
  tryIt: {
    code: `#include <chrono>
#include <iostream>
#include <vector>

// Demonstrates spatial locality: the same reduction is far faster in
// row-major order than column-major, purely due to cache behaviour.
int main() {
    constexpr std::size_t kN = 4096;
    std::vector<double> matrix(kN * kN, 1.0);

    auto time = [&matrix](bool row_major) {
        auto start = std::chrono::steady_clock::now();
        double acc = 0.0;
        if (row_major) {
            for (std::size_t r = 0; r < kN; ++r) {
                for (std::size_t c = 0; c < kN; ++c) {
                    acc += matrix[r * kN + c];
                }
            }
        } else {
            for (std::size_t c = 0; c < kN; ++c) {
                for (std::size_t r = 0; r < kN; ++r) {
                    acc += matrix[r * kN + c];
                }
            }
        }
        auto end = std::chrono::steady_clock::now();
        return std::pair{acc, std::chrono::duration<double, std::milli>(end - start).count()};
    };

    auto [sum_row, ms_row] = time(true);
    auto [sum_col, ms_col] = time(false);
    std::cout << "row-major: " << ms_row << " ms\\n";
    std::cout << "col-major: " << ms_col << " ms\\n";
    return static_cast<int>(sum_row + sum_col) & 0;
}`,
  },
  furtherReading: [
    {
      title: 'Amdahl’s Law - Wikipedia',
      href: 'https://en.wikipedia.org/wiki/Amdahl%27s_law',
      description: 'Amdahl 定律的公式推導與圖形化說明。',
    },
    {
      title: 'Gustafson’s Law - Wikipedia',
      href: 'https://en.wikipedia.org/wiki/Gustafson%27s_law',
      description: '以問題規模成長重新詮釋可擴充性的 Gustafson 定律。',
    },
    {
      title: 'Latency Numbers Every Programmer Should Know',
      href: 'https://gist.github.com/jboner/2841832',
      description: '各層記憶體與 I/O 的典型延遲數字速查表。',
    },
    {
      title: 'Modern C++ Programming — Optimization I (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/23.Optimization_I.html',
      description: 'Busato 課程第 23 章 HTML 投影片，涵蓋架構與記憶體階層。',
    },
    {
      title: 'What Every Programmer Should Know About Memory (Drepper)',
      href: 'https://people.freebsd.org/~lstewart/articles/cpumemory.pdf',
      description: 'Ulrich Drepper 對快取、TLB 與記憶體階層的經典長文。',
    },
  ],
};

export default ch23OptimizationI;
