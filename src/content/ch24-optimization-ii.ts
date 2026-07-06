import type { ChapterContent } from '@/types/ChapterContent';

const ch24OptimizationII: ChapterContent = {
  slug: 'ch24-optimization-ii',
  chapterLabel: 'Ch.24',
  title: '最佳化 II：快取與分支預測',
  group: 'F · 效能最佳化',
  description:
    '算術與記憶體最佳化、快取利用、資料對齊、prefetch、分支預測與迴圈最佳化：如何寫出對硬體友善的熱路徑。',
  concept: {
    standard: 'C++23',
    body:
      '在記憶體受限的程式中，快取行為往往比指令數更決定效能。快取以「快取行」（常見 64 位元組）為單位載入，因此善用空間與時間區域性至關重要：連續存取、結構的資料佈局（AoS 對比 SoA）、以及避免多執行緒寫入落在同一快取行的「偽共享」都會顯著影響速度。資料對齊讓存取不跨快取行，alignas 可強制對齊；prefetch 可提示硬體預取但需謹慎。分支預測失敗會清空管線，成本高昂：讓分支可預測、以無分支技巧（如條件移動、查表）取代難預測分支，或將常見情況前置，都能幫助預測器。迴圈最佳化如展開（unrolling）、外提不變量與向量化，則減少額外負擔並釋放 ILP／SIMD 潛力。務必以量測而非猜測來驅動最佳化。',
  },
  code: {
    lang: 'cpp',
    code: `#include <cstdint>
#include <new>
#include <vector>

// 偽共享：兩執行緒各自寫入相鄰計數器，卻共用同一快取行。 [1]
struct BadCounters {
    std::int64_t a;  // 與 b 極可能落在同一 64B 快取行
    std::int64_t b;
};

// 以對齊到快取行大小的填充消除偽共享。 [2]
struct alignas(std::hardware_destructive_interference_size) Padded {
    std::int64_t value{0};
};
struct GoodCounters {
    Padded a;  // [3] 各自獨佔一條快取行
    Padded b;
};

// 分支可預測性：已排序資料讓分支預測器命中率大增。 [4]
long long sumAboveThreshold(const std::vector<int>& v, int t) {
    long long s = 0;
    for (int x : v)
        if (x >= t) s += x;  // [5] 資料若已排序，此分支高度可預測
    return s;
}`,
    callouts: [
      { n: 1, text: '兩個相鄰的計數器常落在同一快取行；不同核心寫入會互相使對方快取失效，即偽共享。' },
      { n: 2, text: 'alignas(hardware_destructive_interference_size) 讓物件對齊到快取行邊界，避免共享。' },
      { n: 3, text: '每個計數器獨佔一條快取行後，跨核心寫入不再互相干擾，擴充性大幅改善。' },
      { n: 4, text: '分支預測器倚賴歷史規律；已排序輸入讓「x >= t」的走向長時間一致，命中率高。' },
      { n: 5, text: '難預測的分支會頻繁清空管線；可預測的分支幾乎零成本，量測時差異明顯。' },
    ],
  },
  deepDive: [
    {
      heading: '資料佈局：AoS 對比 SoA',
      body:
        '陣列的結構（AoS，`struct{float x,y,z;} a[N]`）直觀但在只用單一欄位時浪費快取頻寬；結構的陣列（SoA，`float x[N], y[N], z[N]`）讓同欄位連續存放，對向量化與快取極友善，是熱路徑常見的重構。\n\n對齊（`alignas`）讓 SIMD 載入不跨快取行；適度的填充可消除偽共享。佈局決策應由熱路徑的存取模式驅動。',
    },
    {
      heading: '分支的成本與消除',
      body:
        '難以預測的分支會頻繁清空管線。可用無分支技巧（條件移動、查表、算術遮罩）取代，或先排序資料讓分支變得可預測。`[[likely]]`／`[[unlikely]]` 或 `__builtin_expect` 可給提示。\n\n但無分支不一定更快，且會損害可讀性——務必以量測佐證，只在證實為瓶頸的熱路徑上採用。',
    },
    {
      heading: 'Prefetch 與迴圈最佳化',
      body:
        '軟體預取（`__builtin_prefetch`）偶爾有用，但過度預取會污染快取、反而更慢；多數情況應信賴硬體預取器並改善存取的規律性。迴圈展開（unrolling）與迴圈不變量外提可減少額外負擔並釋放 ILP。\n\n分塊（blocking／tiling）把工作切成能放進快取的區塊以最大化重用，是矩陣運算等記憶體受限核心的關鍵手法。',
    },
  ],
  pitfalls: [
    '在熱路徑對 SIMD 友善的運算沿用 AoS 佈局，浪費快取頻寬並阻礙向量化。',
    '多執行緒寫入相鄰計數器造成偽共享，擴充性不升反降。',
    '過度使用軟體 prefetch，污染快取而讓效能更差。',
    '為了無分支而犧牲可讀性，卻沒有量測證明真的更快。',
  ],
  bestPractices: [
    '熱路徑採 SoA 佈局並對齊，促成向量化與快取重用。',
    '對跨核心寫入的計數器加填充（或對齊到快取行）以消除偽共享。',
    '採用無分支或分支提示前先剖析；只優化證實的瓶頸。',
    '以分塊改善資料重用；讓編譯器展開迴圈並用組語驗證。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '「偽共享（false sharing）」是什麼？',
      options: [
        { id: 'a', text: '兩個執行緒故意共用同一變數' },
        { id: 'b', text: '不同執行緒寫入落在同一快取行的不同變數，導致快取一致性流量與效能下降' },
        { id: 'c', text: '快取容量不足' },
        { id: 'd', text: '兩個程序共用同一檔案' },
      ],
      correctOptionId: 'b',
      explanation:
        '偽共享指邏輯上獨立的變數因位於同一快取行，被不同核心寫入時互相使快取失效，可用對齊與填充消除。參見 Ch.24 PDF 第 40 頁。',
    },
    {
      id: 'q2',
      stem: '為什麼分支預測失敗（misprediction）代價高昂？',
      options: [
        { id: 'a', text: '它會導致記憶體洩漏' },
        { id: 'b', text: '它會清空 CPU 管線，已投機執行的工作作廢，需重新取指令' },
        { id: 'c', text: '它會使快取容量變小' },
        { id: 'd', text: '它會讓程式無法編譯' },
      ],
      correctOptionId: 'b',
      explanation:
        '現代 CPU 以投機執行填滿深管線；預測失敗需清空管線並重取，浪費數十個週期。參見 Ch.24 PDF 第 33 頁。',
    },
    {
      id: 'q3',
      stem: '在資料密集的迴圈中，為什麼「存取順序」可能比「運算量」更影響效能？',
      options: [
        { id: 'a', text: '因為 CPU 只在乎資料而不在乎運算' },
        { id: 'b', text: '因為快取以快取行載入，連續存取能重複利用已載入資料，減少昂貴的 DRAM 存取' },
        { id: 'c', text: '因為運算永遠是免費的' },
        { id: 'd', text: '因為編譯器會刪除所有運算' },
      ],
      correctOptionId: 'b',
      explanation:
        '快取行一次載入多個相鄰元素；良好的空間區域性能命中快取，而跳躍存取常導致失效與 DRAM 存取。參見 Ch.24 PDF 第 18 頁。',
    },
  ],
  diagram: {
    key: 'cache-line',
    caption:
      '快取行視覺化：切換偽共享（false sharing）與填充（padding）兩種配置，觀察多核心寫入如何互相使快取失效。',
  },
  tryIt: {
    code: `#include <chrono>
#include <iostream>
#include <numeric>
#include <vector>

// 觀察分支可預測性的影響：已排序 vs. 未排序輸入。
int main() {
    constexpr int kN = 1 << 20;
    std::vector<int> v(kN);
    for (int i = 0; i < kN; ++i) v[i] = (i * 1103515245 + 12345) & 255;

    auto run = [&]() {
        auto t0 = std::chrono::steady_clock::now();
        long long s = 0;
        for (int x : v)
            if (x >= 128) s += x;
        auto t1 = std::chrono::steady_clock::now();
        return std::pair{s, std::chrono::duration<double, std::milli>(t1 - t0).count()};
    };

    auto [s1, ms1] = run();
    std::sort(v.begin(), v.end());
    auto [s2, ms2] = run();
    std::cout << "unsorted: " << ms1 << " ms\\n";
    std::cout << "sorted:   " << ms2 << " ms (分支更可預測)\\n";
    return (int)((s1 ^ s2) & 0);
}`,
  },
  furtherReading: [
    {
      title: 'std::hardware_destructive_interference_size',
      href: 'https://en.cppreference.com/w/cpp/thread/hardware_destructive_interference_size',
      description: '用於避免偽共享的快取行大小常數。',
    },
    {
      title: 'What Every Programmer Should Know About Memory (Drepper)',
      href: 'https://people.freebsd.org/~lstewart/articles/cpumemory.pdf',
      description: '快取、對齊、prefetch 與偽共享的經典深入長文。',
    },
    {
      title: 'Modern C++ Programming — Optimization II (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/24.Optimization_II.html',
      description: 'Busato 課程第 24 章 HTML 投影片，涵蓋快取與分支預測原文。',
    },
  ],
};

export default ch24OptimizationII;
