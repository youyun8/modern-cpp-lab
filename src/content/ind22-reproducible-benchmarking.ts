import type { ChapterContent } from '@/types/ChapterContent';

const ind22ReproducibleBenchmarking: ChapterContent = {
  slug: 'ind22-reproducible-benchmarking',
  chapterLabel: '第 22 章',
  title: '效能可重現性與基準紀律',
  group: 'N · 第六部：效能工程',
  description:
    '論文級量測方法：重複次數、統計顯著性與信賴區間，跨節點 variance、DVFS／C-state 的干擾與排除。',
  concept: {
    standard: 'C++17',
    body:
      '一個「基準測試（benchmark）」的可信度不是取決於用了多快的計時器，而是取決於能否被別人在別的機器上重現出相近的結論。工業級與論文級的效能量測要求：重複多次執行以取得樣本分佈，而不是單次執行的一個數字；對樣本計算信賴區間，明確表達量測的不確定性；辨識並控制環境雜訊來源——CPU turbo boost／DVFS、C-state、NUMA、作業系統排程器搶佔、其他行程的資源競爭；並且用固定、可重複的環境設定（`numactl`、CPU pinning、隔離核心）把「今天量到的數字」與「明天在另一台機器上量到的數字」放在同一個可比較的基礎上。本章把這套紀律講清楚：怎麼算重複次數與信賴區間、HPC 叢集上的變異來源、如何關閉／固定頻率相關的干擾，以及如何用作業系統機制把量測環境釘死。',
  },
  code: {
    lang: 'cpp',
    code: `#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdio>
#include <functional>
#include <numeric>
#include <vector>

// A minimal, dependency-free benchmarking harness: run a callable N times,
// discard a warm-up prefix, and report mean +/- a normal-approximation
// 95% confidence interval as well as the median.
struct BenchStats {
    double mean_ns;
    double ci95_halfwidth_ns;  // mean +/- this = 95% CI
    double median_ns;
    double stddev_ns;
    std::size_t n;
};

template <typename Fn>
BenchStats benchmark(Fn&& fn, std::size_t warmup_iters,  // [1]
                     std::size_t measured_iters) {
    // Warm-up: fills caches/branch predictors and lets DVFS/turbo settle
    // into a steady state before any timing is recorded.  Discarded.
    for (std::size_t i = 0; i < warmup_iters; ++i) {  // [2]
        fn();
    }

    std::vector<double> samples_ns;
    samples_ns.reserve(measured_iters);
    for (std::size_t i = 0; i < measured_iters; ++i) {
        auto const t0 = std::chrono::steady_clock::now();  // [3]
        fn();
        auto const t1 = std::chrono::steady_clock::now();
        double const ns = std::chrono::duration<double, std::nano>(t1 - t0).count();
        samples_ns.push_back(ns);
    }

    double const sum = std::accumulate(samples_ns.begin(), samples_ns.end(), 0.0);
    double const mean = sum / static_cast<double>(samples_ns.size());  // [4]

    double sq_diff_sum = 0.0;
    for (double const v : samples_ns) {
        double const d = v - mean;
        sq_diff_sum += d * d;
    }
    double const variance = sq_diff_sum / static_cast<double>(samples_ns.size() - 1);
    double const stddev = std::sqrt(variance);

    // Normal-approximation 95% CI on the sample mean: mean +/- 1.96 * SEM.
    // Valid once measured_iters is reasonably large (CLT); for small n or
    // skewed timing distributions prefer a bootstrap CI instead.          // [5]
    double const sem = stddev / std::sqrt(static_cast<double>(samples_ns.size()));
    double const ci95_halfwidth = 1.96 * sem;

    std::vector<double> sorted_ns = samples_ns;
    std::sort(sorted_ns.begin(), sorted_ns.end());
    double const median = sorted_ns[sorted_ns.size() / 2];  // [6]

    return BenchStats{mean, ci95_halfwidth, median, stddev, samples_ns.size()};
}

int main() {
    auto const work = []() {
        volatile long acc = 0;
        for (int i = 0; i < 100000; ++i) {
            acc += i;
        }
    };

    BenchStats const stats = benchmark(work, /*warmup_iters=*/50,
                                       /*measured_iters=*/500);

    std::printf("n=%zu  mean=%.1f ns  95%% CI=+/-%.1f ns  median=%.1f ns  stddev=%.1f ns\\n",
                stats.n, stats.mean_ns, stats.ci95_halfwidth_ns, stats.median_ns, stats.stddev_ns);
    return 0;
}`,
    callouts: [
      { n: 1, text: '把 warm-up 次數與正式量測次數分開當參數，強迫呼叫端明確決定兩者，而不是憑感覺跑幾次就當數字。' },
      { n: 2, text: '暖機迴圈的結果完全丟棄：目的只是讓 cache、分支預測器、以及（若未事先鎖定）turbo/DVFS 頻率進入穩定狀態，暖機期間量到的時間不具代表性。' },
      { n: 3, text: '使用 steady_clock（單調時鐘）而非 system_clock，避免系統時間校正（NTP）造成的時間跳動污染量測。' },
      { n: 4, text: '記錄每一次獨立重複的時間到向量中，之後才做統計；絕不只跑一次就回報「這是效能數字」。' },
      { n: 5, text: '常態近似信賴區間假設樣本平均數近似常態分布（中央極限定理），對量測次數足夠多、雜訊非極端偏態時堪用；小樣本或長尾分布（例如受排程器搶佔影響的少數離群值）更適合用 bootstrap 重抽樣估計信賴區間。' },
      { n: 6, text: '中位數對離群值（例如被 OS 排程器搶佔一次而暴增的個別樣本）比平均數更穩健，兩者一起回報能看出分布是否偏態。' },
    ],
  },
  deepDive: [
    {
      heading: '重複次數、統計顯著性與信賴區間',
      body:
        '單次執行得到的一個數字不是「效能」，它只是效能分布上的一個隨機樣本點。把兩個實作各跑一次、比較兩個數字何者較小，這件事在統計上沒有意義——差異可能完全落在量測雜訊的範圍內。正確做法是把每個配置獨立重複執行 N 次（N 通常從幾十到數百，視變異程度而定），得到一個樣本分布，再對這個分布計算摘要統計量與不確定性區間。\n\n最常見的兩種信賴區間算法：（一）常態近似——計算樣本平均數 `mean`、樣本標準差 `stddev`，標準誤 `SEM = stddev / sqrt(n)`，95% 信賴區間近似為 `mean ± 1.96 * SEM`；這仰賴中央極限定理，在 n 夠大且分布不極端偏態時相當可靠。（二）Bootstrap（拔靴法）——對原始樣本做大量次數（例如 10000 次）的「有放回抽樣」重建新樣本集，計算每次重抽樣的平均數，再取這些平均數分布的 2.5% 與 97.5% 分位數作為信賴區間邊界；這個方法不假設任何母體分布形狀，對執行時間常見的右偏長尾（少數樣本因排程器搶佔而異常慢）更穩健。\n\n判斷兩個配置的效能差異是否「統計顯著」，最起碼的檢驗是看兩者的信賴區間是否重疊：若重疊，現有樣本數不足以區分兩者的差異與雜訊；若要嚴謹一點，可以用 Welch\'s t-test（不假設兩組變異數相同）或非參數的 Mann–Whitney U 檢定。發表或對外回報效能數字時，只寫一個平均數而不附上任何離散度或信賴區間，是最常見、也最容易讓人誤信的做法。',
    },
    {
      heading: '跨節點 variance 與 warm-up：HPC 叢集特有的雜訊來源',
      body:
        'HPC 叢集上量測的「同一份程式碼」在不同節點、甚至同一節點的不同次執行之間，效能可以有可觀的變異，原因包括：（一）silicon lottery——同一型號 CPU 因製程差異，實際能維持的 turbo 頻率、功耗牆下的降頻行為並不完全相同，不同節點的「同款」晶片跑分可能有百分之幾到十幾的差距；（二）熱狀態（thermal state）——節點若剛跑完其他高負載工作、機房散熱不均、風扇轉速調節延遲，晶片起始溫度不同會影響能撐多久的 turbo 頻率；（三）共享互連（interconnect）競爭——多節點程式若使用共享的網路交換器或儲存系統，其他使用者的流量會造成非預期的延遲尖峰，即使被測程式本身是單節點運算為主；（四）NUMA 與記憶體通道分佈——同型節點若記憶體插槽populate方式不同，實際可用頻寬會有差異。\n\n因此嚴謹的 HPC 基準流程一律要求：同一組實驗在多個節點上重複（而不只是同一節點跑多次），把「節點間變異」與「節點內執行間變異」分開回報；並且在每次測量前先跑足夠長的暖機（warm-up）迭代，讓時脈、cache、TLB 等進入穩定狀態後才開始計時——正式量測階段前幾次迭代的時間往往明顯偏高或偏低，直接混入正式樣本會拉偏平均數與信賴區間。實務上常見的作法是暖機時間占正式量測時間的 10%~30%，並在暖機結束後再檢查一次時間序列是否已經「打平」（沒有明顯的下降或上升趨勢）才開始記錄。',
    },
    {
      heading: 'Turbo / DVFS、C-state 與 thermal throttling：頻率層級的雜訊源',
      body:
        '現代 CPU 幾乎都支援 Intel Turbo Boost／AMD Precision Boost 之類的動態超頻，以及 DVFS（Dynamic Voltage and Frequency Scaling，依負載動態調整電壓與頻率）：核心數愈少同時活躍、溫度與功耗餘裕愈大，時脈可以衝得愈高；反之核心全開、溫度逼近上限時，時脈會被動態下調（thermal throttling）。這代表「同一段程式碼」在單執行緒跑與多執行緒同時跑、在剛開機的冷機狀態跑與已經跑了一小時的熱機狀態跑，實際運行頻率可能相差 20% 以上，量出來的時間自然天差地遠——而這種差異跟程式碼寫得好不好完全無關，純粹是頻率浮動造成的雜訊。\n\nC-state（CPU 閒置省電狀態）是另一個干擾源：核心閒置時會進入愈來愈深的省電狀態（C1、C1E、C6…），愈深的 C-state 喚醒延遲愈高，若基準程式在迭代之間有短暫的閒置（例如等待其他執行緒、I/O），核心可能掉進深層 C-state，下一次喚醒時的延遲尖峰會污染量測，尤其是量測「延遲」而非「吞吐量」的場景。\n\n消除這些干擾的具體作法：在 BIOS／韌體層級或以 `cpupower frequency-set` 停用 turbo（或將最高頻率鎖定在額定基頻），把 `scaling_governor` 設為 `performance`（而非 `powersave`／`ondemand`，避免頻率隨負載忽高忽低），並以 `cpupower idle-set -D <us>` 或核心開機參數 `intel_idle.max_cstate=1`／`processor.max_cstate=1` 限制可進入的最深 C-state，讓核心維持在淺層甚至持續啟用（不進入省電狀態）。這些手段的共同目標是讓「時脈是多少」變成一個實驗中固定的已知量，而不是隨機變數。',
    },
    {
      heading: '環境固定：numactl、CPU pinning 與隔離核心',
      body:
        '就算頻率被鎖定，作業系統排程器仍然可能把量測用的執行緒在不同核心之間搬移，或讓其他行程（背景服務、cron job、甚至核心的 workqueue）搶佔正在計時的核心，造成偶發的延遲尖峰；在 NUMA 機器上，執行緒若被排到與其存取記憶體不同的 NUMA 節點，記憶體存取延遲會顯著升高且不穩定。控制這些變數的標準做法：\n\n用 `numactl --cpunodebind=<node> --membind=<node> ./benchmark` 把行程與其配置的記憶體都固定在同一個 NUMA 節點，避免跨節點記憶體存取造成的延遲與變異；用 `taskset -c <core-list>` 或程式內呼叫 `pthread_setaffinity_np` 把個別執行緒釘死在指定的邏輯核心（CPU pinning），確保每次執行使用的都是同一批核心，避免排程器隨機搬移執行緒造成的 cache/TLB 冷啟動與變異；用開機參數 `isolcpus=<core-list>` 或 cgroup／`cpuset` 機制把一組核心從一般排程器的核心集合中隔離出來，讓一般行程與中斷（irq）都不會被排到這些核心上，只保留給基準測試獨佔使用，把「別人偷走我的 CPU 時間片」這個雜訊源徹底消除。\n\n把這幾層疊起來（鎖頻 + 停用深層 C-state + numactl + CPU pinning + isolcpus/cpuset），才能得到一個「今天跑」與「明天跑」、「這台機器跑」與「那台機器跑」在統計意義上可比較的乾淨量測環境；報告效能數字時，也應該把這些環境設定（CPU 型號、頻率鎖定值、NUMA 拓樸、核心隔離範圍、作業系統與核心版本）一併寫進方法論章節，讓讀者能重現，而不只是附上一張「我們比較快」的長條圖。',
    },
  ],
  pitfalls: [
    '只跑一次就把得到的數字當成「這個實作的效能」，並據此下結論說「A 比 B 快」。',
    '在不同天、不同節點、甚至不同背景負載下量測兩個要比較的配置，卻假設環境是一致的。',
    '沒有鎖定 turbo/頻率governor，導致同一支程式在不同次執行中量到差異達兩位數百分比的時間，卻誤以為是程式碼本身的隨機性。',
    '把暖機階段的樣本混進正式統計，讓 cache/TLB 冷啟動與頻率爬升的偏差污染平均數與信賴區間。',
    '只回報平均數而不附上任何離散度（標準差、信賴區間）或樣本數，讓讀者無法判斷差異是否具有統計意義。',
  ],
  bestPractices: [
    '每個配置至少重複數十到數百次獨立量測，回報平均數／中位數並附上信賴區間（常態近似或 bootstrap），而不是單一數字。',
    '量測前先跑足夠的暖機迭代並丟棄，確認時間序列已趨於穩定後再開始正式計時。',
    '鎖定 CPU 頻率（停用 turbo、governor 設為 performance）並限制深層 C-state，把頻率浮動排除在雜訊來源之外。',
    '用 `numactl`、CPU pinning（`taskset`/`pthread_setaffinity_np`）與 `isolcpus`/cpuset 把基準測試釘在固定且獨佔的核心與 NUMA 節點上。',
    '在報告或論文的方法論章節中完整記錄硬體型號、頻率鎖定設定、作業系統版本、核心隔離範圍與重複次數，讓結果可被他人重現與驗證。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '為什麼「只跑一次程式並記錄時間」不足以支持「A 實作比 B 實作快」這樣的結論？',
      options: [
        { id: 'a', text: '因為 C++ 編譯器不允許只執行一次的迴圈' },
        { id: 'b', text: '單次執行的時間是效能分布上的一個隨機樣本，可能落在雜訊範圍內；沒有多次重複與信賴區間，無法判斷觀察到的差異是真實差異還是量測雜訊' },
        { id: 'c', text: '單次執行一定會比多次執行慢，所以數字沒有代表性' },
        { id: 'd', text: '因為 std::chrono 的精度不足以量測一次執行' },
      ],
      correctOptionId: 'b',
      explanation:
        '執行時間受 turbo/DVFS、排程器搶佔、cache 狀態等多重雜訊源影響而在多次執行間波動；只有透過多次重複取得樣本分布並計算信賴區間，才能判斷兩個配置之間的差異是否超出雜訊範圍、具有統計意義。',
    },
    {
      id: 'q2',
      stem: '在 HPC 叢集上量測同一支程式，發現不同節點跑出的時間有明顯差異，下列哪一項最不可能是原因？',
      options: [
        { id: 'a', text: '不同節點的 CPU 因製程差異（silicon lottery）能維持的實際 turbo 頻率不同' },
        { id: 'b', text: '節點目前的熱狀態不同，影響可持續的 boost 頻率' },
        { id: 'c', text: '節點間共享的網路互連或儲存系統受到其他使用者流量的競爭' },
        { id: 'd', text: 'C++ 標準規定同一份原始碼在不同機器上編譯後執行時間必須相同' },
      ],
      correctOptionId: 'd',
      explanation:
        'C++ 標準完全不對執行時間做任何跨機器一致性的保證；執行時間是硬體、作業系統排程、散熱、頻率調節與環境負載共同決定的結果，這正是需要用統計方法與環境固定手段去控制與量化的原因。',
    },
    {
      id: 'q3',
      stem: '`isolcpus`（或等效的 cpuset 隔離）在效能可重現性中扮演的角色是什麼？',
      options: [
        { id: 'a', text: '讓 CPU 自動提高 turbo 頻率' },
        { id: 'b', text: '把一組核心從一般排程器的核心集合中移除，使一般行程與中斷不會排到這些核心，讓基準測試獨佔使用，避免被其他行程搶佔造成的延遲尖峰' },
        { id: 'c', text: '取代 numactl，自動把記憶體綁定到正確的 NUMA 節點' },
        { id: 'd', text: '強制關閉所有 C-state，效果與鎖頻完全相同' },
      ],
      correctOptionId: 'b',
      explanation:
        'isolcpus（或用 cgroup/cpuset 做等效隔離）的作用是把指定核心從一般排程範圍中排除，讓一般行程與硬體中斷都不會被排程到這些核心，只保留給基準測試獨佔使用，藉此消除「被其他工作偷走 CPU 時間片」造成的隨機延遲尖峰；它與記憶體綁定（numactl 的職責）及頻率/C-state 控制是互補但不同的機制。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['固定環境', '暖機並丟棄', '多次重複量測', '計算信賴區間', '回報統計顯著性'],
    caption:
      '一個可重現的基準測試流程：先用 numactl／CPU pinning／isolcpus／鎖頻把環境固定下來，跑一段暖機後丟棄，再進行多次獨立重複量測，對樣本計算信賴區間，最後回報帶有不確定性區間的統計結果，而不是單一數字。',
  },
  tryIt: {
    code: `#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdio>
#include <numeric>
#include <vector>

// Simplified: run a workload 200 times (after 20 warm-up runs) and print
// mean +/- a normal-approximation 95% confidence interval.
int main() {
    auto const work = []() {
        volatile long acc = 0;
        for (int i = 0; i < 50000; ++i) {
            acc += i;
        }
    };

    for (int i = 0; i < 20; ++i) {
        work();  // warm-up, discarded
    }

    std::vector<double> samples_ns;
    for (int i = 0; i < 200; ++i) {
        auto const t0 = std::chrono::steady_clock::now();
        work();
        auto const t1 = std::chrono::steady_clock::now();
        samples_ns.push_back(std::chrono::duration<double, std::nano>(t1 - t0).count());
    }

    double const mean = std::accumulate(samples_ns.begin(), samples_ns.end(), 0.0) /
                        static_cast<double>(samples_ns.size());
    double sq_diff_sum = 0.0;
    for (double const v : samples_ns) {
        sq_diff_sum += (v - mean) * (v - mean);
    }
    double const stddev = std::sqrt(sq_diff_sum / (samples_ns.size() - 1));
    double const ci95 = 1.96 * stddev / std::sqrt(static_cast<double>(samples_ns.size()));

    std::printf("mean=%.1f ns  95%% CI=+/-%.1f ns  (n=%zu)\\n", mean, ci95, samples_ns.size());
    return 0;
}`,
  },
  furtherReading: [
    {
      title: "How NOT to Measure Latency (Gil Tene, Azul Systems)",
      href: 'https://www.youtube.com/watch?v=lJ8ydIuPFeU',
      description: '經典演講，講解為何常見的延遲量測方法系統性低估尾端延遲，以及如何正確思考量測方法論。',
    },
    {
      title: 'cpupower(1) — Linux manual page',
      href: 'https://man7.org/linux/man-pages/man1/cpupower.1.html',
      description: '查詢與設定 CPU 頻率 governor、turbo 開關的官方工具與參數說明。',
    },
    {
      title: 'numactl(8) — Linux manual page',
      href: 'https://man7.org/linux/man-pages/man8/numactl.8.html',
      description: '把行程與記憶體綁定到特定 NUMA 節點的官方參考，控制跨節點記憶體存取變異的關鍵工具。',
    },
    {
      title: 'Google Benchmark — User Guide (Statistics)',
      href: 'https://github.com/google/benchmark/blob/main/docs/user_guide.md',
      description: 'Google Benchmark 官方文件，說明重複執行、統計摘要與如何解讀基準測試輸出的信賴度。',
    },
  ],
};

export default ind22ReproducibleBenchmarking;
