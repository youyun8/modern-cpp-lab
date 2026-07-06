import type { ChapterContent } from '@/types/ChapterContent';

const ind01WhyParallelRoofline: ChapterContent = {
  slug: 'ind01-why-parallel-roofline',
  chapterLabel: '第 1 章',
  title: '為何平行、效能的上限在哪',
  group: 'H · 第零部：先修與心智模型',
  description:
    'Amdahl／Gustafson 定律、strong/weak scaling 與 Roofline 模型，建立「先算上限、再談實作」的效能工程紀律。',
  concept: {
    standard: 'C++20',
    body: '在動手平行化之前，工業級工程師必須先回答兩個問題：理論上限在哪、以及值不值得做。Amdahl 定律告訴我們，程式中無法平行化的序列部分會限制整體加速比的上限；Gustafson 定律則從「問題規模隨資源增大」的角度給出更樂觀的視角，兩者分別對應 strong scaling（固定問題規模、增加核心數）與 weak scaling（核心數與問題規模同步增加）。Roofline 模型進一步把上限量化成兩條線：算力上限（peak FLOPs）與記憶體頻寬上限（peak bandwidth），核心度量是 arithmetic intensity（AI，每搬運一位元組記憶體所做的浮點運算數）。平行化本身還有隱性成本：同步開銷、快取一致性流量、false sharing、NUMA 遠端存取，這些都可能讓「理論上可平行」變成「實際上不划算」。紀律是：先量測、算出上限，再決定要不要投入實作。',
  },
  code: {
    lang: 'cpp',
    code: `#include <algorithm>
#include <cstdio>

// [1] Amdahl 定律：固定問題規模下，加速比的理論上限。
//     speedup(p, s) = 1 / ((1 - p) + p / s)
//     p：可平行化比例（0~1）；s：平行部分的加速倍數（約略等於核心數）。
double amdahlSpeedup(double parallel_fraction, double speedup_factor) {
  double serial_fraction = 1.0 - parallel_fraction;
  return 1.0 / (serial_fraction + parallel_fraction / speedup_factor);  // [2]
}

// [3] Gustafson 定律：固定「每個處理器的工作量」，隨處理器數增加問題規模。
//     scaled_speedup(p, n) = (1 - p) + p * n
double gustafsonSpeedup(double parallel_fraction, double num_processors) {
  return (1.0 - parallel_fraction) + parallel_fraction * num_processors;
}

// [4] Roofline：算術強度 AI = FLOPs / Bytes；可達效能 = min(peak_flops, AI *
// peak_bw)。
double attainablePerformanceGFlops(double arithmetic_intensity,
                                   double peak_gflops,
                                   double peak_bandwidth_gbs) {
  double memory_bound_estimate =
      arithmetic_intensity * peak_bandwidth_gbs;  // [5]
  return std::min(peak_gflops, memory_bound_estimate);
}

int main() {
  // 假設 90% 程式碼可平行化，在 32 核心上執行。
  double p = 0.90;
  double s = 32.0;
  std::printf("Amdahl speedup (p=%.2f, s=%.0f) = %.2f\\n",  // [6]
              p, s, amdahlSpeedup(p, s));
  std::printf("Gustafson scaled speedup       = %.2f\\n",
              gustafsonSpeedup(p, s));

  // STREAM Triad 的 arithmetic intensity 大約是 1 FLOP / 24 bytes。
  double ai = 1.0 / 24.0;
  double peak_gflops = 2000.0;  // 假設峰值算力 2 TFLOPs
  double peak_bw_gbs = 200.0;   // 假設峰值頻寬 200 GB/s
  std::printf("Attainable = %.2f GFLOP/s (memory-bound)\\n",
              attainablePerformanceGFlops(ai, peak_gflops, peak_bw_gbs));
  return 0;
}`,
    callouts: [
      {
        n: 1,
        text: 'Amdahl 定律假設問題規模固定，只探討「用更多核心能把既有工作做多快」，也就是 strong scaling。',
      },
      {
        n: 2,
        text: '當 s 趨近無限大時，speedup 收斂到 1 / (1 - p)：序列部分決定了加速比的硬上限。',
      },
      {
        n: 3,
        text: 'Gustafson 定律換一個角度：核心數增加時，讓問題規模一起變大，凸顯的是 weak scaling 下的可擴充性。',
      },
      {
        n: 4,
        text: 'Roofline 模型把效能上限畫成兩條線的交會：低 AI 時受限於記憶體頻寬，高 AI 時受限於算力峰值。',
      },
      {
        n: 5,
        text: '這一行就是 Roofline 的核心公式：可達效能是「算力峰值」與「AI 乘以頻寬峰值」兩者中較小的一個。',
      },
      { n: 6, text: '印出結果前記得跳脫反斜線：範本字面值中每個換行符號都要寫成雙反斜線 n。' },
    ],
  },
  deepDive: [
    {
      heading: 'Amdahl vs Gustafson：兩種 scaling 的世界觀',
      body: 'Amdahl 定律的公式是 `speedup(p, s) = 1 / ((1 - p) + p / s)`，其中 p 是可平行化比例、s 是平行部分獲得的加速倍數（理想情況下約等於處理器數）。它的世界觀是「問題規模不變，只想用更多核心更快做完同一件事」，這正是 strong scaling 的定義。當 s 趨近無限大時，加速比收斂到 `1 / (1 - p)`——即使有無限多核心，只要有 10% 序列部分，加速比也不可能超過 10 倍。\n\nGustafson 定律則反問：如果我們願意讓問題變大呢？其公式 `scaled_speedup(p, n) = (1 - p) + p * n` 假設每個處理器分到的工作量固定，處理器數 n 增加時整體問題規模同步放大，這是 weak scaling。兩者並不矛盾，而是回答不同的問題：Amdahl 適合評估「同一個固定大小的 batch job 能加速多少」，Gustafson 適合評估「同一套系統能不能處理更大規模的問題」。在做效能規劃時，先問清楚自己面對的是哪一種 scaling，才不會用錯定律得出誤導性的結論。',
    },
    {
      heading: 'Roofline 模型：算力上限與記憶體頻寬上限',
      body: 'Roofline 模型用一張 log-log 圖同時呈現兩個硬體上限：橫軸是 arithmetic intensity（AI，單位 FLOPs/byte），縱軸是可達效能（GFLOP/s）。AI 的定義是 `AI = 總浮點運算數 / 總搬運位元組數`，衡量一個核心（kernel）每搬運一位元組資料能做多少運算。圖上有一條斜線（頻寬上限，斜率等於記憶體頻寬）與一條水平線（算力上限，等於硬體峰值 FLOPs），兩線交點左邊是 memory-bound 區域、右邊是 compute-bound 區域。\n\n可達效能的公式是 `attainable = min(peak_FLOPs, AI * peak_bandwidth)`：AI 低的核心（如 STREAM Triad，AI 約 1/24）不管算力多強都會被頻寬拖住；AI 高的核心（如稠密矩陣乘法，AI 隨問題規模增長）才有機會逼近算力峰值。這個模型的價值在於，它在寫任何一行程式碼之前，就能告訴你這個演算法「理論上」最快能跑多快——如果實測結果離 Roofline 上限還有數量級的差距，代表問題出在實作（例如快取利用不佳、向量化未開啟），而不是硬體本身不夠快。',
    },
    {
      heading: '如何量測本機的頻寬與峰值算力',
      body: '要畫出自己機器的 Roofline，第一步是量測記憶體頻寬峰值，最經典的做法是 McCalpin 的 STREAM benchmark：它以 Copy、Scale、Add、Triad 四種簡單的陣列運算（例如 Triad 的 `a[i] = b[i] + scalar * c[i]`），在資料量遠大於末級快取的前提下，量測每秒可搬運的位元組數，取其中最具代表性的 Triad 頻寬作為 peak bandwidth 的實務估計。第二步是量測峰值算力，可用廠商公告的理論峰值（核心數 × 頻率 × 每週期 FLOPs × SIMD 寬度），或用一個高度向量化、完全留在暫存器內運算的微基準（如密集的 FMA 迴圈）實測逼近值。\n\n有了這兩個數字，再對目標核心計算其 arithmetic intensity（計算其浮點運算數與讀寫的位元組數之比），就能在 log-log 座標上標出該核心落在 Roofline 的哪個位置：落在頻寬斜線下方代表是 memory-bound，應優先考慮改善資料局部性、減少記憶體搬運（如迴圈融合、blocking／tiling）；落在算力線下方則是 compute-bound，應優先考慮向量化、提高 ILP 或改用更快的演算法。這個方法論不需要跑腳本才能理解：關鍵是先量兩個常數（頻寬、算力），再對每個核心算一個比值（AI），效能優化的方向立刻一目了然。',
    },
    {
      heading: '平行化的隱性成本：同步、快取一致性與 NUMA',
      body: '把序列程式改成平行程式並不是免費的午餐。同步原語（mutex、barrier、atomic）本身有開銷，且會在核心間製造快取一致性流量：當一個核心寫入某條快取線時，其他持有同一快取線副本的核心必須透過一致性協定（如 MESI）作廢或更新，這種流量會隨著核心數增加而放大，甚至超越實際計算所需的頻寬。False sharing 是這個問題的典型案例：兩個邏輯上無關的變數若恰好落在同一條快取線（通常 64 位元組）內，被不同執行緒各自寫入，會造成該快取線在核心間反覆彈跳，效能可能比完全序列化執行還差。\n\nNUMA（Non-Uniform Memory Access）架構下，每個 socket 有自己的本地記憶體，跨 socket 存取遠端記憶體的延遲與頻寬都明顯劣於本地存取。若執行緒與其操作的資料未做親和性（affinity）綁定，排程器可能把執行緒遷移到別的 socket，導致原本應該是本地的存取變成遠端存取。這些隱性成本說明了為什麼 Amdahl／Gustafson 的理想曲線在實務上往往達不到：核心數增加後，同步與一致性流量會侵蝕平行部分本該獲得的加速，這也是「先量測、再優化」紀律的根本原因——沒有量測，就無法分辨加速比不如預期是演算法本質的限制，還是這些隱性成本造成的。',
    },
  ],
  pitfalls: [
    '在沒有量出 Roofline 上限之前就開始平行化，投入大量工程卻撞上記憶體頻寬天花板。',
    '把 Amdahl 定律套用在 weak scaling 的場景（或反之），得出與實際行為不符的加速比預期。',
    '忽略 false sharing：多個執行緒各自累加的變數被編譯器排在同一條快取線內，效能不增反減。',
    '在 NUMA 機器上未做執行緒／記憶體親和性綁定，讓「本地」存取變成跨 socket 的遠端存取。',
    '只看理論峰值 FLOPs 做效能評估，忽略絕大多數真實核心其實是 memory-bound，AI 才是決定性因素。',
  ],
  bestPractices: [
    '平行化前先用 STREAM 一類的方法估出本機記憶體頻寬峰值，並估算目標核心的 arithmetic intensity。',
    '依據 strong scaling 或 weak scaling 的實際場景，分別選用 Amdahl 或 Gustafson 定律做預期管理。',
    '共享可變狀態盡量對齊快取線邊界或加 padding，避免 false sharing。',
    '在多 socket 機器上明確設定執行緒與記憶體的 NUMA 親和性（如 `numactl`、`hwloc`）。',
    '把「先量測、再優化」變成流程紀律：先算 Roofline 上限，再決定是否值得投入平行化工程。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '根據 Amdahl 定律，若程式有 20% 為無法平行化的序列部分，理論上加速比的上限是多少？',
      options: [
        { id: 'a', text: '2 倍' },
        { id: 'b', text: '5 倍' },
        { id: 'c', text: '10 倍' },
        { id: 'd', text: '沒有上限，核心數夠多就能無限加速' },
      ],
      correctOptionId: 'b',
      explanation:
        '當平行部分的加速倍數 s 趨近無限大時，speedup 收斂到 1 / (1 - p)。p = 0.8 時上限為 1 / 0.2 = 5 倍，序列部分的比例決定了硬上限。',
    },
    {
      id: 'q2',
      stem: '在 Roofline 模型中，一個 arithmetic intensity 很低的核心（例如 STREAM Triad）通常受限於什麼？',
      options: [
        { id: 'a', text: 'CPU 的浮點運算峰值（compute-bound）' },
        { id: 'b', text: '記憶體頻寬峰值（memory-bound）' },
        { id: 'c', text: '編譯器最佳化等級' },
        { id: 'd', text: '執行緒建立的開銷' },
      ],
      correctOptionId: 'b',
      explanation:
        'AI 低代表每搬運一位元組資料只做很少運算，可達效能被 AI 乘以頻寬峰值這條線卡住，即使算力峰值再高也用不上，因此屬於 memory-bound。',
    },
    {
      id: 'q3',
      stem: '兩個執行緒各自頻繁寫入自己的計數器，但兩個計數器恰好落在同一條 64 位元組快取線內，最可能發生的效能問題是什麼？',
      options: [
        { id: 'a', text: '編譯器會拒絕編譯' },
        { id: 'b', text: 'False sharing：快取線在兩個核心間反覆作廢與搬移，效能明顯下降' },
        { id: 'c', text: '兩個變數會被自動合併成一個原子變數' },
        { id: 'd', text: '這完全不影響效能，因為每個執行緒只寫自己的變數' },
      ],
      correctOptionId: 'b',
      explanation:
        '快取一致性協定以快取線為單位運作；即使兩個變數邏輯上無關，只要共享同一條快取線，寫入就會觸發跨核心的一致性流量，造成 false sharing 效能懲罰，常見解法是加 padding 或對齊。',
    },
  ],
  diagram: {
    key: 'amdahl-curve',
    caption:
      'Amdahl 定律加速曲線：拖動滑桿調整可平行化比例 p，觀察加速比隨處理器數量增加而趨於平緩的上限。',
  },
  tryIt: {
    code: `#include <cstdio>

// 簡易 Amdahl 加速比計算：p 為可平行化比例，n 為處理器數量。
double amdahlSpeedup(double p, double n) { return 1.0 / ((1.0 - p) + p / n); }

int main() {
  double p = 0.95;
  for (double n = 1.0; n <= 64.0; n *= 2.0) {
    std::printf("n=%.0f speedup=%.2f\\n", n, amdahlSpeedup(p, n));
  }
  return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Roofline: An Insightful Visual Performance Model (Williams, Waterman, Patterson)',
      href: 'https://doi.org/10.1145/1498765.1498785',
      description:
        'Roofline 模型的原始論文，定義 arithmetic intensity 與可達效能的公式與圖示方法。',
    },
    {
      title: 'STREAM: Sustainable Memory Bandwidth Benchmark (John D. McCalpin)',
      href: 'https://www.cs.virginia.edu/stream/',
      description:
        'McCalpin 的 STREAM benchmark 官方頁面，Copy/Scale/Add/Triad 的定義與各平台實測數據。',
    },
    {
      title: 'std::atomic - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/atomic/atomic',
      description: '同步原語與記憶體序的標準參考，理解同步開銷來源的基礎。',
    },
    {
      title: 'What Every Programmer Should Know About Memory (Ulrich Drepper)',
      href: 'https://people.freebsd.org/~lstewart/articles/cpumemory.pdf',
      description: '深入探討快取一致性、false sharing 與 NUMA 對效能的影響的經典長文。',
    },
  ],
};

export default ind01WhyParallelRoofline;
