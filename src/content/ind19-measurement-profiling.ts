import type { ChapterContent } from '@/types/ChapterContent';

const ind19MeasurementProfiling: ChapterContent = {
  slug: 'ind19-measurement-profiling',
  chapterLabel: '第 19 章',
  title: '量測與剖析',
  group: 'N · 第六部：效能工程',
  description:
    '微基準陷阱、Google Benchmark，perf／VTune／LIKWID／rocprof 的使用，以及 roofline 實測。',
  concept: {
    standard: 'C++20',
    body:
      '第 1 章用 Roofline 模型畫出了「理論上限」，但理論值需要靠實測才能填成一張可信的圖；沒有量測紀律，任何最佳化決策都只是猜測。微基準（microbenchmark）看似簡單，卻充滿陷阱：編譯器可能把沒有副作用的計算整段刪除、CPU 頻率調節（turbo/throttling）與冷快取會讓前幾次迭代失真、只取平均數而忽略雜訊分佈都會導致誤判。Google Benchmark 提供 `benchmark::DoNotOptimize` 與 `benchmark::ClobberMemory` 兩個工具正面對抗編譯器最佳化。當基準之外要看真實程式的行為時，需要剖析工具：Linux `perf` 是通用取樣剖析器，Intel VTune 深入微架構瓶頸（如記憶體延遲、前端停滯），LIKWID 是輕量的硬體計數器套件，AMD `rocprof` 則是 ROCm GPU 核心的剖析工具。把這些工具量出的 FLOPs 與記憶體流量換算成 arithmetic intensity，就能把實測點畫回 Roofline 圖，親眼看到自己的程式是 compute-bound 還是 memory-bound。',
  },
  code: {
    lang: 'cpp',
    code: `#include <benchmark/benchmark.h>

#include <cmath>
#include <vector>

// [1] 待測函式：對一個 vector 做逐元素平方根加總。
//     刻意讓它「有副作用地」回傳結果，方便呼叫端用 DoNotOptimize 固定它。
double SumSqrt(const std::vector<double>& data) {
    double acc = 0.0;
    for (double x : data) {
        acc += std::sqrt(x);
    }
    return acc;
}

// [2] 反例（僅供對照，未註冊）：若把 acc 宣告在迴圈內且未使用回傳值，
//     編譯器在 -O2/-O3 下很可能整段迴圈視為死碼直接刪除。
static void BM_SumSqrt_Naive(benchmark::State& state) {
    std::vector<double> data(state.range(0), 2.0);
    for (auto _ : state) {
        SumSqrt(data);  // 回傳值被丟棄，最佳化器有權把呼叫連同迴圈本體一起消除
    }
}

// [3] 正確作法：用 DoNotOptimize 告訴編譯器「這個值之後仍會被用到」，
//     強迫它保留計算過程，不能整段最佳化掉。
static void BM_SumSqrt_Correct(benchmark::State& state) {
    std::vector<double> data(state.range(0), 2.0);
    for (auto _ : state) {
        double result = SumSqrt(data);
        benchmark::DoNotOptimize(result);  // [4]
    }
}

// [5] 若待測函式會透過指標／記憶體寫入產生副作用（而非回傳值），
//     額外呼叫 ClobberMemory 強迫編譯器把暫存器內容真的寫回記憶體，
//     避免整批寫入被合併或延後到計時區間之外。
static void BM_VectorFill_Correct(benchmark::State& state) {
    std::vector<double> data(state.range(0));
    for (auto _ : state) {
        for (auto& x : data) {
            x = std::sqrt(x + 1.0);
        }
        benchmark::ClobberMemory();  // [6]
    }
}

BENCHMARK(BM_SumSqrt_Naive)->Range(1 << 10, 1 << 16);
BENCHMARK(BM_SumSqrt_Correct)->Range(1 << 10, 1 << 16);
BENCHMARK(BM_VectorFill_Correct)->Range(1 << 10, 1 << 16);

BENCHMARK_MAIN();`,
    callouts: [
      { n: 1, text: '待測函式本身有明確的資料相依鏈（累加），本身不易被消除，但呼叫端若丟棄回傳值仍可能被整段刪除。' },
      { n: 2, text: '這是常見錯誤示範：回傳值未使用時，最佳化器可以合法地把整個迴圈與函式呼叫都視為無副作用而刪除。' },
      { n: 3, text: '把回傳值存起來，並用 DoNotOptimize 標記，讓編譯器認為之後還會用到這個值，不能消去計算。' },
      { n: 4, text: 'DoNotOptimize 的實作通常是把值綁到一個內嵌組語的假讀取，強迫其真正被計算並保留在暫存器或記憶體中。' },
      { n: 5, text: '對於「透過寫入陣列產生副作用」而非「回傳單一值」的函式，DoNotOptimize 不夠，需要另一種手段涵蓋整塊記憶體。' },
      { n: 6, text: 'ClobberMemory 插入一個編譯器記憶體屏障，強迫所有先前的寫入真的落地，避免被延後或與計時窗口重疊。' },
    ],
  },
  deepDive: [
    {
      heading: '微基準的三大陷阱：死碼消除、暖身、統計嚴謹性',
      body:
        '第一個陷阱是死碼消除（dead-code elimination）。編譯器的最佳化器以「可觀察行為」為準：如果一段計算的結果從未被讀取、寫入全域狀態或影響輸出，它在語意上等同於什麼都沒做，編譯器有權（也通常會）把整段程式碼刪除。在微基準情境下，這代表你精心寫的迴圈可能被壓縮成一個空迴圈甚至完全消失，量到的時間變成「什麼都沒做」的時間，卻誤以為是真實工作負載的成本。\n\n第二個陷阱是暖身不足。第一次執行某段程式碼時，指令與資料多半不在快取中，分支預測器也還沒學到模式，CPU 可能還處於較低的頻率狀態（尤其筆電或雲端 VM 上的 turbo boost 需要時間爬升）。若直接量測第一次迭代，得到的數字反映的是「冷啟動」成本而非穩態效能。正確做法是先執行若干次暖身迭代（不計入結果），讓快取、分支預測器與頻率都進入穩態後再開始計時。\n\n第三個陷阱是統計方法錯誤：只跑一次、只取平均數。真實環境有雜訊來源——作業系統排程、其他行程搶佔、記憶體刷新、溫度節流——這些會產生長尾的偶發峰值。平均數對離群值敏感，會被少數幾次異常拖高；中位數（median）對雜訊更穩健，是效能量測的慣用統計量。應該重複執行基準多次（Google Benchmark 預設會依變異度自動決定重複次數），並報告中位數與變異範圍，而非單次平均。',
    },
    {
      heading: 'Google Benchmark：DoNotOptimize 與 ClobberMemory 的正確用法',
      body:
        'Google Benchmark 提供 `benchmark::DoNotOptimize(value)`，其實作通常是把 `value` 的位址綁進一段內嵌組語，並標記為「可能被讀取」，藉此欺騙最佳化器：它必須假設這段組語可能以未知方式使用了 `value`，因此不能證明計算是無副作用的，也就不能刪除。這對「回傳單一值」的函式最有效——把回傳值傳給 `DoNotOptimize` 即可固定整條計算鏈。\n\n`benchmark::ClobberMemory()` 解決的是另一個問題：當待測程式碼透過寫入記憶體（例如填充一個 `std::vector` 或修改全域緩衝區）產生副作用時，光靠 `DoNotOptimize` 標記某個純量不足以涵蓋整塊記憶體。`ClobberMemory` 插入一個編譯器層級的記憶體屏障（隱含 `"memory"` clobber），強迫編譯器把所有暫存器中尚未寫回的資料真正寫入記憶體，也阻止它把寫入操作重排到計時區間之外或與其他迭代合併。兩者的分工原則很清楚：回傳值用 `DoNotOptimize` 固定，寫入副作用用 `ClobberMemory` 固定；許多實務基準會兩者並用，先標記回傳值再插入記憶體屏障，確保計時窗口內量到的就是真正發生的工作量。\n\n此外，Google Benchmark 內建了「自動重複到統計穩定為止」的機制、`--benchmark_repetitions` 控制重跑次數以計算中位數與標準差，以及 `state.PauseTiming()/ResumeTiming()` 可以把每次迭代中的資料準備（不該計時的部分）排除在計時窗口之外，避免把「建置測資的時間」誤算進「待測程式碼的時間」。',
    },
    {
      heading: '剖析工具的定位：perf、VTune、LIKWID、rocprof',
      body:
        'Linux `perf` 是最通用、幾乎在所有 Linux 環境都能用的取樣剖析器：`perf record -g` 定期中斷程式擷取呼叫堆疊，`perf report` 彙整出各函式的時間佔比，`perf stat` 則直接讀取硬體效能計數器（PMU），一次列出 IPC、快取未命中率、分支預測失敗率等關鍵指標。它的優點是無所不在、負擔低，適合作為「第一步：熱點在哪」的工具，但對微架構層級的細節（例如某段程式碼究竟是被前端解碼卡住還是被記憶體延遲卡住）解讀能力有限。\n\nIntel VTune Profiler 則專攻微架構瓶頸分析：它以「Top-Down Microarchitecture Analysis」方法，把 CPU 週期系統性地歸類為 Front-End Bound、Back-End Bound、Bad Speculation、Retiring 四大類，能明確告訴你一段熱路徑究竟是卡在指令擷取、執行埠爭用、分支誤判還是記憶體階層，對 Intel 硬體的支援最完整、視覺化介面也最成熟，代價是商業授權且僅在 Intel 平台上發揮全部能力。\n\nLIKWID（Like I Knew What I'm Doing）是一套輕量的命令列工具與函式庫，聚焦於直接、精準地讀取硬體效能計數器，常見用法是 `likwid-perfctr -g MEM_DP -C 0-7 ./app`，可直接量出某段程式碼的 FLOPs 與記憶體頻寬，非常適合手動驗證 Roofline 模型中的兩個座標軸；它的哲學是「開銷小、數字準確、不強加額外的視覺化框架」，很適合嵌入既有的 HPC benchmark 腳本。\n\n`rocprof` 是 AMD ROCm 生態系中對應 GPU 核心（kernel）的剖析工具，用於量測在 AMD GPU 上執行的 HIP／OpenCL 核心的執行時間、佔用率（occupancy）、記憶體流量與硬體計數器，角色類似 NVIDIA 生態系中的 `nsight compute`。當工作負載已經搬到 GPU 上，CPU 端的 perf／VTune／LIKWID 就看不到核心內部發生了什麼，必須換成 `rocprof`（或對應的 NVIDIA 工具）才能剖析 GPU 執行的細節。',
    },
    {
      heading: 'Roofline 實測：把硬體計數器換算成 AI 與可達效能',
      body:
        '要把一個真實核心（kernel）標到 Roofline 圖上，需要兩個實測數字：橫軸的 arithmetic intensity（AI）與縱軸的可達效能。算 AI 的分子是核心執行期間完成的浮點運算總數，可以用 LIKWID 的 `FLOPS_DP`／`FLOPS_SP` 效能群組直接讀取硬體浮點運算計數器，也可以用 `perf stat -e fp_arith_inst_retired.*`（Intel 平台的細分事件）估算；分母是核心搬運的位元組數，用記憶體控制器計數器（如 LIKWID 的 `MEM` 群組、`perf stat -e uncore_imc/...`）量出實際讀寫的 DRAM 流量。兩者相除得到實測 AI = 總 FLOPs / 總 bytes，這是「這個核心真正做了什麼」而非教科書推算值。\n\n縱軸的可達效能同樣直接來自計數器：把總 FLOPs 除以核心的實際執行時間（wall-clock 或計數器提供的週期數除以頻率），得到實測 GFLOP/s。把峰值算力（廠商公告或用密集 FMA 微基準逼近）與峰值頻寬（用 STREAM Triad 實測）畫成 Roofline 的兩條邊界線後，再把 `(AI, 實測 GFLOP/s)` 這個點標上去：如果這個點落在頻寬斜線附近，代表核心已經把頻寬用到接近極限，是 memory-bound，優化方向是減少記憶體流量（迴圈融合、blocking、提高資料重用）；如果點落在算力水平線附近，代表已經逼近算力峰值，是 compute-bound，優化方向是提升向量化寬度或減少非必要運算；如果點離兩條線都還有明顯差距（常見情況），代表瓶頸不是硬體上限本身，而是實作缺陷——例如向量化未開啟、存取模式造成額外快取未命中、或執行緒間存在同步開銷侵蝕了理論可用的頻寬與算力。這正是「先建模、再量測、再對照」這條完整流程的收尾：沒有這一步，Roofline 永遠只是紙上談兵。',
    },
  ],
  pitfalls: [
    '忘記用 `DoNotOptimize`／`ClobberMemory`，讓待測迴圈的結果從未被使用，整段被最佳化器刪除，量到的其實是空迴圈的時間。',
    '沒有固定 CPU 頻率（關閉 turbo boost、鎖定 governor 為 performance），導致同一段程式碼在不同次執行間得到差異巨大的數字。',
    '迭代次數太少、未做暖身，量到的是冷快取／冷分支預測器狀態下的成本，而非穩態下的真實效能。',
    '只看平均數而不看中位數與變異範圍，被少數幾次因排程搶佔或溫度節流造成的離群值嚴重誤導。',
    '在 CPU 端用 perf／VTune／LIKWID 剖析已經搬到 GPU 上執行的核心，看不到任何有意義的熱點，卻誤以為程式沒有瓶頸。',
  ],
  bestPractices: [
    '對每個微基準都明確標記結果：回傳值用 `benchmark::DoNotOptimize`，記憶體寫入副作用用 `benchmark::ClobberMemory`。',
    '量測前鎖定 CPU 頻率、關閉 turbo boost、綁定核心親和性（`taskset`／`numactl`），把環境雜訊降到最低。',
    '用 `perf stat` 或 `perf record -g` 做第一輪「熱點在哪」的快速篩選，再視情況上 VTune 做微架構層級的深入分析。',
    '用 LIKWID 直接量出目標核心的 FLOPs 與記憶體流量，換算成 arithmetic intensity 後標回 Roofline 圖，用實測點而非理論估算驗證瓶頸類型。',
    '報告基準結果時附上中位數與重複次數（如 Google Benchmark 的 `--benchmark_repetitions`），而不是單次平均值。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '在 Google Benchmark 中，若一個被測函式的回傳值從未被使用，最可能發生什麼問題？',
      options: [
        { id: 'a', text: '編譯器會拒絕編譯' },
        { id: 'b', text: '編譯器可能合法地把整段計算視為無副作用而刪除，導致量到接近零的空迴圈時間' },
        { id: 'c', text: '基準會自動變慢十倍以做懲罰' },
        { id: 'd', text: 'Google Benchmark 會自動幫忙加上 DoNotOptimize' },
      ],
      correctOptionId: 'b',
      explanation:
        '最佳化器以「可觀察行為」為準：沒有人讀取的計算結果在語意上等同於未執行，因此可以被合法刪除。必須用 `benchmark::DoNotOptimize` 明確標記回傳值，才能強迫編譯器保留計算。',
    },
    {
      id: 'q2',
      stem: '`benchmark::DoNotOptimize` 與 `benchmark::ClobberMemory` 的分工差異是什麼？',
      options: [
        { id: 'a', text: '兩者完全相同，可以互換使用' },
        { id: 'b', text: 'DoNotOptimize 固定單一回傳值不被消除，ClobberMemory 強迫先前的記憶體寫入真正落地，兩者常搭配用於不同型態的副作用' },
        { id: 'c', text: 'DoNotOptimize 只能在 GPU 上使用' },
        { id: 'd', text: 'ClobberMemory 會讓程式執行得更快' },
      ],
      correctOptionId: 'b',
      explanation:
        'DoNotOptimize 適合固定「回傳單一值」型態的計算，ClobberMemory 插入記憶體屏障，適合固定「透過寫入緩衝區產生副作用」型態的計算，兩者分工互補而非互相替代。',
    },
    {
      id: 'q3',
      stem: '若要把一個 CPU 核心（kernel）的實測結果標到 Roofline 圖上，橫軸 arithmetic intensity 應該如何計算？',
      options: [
        { id: 'a', text: '核心的執行時間除以核心數' },
        { id: 'b', text: '核心執行期間完成的總浮點運算數，除以核心搬運的總位元組數（可用 LIKWID 等硬體計數器工具量測）' },
        { id: 'c', text: '編譯器最佳化等級的高低' },
        { id: 'd', text: '核心的原始碼行數除以函式呼叫次數' },
      ],
      correctOptionId: 'b',
      explanation:
        'Arithmetic intensity 的定義是「總浮點運算數 / 總搬運位元組數」，兩者都需要用硬體效能計數器（如 LIKWID 的 FLOPS 與 MEM 群組）在核心實際執行期間量測，而非用原始碼特徵或編譯選項估算。',
    },
  ],
  diagram: {
    key: 'amdahl-curve',
    caption:
      '量測是把理論加速曲線落地成事實的唯一途徑：沒有經過 DoNotOptimize／固定頻率／中位數統計把關的基準數字，連拿來檢驗 Amdahl 或 Roofline 上限的資格都沒有。',
  },
  tryIt: {
    code: `#include <chrono>
#include <cmath>
#include <iostream>
#include <vector>

// 簡易示範：手刻的「防死碼消除」寫法，概念與 benchmark::DoNotOptimize 相同。
// 用 volatile sink 強迫編譯器保留計算結果，避免整段迴圈被最佳化掉。
double SumSqrt(const std::vector<double>& data) {
    double acc = 0.0;
    for (double x : data) {
        acc += std::sqrt(x);
    }
    return acc;
}

int main() {
    std::vector<double> data(1'000'000, 2.0);
    volatile double sink = 0.0;  // 防止整段被刪除

    // 暖身：先跑幾次讓快取與分支預測器進入穩態，結果不計入統計。
    for (int i = 0; i < 3; ++i) {
        sink = SumSqrt(data);
    }

    auto t0 = std::chrono::steady_clock::now();
    double result = SumSqrt(data);
    sink = result;
    auto t1 = std::chrono::steady_clock::now();

    std::cout << "elapsed = " << std::chrono::duration<double, std::milli>(t1 - t0).count()
              << " ms, result = " << result << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Google Benchmark (GitHub)',
      href: 'https://github.com/google/benchmark',
      description: '官方原始碼與 User Guide，涵蓋 DoNotOptimize、ClobberMemory 與統計重複的完整用法。',
    },
    {
      title: 'Linux perf Examples (Brendan Gregg)',
      href: 'https://www.brendangregg.com/perf.html',
      description: 'perf record/report/stat 的實務範例與火焰圖工作流程。',
    },
    {
      title: 'Intel VTune Profiler Documentation',
      href: 'https://www.intel.com/content/www/us/en/docs/vtune-profiler/user-guide/current/overview.html',
      description: 'VTune 的 Top-Down 微架構分析方法與各分析類型說明。',
    },
    {
      title: 'LIKWID (GitHub)',
      href: 'https://github.com/RRZE-HPC/likwid',
      description: '輕量硬體計數器工具集，含 likwid-perfctr 的 FLOPS／MEM 效能群組，適合手動驗證 Roofline 座標。',
    },
    {
      title: 'AMD ROCm rocprof Documentation',
      href: 'https://rocm.docs.amd.com/projects/rocprofiler/en/latest/',
      description: 'AMD GPU 核心剖析工具 rocprof 的官方文件。',
    },
  ],
};

export default ind19MeasurementProfiling;
