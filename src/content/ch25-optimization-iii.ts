import type { ChapterContent } from '@/types/ChapterContent';

const ch25OptimizationIII: ChapterContent = {
  slug: 'ch25-optimization-iii',
  chapterLabel: 'Ch.25',
  title: '最佳化 III：編譯器旗標與剖析',
  group: 'F · 效能最佳化',
  description:
    '編譯器旗標（-O3 / -march / PGO / LTO）、profiling 工具與平行擴充性、benchmarking 方法論：如何以量測驅動最佳化。',
  concept: {
    standard: 'C++23',
    body:
      '最佳化的第一原則是量測，而非猜測。編譯器旗標影響巨大：-O2／-O3 開啟最佳化，-march=native 允許使用當前 CPU 的指令集（含 SIMD），-flto 啟用連結期最佳化以跨轉譯單元內聯與去程式碼，PGO（profile-guided optimization）以實際執行剖析回饋指導分支與版面配置。但要小心 -ffast-math 會放寬浮點語意、-march=native 會犧牲可移植性。剖析工具分兩類：取樣式（perf、VTune）低負擔地找出熱點，插樁式（callgrind、gprof）提供精確呼叫計數。微基準（Google Benchmark、quick-bench）量測小片段時須防編譯器把結果最佳化掉，並用足夠迭代與統計。評估平行程式時，以 Amdahl／Gustafson 定律理解擴充性上限，觀察加速比隨核心數的變化。',
  },
  code: {
    lang: 'bash',
    code: `# 基準最佳化：-O2/-O3 加上除錯符號以利剖析
g++ -std=c++23 -O3 -g -march=native app.cpp -o app   # [1]

# 連結期最佳化（LTO）：跨轉譯單元內聯與死碼移除
g++ -std=c++23 -O3 -flto app.cpp lib.cpp -o app       # [2]

# Profile-Guided Optimization：先蒐集剖析，再據以最佳化
g++ -std=c++23 -O3 -fprofile-generate app.cpp -o app  # [3]
./app                                                  # 產生 .gcda 剖析資料
g++ -std=c++23 -O3 -fprofile-use app.cpp -o app        # [4]

# 以 perf 取樣找出熱點（低負擔）
perf record -g ./app && perf report                    # [5]`,
    callouts: [
      { n: 1, text: '-O3 積極最佳化、-march=native 啟用當前 CPU 指令集（含 SIMD），-g 保留符號以便剖析。' },
      { n: 2, text: '-flto 讓最佳化跨越轉譯單元邊界，可內聯原本無法內聯的跨檔函式並移除死碼。' },
      { n: 3, text: '-fprofile-generate 產生帶插樁的版本，執行後蒐集實際分支與熱路徑資料。' },
      { n: 4, text: '-fprofile-use 以剛才的剖析回饋指導最佳化（分支機率、版面配置），常帶來額外增益。' },
      { n: 5, text: 'perf record 以取樣方式低負擔地找出熱點，perf report 檢視各函式佔比。' },
    ],
  },
  deepDive: [
    {
      heading: '最佳化等級與語意的取捨',
      body:
        '`-O2` 是穩健預設；`-O3` 更積極（更多內聯與向量化）但偶爾使程式變大甚至變慢；`-Os` 以體積為目標。`-march=native` 啟用當前 CPU 指令集但犧牲可攜性，不適合散布給未知硬體。\n\n`-ffast-math` 會改變浮點語意（假設無 NaN／inf、允許重排），可能破壞正確性。LTO 讓跨單元內聯與死碼移除，通常值得開啟。',
    },
    {
      heading: '剖析方法：取樣與插樁',
      body:
        '取樣式剖析（perf、VTune）以低負擔定期擷取呼叫堆疊，適合找熱點；插樁式（callgrind、gprof）提供精確呼叫計數但負擔高。火焰圖（flame graph）能直觀呈現時間分佈。\n\n`perf stat` 可看快取未命中、分支預測失敗與 IPC 等硬體計數器，判斷瓶頸性質。務必對 Release 建置剖析，並確保有除錯符號以對應原始碼。',
    },
    {
      heading: '嚴謹的微基準',
      body:
        '微基準需暖身（warmup）、足夠迭代與統計（中位數／變異數），並以 `benchmark::DoNotOptimize` 防止結果被死碼消除。CPU 頻率調節（turbo）與其他程序會製造雜訊，應固定頻率、綁定 CPU 以獲得穩定數字。\n\n注意微基準的結果未必反映真實工作負載下的快取與分支行為；最終仍應以端到端量測驗證。',
    },
  ],
  pitfalls: [
    '在 `-O0` 下做效能基準，或讓死碼消除移除了整段基準程式。',
    'CPU 頻率調節與背景程序造成基準數字雜訊而不自知。',
    '對冷路徑（cold code）微最佳化，投入與回報不成比例。',
    '把 `-march=native` 用於要散布到未知硬體的產物，導致無法執行。',
  ],
  bestPractices: [
    '以剖析數據驅動決策；對 Release + `-g` 建置做剖析。',
    '用 Google Benchmark 搭配 `DoNotOptimize`，暖身並取統計。',
    '固定 CPU 頻率、綁定核心以取得可重現的基準。',
    '只最佳化證實的熱路徑，並以端到端量測驗證增益。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: 'PGO（profile-guided optimization）的運作方式是什麼？',
      options: [
        { id: 'a', text: '在編譯期隨機猜測分支機率' },
        { id: 'b', text: '先以插樁版本執行蒐集實際剖析資料，再用該資料指導第二次最佳化編譯' },
        { id: 'c', text: '只是 -O3 的別名' },
        { id: 'd', text: '在執行期即時重編譯程式' },
      ],
      correctOptionId: 'b',
      explanation:
        'PGO 先蒐集真實工作負載的執行剖析，再據以最佳化分支預測、內聯與程式碼版面配置。參見 Ch.25 PDF 第 30 頁。',
    },
    {
      id: 'q2',
      stem: '使用 -march=native 的主要取捨是什麼？',
      options: [
        { id: 'a', text: '它會讓程式無法最佳化' },
        { id: 'b', text: '可使用當前 CPU 的指令集（如 AVX）提升效能，但產物可能無法在較舊 CPU 上執行' },
        { id: 'c', text: '它一定會讓程式變慢' },
        { id: 'd', text: '它會關閉所有 SIMD' },
      ],
      correctOptionId: 'b',
      explanation:
        '-march=native 針對編譯當下的 CPU 生成指令，效能較佳但犧牲可移植性，不適合發佈給未知硬體。參見 Ch.25 PDF 第 22 頁。',
    },
    {
      id: 'q3',
      stem: '撰寫微基準（microbenchmark）時最常見的陷阱是什麼？',
      options: [
        { id: 'a', text: '迭代次數太多' },
        { id: 'b', text: '編譯器把「沒有被使用的結果」最佳化掉，導致量到的是空迴圈' },
        { id: 'c', text: '使用了太多變數' },
        { id: 'd', text: '基準程式一定要以 -O0 編譯' },
      ],
      correctOptionId: 'b',
      explanation:
        '若結果未被使用，最佳化器可能整段刪除；需以 benchmark::DoNotOptimize 等手段防止，並用足夠迭代與統計。參見 Ch.25 PDF 第 41 頁。',
    },
  ],
  diagram: {
    key: 'amdahl-curve',
    caption:
      'Amdahl 定律加速曲線：拖動滑桿調整可平行化比例 p，SVG 會即時重繪加速比對處理器數量的曲線。',
  },
  tryIt: {
    code: `#include <chrono>
#include <cmath>
#include <iostream>

// 簡易 benchmark 骨架：多次迭代取平均，並防止結果被最佳化掉。
int main() {
    constexpr int kIter = 5'000'000;
    volatile double sink = 0.0;  // volatile 防止整段被刪除
    auto t0 = std::chrono::steady_clock::now();
    double acc = 0.0;
    for (int i = 1; i <= kIter; ++i) acc += std::sqrt((double)i);
    sink = acc;
    auto t1 = std::chrono::steady_clock::now();
    std::cout << "elapsed = " << std::chrono::duration<double, std::milli>(t1 - t0).count()
              << " ms, sink = " << sink << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'GCC Optimize Options',
      href: 'https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html',
      description: '-O 系列、-flto、-fprofile-* 等最佳化旗標詳解。',
    },
    {
      title: 'Linux perf examples (Brendan Gregg)',
      href: 'https://www.brendangregg.com/perf.html',
      description: '以 perf 進行取樣剖析與火焰圖分析的實務指南。',
    },
    {
      title: 'Modern C++ Programming — Optimization III (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/25.Optimization_III.html',
      description: 'Busato 課程第 25 章 HTML 投影片，涵蓋編譯器旗標與剖析原文。',
    },
  ],
};

export default ch25OptimizationIII;
