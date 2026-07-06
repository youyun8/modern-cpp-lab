import type { ChapterContent } from '@/types/ChapterContent';

const ind03ConcurrencyVsParallelism: ChapterContent = {
  slug: 'ind03-concurrency-vs-parallelism',
  chapterLabel: '第 3 章',
  title: '並行 vs 平行、任務 vs 資料平行',
  group: 'H · 第零部：先修與心智模型',
  description: 'Concurrency 與 Parallelism 的本質區別、latency-bound vs throughput-bound，以及 SPMD、fork-join、BSP 等 HPC 常見拓撲。',
  concept: {
    standard: 'C++20',
    body:
      'Concurrency（並行）與 parallelism（平行）常被混用，但在 HPC／系統工程上是兩個不同的軸：concurrency 描述程式的「結構」是否由多個可獨立推進、可交錯執行的任務組成（單核心以時間切片模擬也算），而 parallelism 描述「執行」是否真的同時發生在多個實體運算單元上。並行是設計問題（如何拆解、如何同步），平行是效能問題（如何用更多硬體資源縮短時間）。可以並行但不平行（單核心多執行緒），也可以平行但幾乎不並行（SIMD 對單一迴圈做資料平行、邏輯上仍是一條控制流）。三種常見平行範式為任務平行（task parallelism，不同程式碼做不同工作）、資料平行（data parallelism，相同運算套用到不同資料切片）、管線平行（pipeline parallelism，資料流過一連串固定階段，各階段同時處理不同批次）。HPC 程式常見的拓撲則是 SPMD（Single Program, Multiple Data）、fork-join，以及 bulk-synchronous parallel（BSP）；C++11 的 `std::async`／`std::thread` 對應 fork-join，C++20 的 `std::barrier` 則直接對應 BSP 的「超步（superstep）」邊界同步模型。',
  },
  code: {
    lang: 'cpp',
    code: `#include <algorithm>
#include <barrier>
#include <future>
#include <thread>
#include <vector>

// 任務平行：兩個「不同」工作同時進行，彼此邏輯獨立。 [1]
void loadConfigAndWarmCache(const std::string& path) {
    std::future<Config> configFut =
        std::async(std::launch::async, [path] { return parseConfig(path); });  // [2]
    std::future<void> warmFut = std::async(std::launch::async, [] { warmDiskCache(); });

    Config cfg = configFut.get();  // [3] 兩個future在此處匯合，屬於fork-join的join
    warmFut.get();
    applyConfig(cfg);
}

// 資料平行：同一運算套用到資料的不同切片，工作內容完全相同。 [4]
void scaleInPlace(std::vector<double>& data, double factor, unsigned numWorkers) {
    const std::size_t n = data.size();
    const std::size_t chunk = (n + numWorkers - 1) / numWorkers;

    std::vector<std::thread> workers;
    for (unsigned w = 0; w < numWorkers; ++w) {  // [5] fork
        std::size_t begin = w * chunk;
        std::size_t end = std::min(n, begin + chunk);
        if (begin >= end) break;
        workers.emplace_back([&data, factor, begin, end] {
            for (std::size_t i = begin; i < end; ++i) data[i] *= factor;
        });
    }
    for (auto& t : workers) t.join();  // [6] join：所有worker必須完成才能往下走
}

// BSP 超步：std::barrier 讓所有執行緒在每一輪的邊界同步。
void bspRelaxationStep(std::vector<double>& grid, int iterations) {
    const unsigned p = std::thread::hardware_concurrency();
    std::barrier sync_point(p, [] { /* 選擇性：每輪結束時的協調動作 */ });

    auto worker = [&](unsigned id) {
        for (int iter = 0; iter < iterations; ++iter) {
            // 本地運算階段：只碰自己的資料切片，不與其他執行緒溝通。
            localRelax(grid, id, p);
            sync_point.arrive_and_wait();  // 等待所有執行緒完成這一輪
        }
    };
    std::vector<std::thread> threads;
    for (unsigned id = 0; id < p; ++id) threads.emplace_back(worker, id);
    for (auto& t : threads) t.join();
}`,
    callouts: [
      { n: 1, text: '任務平行：兩段程式碼做「不同的事」（解析設定檔 vs 預熱磁碟快取），彼此無資料相依，可同時進行。' },
      { n: 2, text: 'std::async 啟動獨立任務並回傳 future，是 fork-join 中「fork」的標準函式庫寫法。' },
      { n: 3, text: 'get() 會阻塞直到對應任務完成，兩條分支在此處匯合——這就是 fork-join 的「join」。' },
      { n: 4, text: '資料平行：所有 worker 執行完全相同的 lambda，差異只在於各自負責的索引區間。' },
      { n: 5, text: '以固定數量的執行緒手動切分資料，避免為每個元素各起一個執行緒造成排程開銷。' },
      { n: 6, text: 'join 是同步點：主執行緒必須等所有 worker 完成才能確保 data 已全部更新完畢。' },
    ],
  },
  deepDive: [
    {
      heading: 'Concurrency 與 Parallelism 的本質區別',
      body:
        '把兩者混為一談會導致錯誤的優化方向。並行是關於「正確地表達多個邏輯上獨立、可交錯推進的任務」；平行是關於「用實體上同時發生的執行來縮短總時間」。Rob Pike 的名言「concurrency is about dealing with lots of things at once, parallelism is about doing lots of things at once」點出關鍵：並行處理的是問題的結構，平行處理的是解法的執行方式。\n\n具體例子：一支單執行緒的事件迴圈伺服器（如傳統 Node.js）用 `select`／`epoll` 交錯處理成千上萬個連線，是高度並行但完全不平行——同一時刻只有一個 CPU 核心在跑。反過來，對一個 4096×4096 矩陣做 `std::execution::unseq` 向量化的逐元素運算，是高度平行（同一指令週期內 SIMD channel 同時處理多個元素）但幾乎不並行——邏輯上仍是單一控制流、單一任務、無需排程決策。工業程式碼常見的錯誤是「為了平行而引入並行複雜度」：明明資料獨立、可用純資料平行的向量化或 GPU kernel 解決，卻先手寫多執行緒排程與鎖，徒增除錯與同步成本。',
    },
    {
      heading: 'Latency-bound 與 Throughput-bound：優化目標的分野',
      body:
        'Latency-bound（延遲受限）工作在意「單一請求／單一運算從開始到結束要多久」，典型如互動式系統的回應時間、即時控制迴圈、單筆交易的端到端延遲。Throughput-bound（吞吐受限）工作在意「單位時間能處理多少筆」，典型如批次 ETL、離線訓練、大規模模擬。\n\n這個分野直接決定該用哪一種平行範式與硬體策略。延遲受限問題通常靠降低關鍵路徑長度：減少同步點、縮短 critical path、用投機執行或預先計算隱藏延遲，增加執行緒數量往往幫助有限（Amdahl 定律的序列部分主宰結果），有時甚至因排程與同步開銷讓延遲變差。吞吐受限問題則相反：只要工作單元夠獨立，加寬平行度（更多核心、更寬的 SIMD、更多 GPU SM）幾乎線性提升總吞吐，即使單筆的延遲因排隊而變長也可接受——這正是 Gustafson 定律描述的場景。實務上同一個系統常兩者兼具：一個 web 服務要求 P99 延遲達標（latency-bound 的 SLA），同時要撐住每秒請求數（throughput-bound 的容量規劃），兩個目標的優化手段可能互相拉扯，需要明確排序優先權。',
    },
    {
      heading: 'SPMD、Fork-Join 與 BSP：HPC 常見拓撲',
      body:
        'Fork-join 是最直觀的模型：主執行緒在某點「fork」出多個子任務平行執行，稍後在「join」處等待全部完成再繼續，`std::async`／`std::thread::join`、OpenMP 的 `#pragma omp parallel` 區塊、以及大多數平行 STL 演算法內部都採此結構。優點是易於推理（fork 前與 join 後都是單執行緒的序列語意），缺點是每次 fork-join 有啟動與匯合開銷，且區塊之間若彼此相依會退化成一連串短暫平行段落，序列部分佔比升高。\n\nSPMD（Single Program, Multiple Data）是 MPI 與 GPU kernel 的核心模型：所有執行單元（rank／thread）執行同一份程式碼，但依自己的 rank id 或 thread index 決定處理哪一段資料、走哪一條分支。與 fork-join 不同，SPMD 通常從程式一開始就是多個獨立執行流（例如 `mpirun -n 64` 啟動 64 個平行 process），彼此透過訊息傳遞或共享記憶體通訊，而非由單一父執行緒動態產生子任務。CUDA kernel 更是典型 SPMD：同一份 kernel 程式碼由數千個 thread 依 `threadIdx`／`blockIdx` 分工。\n\nBulk-Synchronous Parallel（BSP，Valiant 1990）則把計算切成一連串「超步（superstep）」：每個超步內，所有處理單元各自做本地運算、互不干擾；超步結束時做一次全域同步屏障（barrier），確保上一輪的通訊都已完成，才能進入下一輪。這種「計算—通訊—屏障」的固定節奏簡化了正確性推理（不會有跨超步的資料競爭），代價是最慢的處理單元拖累整輪（straggler 問題）。C++20 的 `std::barrier` 正是為 BSP 風格程式設計的原語：它是可重複使用的屏障，且支援在每輪到齊時執行一次性的「completion function」，天然對應 BSP 超步邊界的協調動作；相較之下 `std::latch` 是一次性、不可重置的屏障，更適合單次 fork-join 的匯合點而非重複迭代的 BSP 迴圈。',
    },
  ],
  pitfalls: [
    '把「多執行緒」等同於「更快」：在延遲受限或序列相依度高的工作中，執行緒數增加反而因排程與同步開銷讓 latency 變差。',
    '用複雜的並行結構（鎖、條件變數）解決本質上是純資料平行的問題，本可直接用 `std::execution::par_unseq` 或 SIMD 完成。',
    'BSP 風格程式中忽略 straggler 問題：一個超步只要有一個 thread 慢，`std::barrier::arrive_and_wait()` 會讓所有人陪它等待。',
    '混淆 SPMD 與 fork-join：以為所有平行程式都有明確的「join」點，導致對 MPI／CUDA 這類從一開始就多流的模型做出錯誤的正確性假設。',
    '只用吞吐量（QPS、GFLOPS）評估延遲受限系統，掩蓋了 P99／P999 尾端延遲的真實劣化。',
  ],
  bestPractices: [
    '動手平行化前先分類：這是 latency-bound 還是 throughput-bound？答案決定該縮短關鍵路徑還是加寬平行度。',
    '資料獨立、無分支差異的工作優先選資料平行（向量化、`par_unseq`、GPU kernel），只有工作內容本質不同才用任務平行。',
    '重複迭代且有明確同步邊界的數值演算法（如 Jacobi 鬆弛、時間步進模擬）用 `std::barrier` 表達 BSP 語意，讓同步意圖顯式化。',
    '一次性的 fork-join 匯合改用 `std::latch`，語意更貼近「等待到齊一次即可丟棄」而非重複使用的屏障。',
    '對任何平行方案都量測端到端延遲與吞吐兩項指標，避免只優化其中一項卻讓另一項悄悄惡化。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '下列何者最準確描述 concurrency（並行）與 parallelism（平行）的差異？',
      options: [
        { id: 'a', text: '並行一定比平行快，因為並行使用更多執行緒' },
        { id: 'b', text: '並行是程式結構上能否交錯處理多個獨立任務，平行是這些任務能否真的同時在多個運算單元上執行' },
        { id: 'c', text: '兩者是同義詞，差別只在學術用語與工業用語' },
        { id: 'd', text: '平行只能發生在多核心 CPU，並行只能發生在單核心系統' },
      ],
      correctOptionId: 'b',
      explanation:
        '並行描述問題／程式的結構（是否由可交錯的獨立任務組成），平行描述執行方式（是否真的同時發生在多個實體單元上），兩者是正交的軸，單核心多執行緒即是並行但不平行的例子。',
    },
    {
      id: 'q2',
      stem: '一個系統的優化目標從「單筆請求回應時間」改為「每秒可處理的請求數」，這代表優化重心從何種模型轉向何種模型？',
      options: [
        { id: 'a', text: '從 throughput-bound 轉向 latency-bound' },
        { id: 'b', text: '從 latency-bound 轉向 throughput-bound' },
        { id: 'c', text: '兩者相同，優化手段不需改變' },
        { id: 'd', text: '從 SPMD 轉向 fork-join' },
      ],
      correctOptionId: 'b',
      explanation:
        '單筆回應時間屬於 latency-bound 指標，單位時間處理量屬於 throughput-bound 指標；後者通常可靠加寬平行度線性提升，即使犧牲部分單筆延遲也可接受。',
    },
    {
      id: 'q3',
      stem: '在 bulk-synchronous parallel（BSP）模型中，`std::barrier` 扮演的角色最接近下列何者？',
      options: [
        { id: 'a', text: '一次性、不可重複使用的等待點，等同於 std::latch' },
        { id: 'b', text: '標記每一輪超步（superstep）結束的可重複使用同步屏障，確保所有執行緒完成本地運算後才進入下一輪' },
        { id: 'c', text: '用來取代 std::mutex 的細粒度鎖機制' },
        { id: 'd', text: '僅用於 GPU kernel 內部的 warp 同步' },
      ],
      correctOptionId: 'b',
      explanation:
        'std::barrier 可重複使用且支援每輪到齊時執行一次性協調動作，天然對應 BSP 「本地計算—全域屏障」反覆迭代的超步結構；std::latch 才是一次性、不可重置的屏障。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['任務平行', '資料平行', '管線平行', 'SPMD／Fork-Join', 'BSP 超步同步'],
    caption: '三種平行範式（任務／資料／管線）到 HPC 常見拓撲（SPMD、fork-join、BSP）的心智模型演進。',
  },
  tryIt: {
    code: `#include <barrier>
#include <iostream>
#include <thread>
#include <vector>

// 用 std::barrier 示範一個最小的 BSP 風格迴圈：
// 每一輪所有執行緒各自遞增自己的計數器，然後在屏障處等待彼此。
int main() {
    constexpr unsigned kWorkers = 4;
    constexpr int kSupersteps = 3;
    std::vector<int> counters(kWorkers, 0);

    std::barrier sync_point(kWorkers, [] { std::cout << "-- superstep 完成 --\\n"; });

    auto worker = [&](unsigned id) {
        for (int step = 0; step < kSupersteps; ++step) {
            counters[id] += 1;             // 本地運算，不碰其他執行緒的資料
            sync_point.arrive_and_wait();  // 等待這一輪所有執行緒完成
        }
    };

    std::vector<std::thread> threads;
    for (unsigned id = 0; id < kWorkers; ++id) threads.emplace_back(worker, id);
    for (auto& t : threads) t.join();

    for (unsigned id = 0; id < kWorkers; ++id) {
        std::cout << "worker " << id << " -> " << counters[id] << '\\n';
    }
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::barrier - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/thread/barrier',
      description: 'C++20 可重複使用同步屏障的完整介面與語意說明，對應 BSP 超步邊界。',
    },
    {
      title: 'std::async - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/thread/async',
      description: 'fork-join 模型中「fork」端的標準函式庫寫法，含 launch policy 細節。',
    },
    {
      title: 'A Bridging Model for Parallel Computation (Valiant, 1990)',
      href: 'https://dl.acm.org/doi/10.1145/79173.79181',
      description: 'Leslie Valiant 提出 BSP 模型的原始論文，定義超步與屏障同步的理論基礎。',
    },
    {
      title: 'MPI: A Message-Passing Interface Standard',
      href: 'https://www.mpi-forum.org/docs/',
      description: 'SPMD 程式設計最主流的實踐標準，涵蓋 rank、通訊子與集合通訊操作。',
    },
  ],
};

export default ind03ConcurrencyVsParallelism;
