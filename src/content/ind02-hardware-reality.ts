import type { ChapterContent } from '@/types/ChapterContent';

const ind02HardwareReality: ChapterContent = {
  slug: 'ind02-hardware-reality',
  chapterLabel: '第 31 章',
  title: '硬體現實：NUMA、快取一致性與弱記憶體',
  group: '第 8 部：先修與心智模型',
  description:
    '多核與 NUMA 拓樸、快取階層、MESI/MOESI 一致性協定，以及 x86 TSO 與 ARM/Power 弱序模型對可攜 kernel 的實際衝擊。',
  concept: {
    standard: 'C++20',
    body: '所有平行程式最終都跑在真實硬體上：多顆核心透過快取一致性協定（如 MESI）共享記憶體視圖，一致性流量會隨核心數成長而成為 scaling 天花板。NUMA 系統中記憶體有遠近之分，跨節點存取延遲可達數倍。硬體為求效能會亂序執行並使用 store buffer，因此各架構提供的「記憶體模型」強弱不同——x86 是較強的 TSO，ARM／Power 是弱序模型，需要顯式屏障才能保證跨執行緒可見順序。理解這些現實，才能寫出既正確又能真正 scale 的 lock-free 與平行程式碼。',
  },
  code: {
    lang: 'cpp',
    code: `#include <atomic>
#include <chrono>
#include <cstddef>
#include <thread>
#include <vector>

// Two independent counters that happen to share one 64-byte cache line.
// Every increment from either thread invalidates the other core's copy,
// generating coherence traffic even though there is no logical data
// dependency between the counters. [1]
struct FalseSharingCounters {
    std::atomic<long> a{0};
    std::atomic<long> b{0};  // [2]
};

// Padding each counter out to its own cache line removes the false
// sharing: the two atomics can no longer land in the same MESI-tracked
// block, so increments from different cores never invalidate each
// other's line. [3]
struct PaddedCounters {
    alignas(64) std::atomic<long> a{0};  // [4]
    alignas(64) std::atomic<long> b{0};
};

// Portable C++17 approach: use std::hardware_destructive_interference_size instead of a hardcoded 64. [4.5]
struct PaddedCountersPortable {
    alignas(std::hardware_destructive_interference_size) std::atomic<long> a{0};
    alignas(std::hardware_destructive_interference_size) std::atomic<long> b{0};
};

template <typename Counters>
double benchmarkIncrements(Counters& counters, std::size_t iterations) {
    auto start = std::chrono::steady_clock::now();
    std::thread t1([&] {
        for (std::size_t i = 0; i < iterations; ++i) {
            counters.a.fetch_add(1, std::memory_order_relaxed);  // [5]
        }
    });
    std::thread t2([&] {
        for (std::size_t i = 0; i < iterations; ++i) {
            counters.b.fetch_add(1, std::memory_order_relaxed);
        }
    });
    t1.join();
    t2.join();
    auto end = std::chrono::steady_clock::now();
    return std::chrono::duration<double, std::milli>(end - start).count();  // [6]
}`,
    callouts: [
      { n: 1, text: '兩個邏輯上無關的計數器若落在同一條快取行，仍會因硬體一致性協定而互相干擾。' },
      { n: 2, text: 'a、b 相鄰配置，通常會被編譯器與配置器擠進同一條 64 位元組快取行。' },
      { n: 3, text: '目標是驗證：只要把兩者拆到不同快取行，一致性流量與延遲應顯著下降。' },
      { n: 4, text: 'alignas(64) 強制每個原子變數各自佔滿一條快取行，避免與其他資料共享。' },
      {
        n: 5,
        text: '使用 memory_order_relaxed 是刻意的：這裡只在意計數正確與快取行為，不需要額外的順序保證。',
      },
      {
        n: 6,
        text: '量測方法：分別對 FalseSharingCounters 與 PaddedCounters 執行本函式並比較耗時，即可觀察 false sharing 造成的 scaling 崩潰。',
      },
      {
        n: 7,
        text: 'std::hardware_destructive_interference_size 是 C++17 引入的標準常數，反映編譯目標平台的快取行大小，取代硬編碼的 alignas(64)。',
      },
    ],
  },
  deepDive: [
    {
      heading: 'MESI／MOESI 一致性協定：從正確性到 scaling 天花板',
      body: '多核心系統靠快取一致性協定維持「所有核心看到同一份記憶體」的錯覺。MESI 將每條快取行標記為 Modified、Exclusive、Shared 或 Invalid 四種狀態；MOESI 再加入 Owned 狀態，讓一顆核心可以在不先寫回主記憶體的情況下，把修改過的資料直接分享給其他核心，減少寫回流量。\n\n協定本身保證正確性，但代價是「一致性流量」：當某核心要寫入一條被其他核心持有（S 或 E 狀態）的快取行時，必須先發出 Invalidate 訊息讓其他核心的副本失效，等對方確認（ack）後才能繼續。核心數愈多，這種跨核心的匯流排／互連流量愈容易成為瓶頸——即使程式邏輯上完全平行、沒有任何真正的資料相依，只要多個執行緒頻繁寫入同一條快取行（`false sharing`），效能就會隨核心數增加不升反降。這正是許多「看起來可以平行化，卻怎麼加執行緒都不會變快」案例的硬體根源。',
    },
    {
      heading: '亂序執行與 store buffer：記憶體重排的硬體來源',
      body: '現代 CPU 為了隱藏延遲，並不會照著程式順序執行指令。寫入操作通常先進入核心私有的 store buffer，之後才非同步地送進快取／一致性子系統；讀取則可能因為亂序執行引擎（out-of-order execution）而提前完成，只要不違反單一核心自身的資料相依即可。\n\n這代表：即使原始碼是「先寫 A，再寫 B」，其他核心觀察到的順序可能是「先看到 B 生效，後看到 A 生效」。這不是編譯器的問題，而是硬體真實的行為。記憶體屏障（memory barrier / fence）的作用，就是強制在屏障前的 store buffer 內容先送出、或阻止屏障後的讀寫跨越屏障重排。C++ 的 `std::memory_order`（acquire、release、seq_cst 等）正是對這些硬體屏障的可攜抽象；理解 store buffer 與亂序執行，才能理解為何 acquire/release 语意必須成對搭配才有意義。',
    },
    {
      heading: 'x86 TSO vs ARM／Power 弱序模型：對可攜 lock-free kernel 的衝擊',
      body: 'x86／x64 採用 Total Store Order（TSO）：一顆核心的所有寫入，其他核心會以相同的相對順序看到（store-store 順序被保留），只有「寫後讀」（store-load）可能被重排。這使得 x86 上很多在其他架構需要顯式屏障的操作「意外地」正確——用 `std::memory_order_relaxed` 寫的程式碼在 x86 上常常也能跑對，但這是僥倖，不是保證。\n\nARM 與 Power 採用遠為寬鬆的弱序模型：不僅 store-load，連 store-store、load-load、load-store 都可能被重排，且跨核心可見順序也不保證與程式順序一致。在這些架構上，缺乏正確 acquire/release 或顯式屏障（ARM 的 `dmb`、Power 的 `lwsync`/`sync`）的 lock-free 程式碼會在真實硬體上出現資料競爭般的錯誤結果，而這類錯誤在 x86 上開發、測試時往往完全不會浮現。這是為什麼「只在 x86 上測過的 lock-free code」移植到 ARM 伺服器或行動裝置 SoC 時常常爆炸的核心原因，也是 C++11 記憶體模型堅持要求開發者顯式標註 `memory_order` 的動機：讓程式在最弱的目標架構上也保持正確，而不是依賴 x86 的強序語意。',
    },
    {
      heading: '拓樸判讀：lstopo 與 numactl 的實務用法',
      body: '在動手優化之前，必須先看清硬體拓樸。`lstopo`（hwloc 套件）能圖形化或文字化列出：實體插槽（socket）、NUMA 節點、核心與超執行緒（hyperthread）的層級關係，以及各層快取（L1/L2/L3）的共享範圍——例如 L3 通常整個 socket 共享，L1/L2 則是每核心獨立。這決定了「相鄰」核心之間溝通的實際延遲差異。\n\n`numactl --hardware` 可列出各 NUMA 節點的記憶體容量與節點間距離（distance matrix），`numactl --cpunodebind=0 --membind=0` 則可將程序綁定在特定節點的 CPU 與記憶體上執行。搭配 `numastat` 觀察遠端記憶體存取（remote access）比例，是診斷「程式碼沒問題但吞吐量就是上不去」的第一步——很多時候答案是 first-touch 配置錯了節點，資料離真正計算它的核心太遠。',
    },
  ],
  pitfalls: [
    '假設 `std::memory_order_relaxed` 在 x86 上正常，就代表在 ARM／Power 上也正確；弱序架構會暴露出被 TSO 掩蓋的真實資料競爭。',
    '把邏輯上無關的熱資料（如多個執行緒各自的計數器、鎖）緊鄰宣告，未加 `alignas(64)`，造成 false sharing 而不自知。',
    '只用單執行緒或雙插槽以下的小規模測試驗證 scaling，忽略一致性流量會隨核心數非線性增長，導致上線後才發現無法 scale。',
    '在 NUMA 機器上用預設配置策略配置大型資料結構，卻讓計算執行緒綁在別的節點，造成大量跨節點記憶體流量。',
    '把「加了 mutex／atomic 就一定安全」與「效能不會受硬體拓樸影響」混為一談，忽略一致性協定本身的成本。',
  ],
  bestPractices: [
    '對高頻寫入的共享狀態（計數器、自旋鎖、環狀緩衝索引等），以 `alignas(std::hardware_destructive_interference_size)` 隔離到獨立快取行。',
    '先用 `lstopo` 看清 socket／NUMA／快取層級拓樸，再決定執行緒與資料的擺放策略。',
    '在 NUMA 系統遵循 first-touch 原則：讓實際使用資料的執行緒負責初始化，必要時以 `numactl --membind` 明確綁定。',
    '為 lock-free 程式碼選擇最弱但足夠的 `memory_order`，並在 ARM／Power（或以 QEMU／TSan、模擬弱序的工具）上實測，不能只信任 x86 上「跑得動」。',
    '用一致性流量作為 scaling 分析的第一嫌疑對象：若加執行緒後吞吐不升反降，先檢查是否有 false sharing 或跨插槽的共享寫入熱點。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '兩個執行緒分別頻繁寫入邏輯上互不相關、但落在同一條快取行的兩個變數，最可能觀察到的現象是什麼？',
      options: [
        { id: 'a', text: '完全沒有影響，因為兩個變數之間沒有資料相依' },
        { id: 'b', text: '效能隨核心數增加而下降，即使程式邏輯完全平行（false sharing）' },
        { id: 'c', text: '程式會產生資料競爭並且結果錯誤' },
        { id: 'd', text: '編譯器會自動偵測並插入正確的屏障來修正' },
      ],
      correctOptionId: 'b',
      explanation:
        '共用快取行會觸發一致性協定的失效／回應流程（false sharing），即使邏輯上兩變數無關、各自操作也是原子且正確的，效能仍會因一致性流量而劣化，且核心數愈多愈明顯。',
    },
    {
      id: 'q2',
      stem: '為什麼一段只用 `memory_order_relaxed` 撰寫、在 x86 上測試多年都正常運作的 lock-free 程式碼，移植到 ARM 伺服器上卻出現偶發性錯誤？',
      options: [
        { id: 'a', text: 'ARM 的原子指令效能較差，導致計時錯誤' },
        {
          id: 'b',
          text: 'x86 的 TSO 記憶體模型較強，掩蓋了程式碼中缺少的同步語意；ARM 屬弱序模型，允許更多重排',
        },
        { id: 'c', text: 'relaxed 語意在 ARM 上不被支援' },
        { id: 'd', text: '這與記憶體模型無關，純粹是編譯器版本差異' },
      ],
      correctOptionId: 'b',
      explanation:
        'x86 TSO 保留了 store-store 順序，許多在弱序架構上需要顯式屏障的情境在 x86 上「碰巧」正確；ARM／Power 允許 store-store、load-load 等更多重排，缺乏正確 acquire/release 的程式碼會暴露出潛在的資料競爭。',
    },
    {
      id: 'q3',
      stem: '在 NUMA 系統上，`numactl --cpunodebind=0 --membind=0` 的主要用途是什麼？',
      options: [
        { id: 'a', text: '強制程式只使用一顆 CPU 核心' },
        { id: 'b', text: '關閉該節點上的快取一致性協定以加速執行' },
        {
          id: 'c',
          text: '將程序的 CPU 執行與記憶體配置都綁定在同一個 NUMA 節點，避免跨節點存取延遲',
        },
        { id: 'd', text: '將程式的所有執行緒平均分散到所有 NUMA 節點' },
      ],
      correctOptionId: 'c',
      explanation:
        '`--cpunodebind` 限制程序只在指定節點的 CPU 上執行，`--membind` 限制其記憶體只從指定節點配置；兩者搭配可避免計算核心與其存取的記憶體位於不同節點而產生的跨節點延遲。',
    },
  ],
  diagram: {
    key: 'cache-line',
    caption:
      '快取行示意：兩個邏輯獨立的變數共享同一條 64 位元組快取行時，任一核心的寫入都會使其他核心的副本失效，產生一致性流量；加上 alignas 對齊後兩者各占一條快取行即可消除此現象。',
  },
  tryIt: {
    code: `#include <atomic>
#include <chrono>
#include <iostream>
#include <thread>

// Minimal demonstration of the false-sharing methodology: run the same
// increment workload once with two atomics packed together, once with
// them padded onto separate cache lines, and compare wall-clock time.
struct Packed {
    std::atomic<long> a{0};
    std::atomic<long> b{0};
};

struct Padded {
    alignas(64) std::atomic<long> a{0};
    alignas(64) std::atomic<long> b{0};
};

template <typename T>
double run(T& counters, long iterations) {
    auto start = std::chrono::steady_clock::now();
    std::thread t1([&] {
        for (long i = 0; i < iterations; ++i) {
            counters.a.fetch_add(1, std::memory_order_relaxed);
        }
    });
    std::thread t2([&] {
        for (long i = 0; i < iterations; ++i) {
            counters.b.fetch_add(1, std::memory_order_relaxed);
        }
    });
    t1.join();
    t2.join();
    return std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - start)
        .count();
}

int main() {
    constexpr long kIterations = 20'000'000;
    Packed packed;
    Padded padded;
    std::cout << "packed (false sharing): " << run(packed, kIterations) << " ms\\n";
    std::cout << "padded (separate lines): " << run(padded, kIterations) << " ms\\n";
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Intel 64 and IA-32 Architectures Optimization Reference Manual',
      href: 'https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html',
      description: 'Intel 官方最佳化手冊，涵蓋快取階層、記憶體排序與微架構細節。',
    },
    {
      title: 'std::hardware_destructive_interference_size - cppreference',
      href: 'https://en.cppreference.com/w/cpp/thread/hardware_destructive_interference_size',
      description: 'C++17 標準函式庫提供的快取行大小常數，用於避免 false sharing 的可攜寫法。',
    },
    {
      title: 'Arm Architecture Reference Manual — Memory Model',
      href: 'https://developer.arm.com/documentation/ddi0487/latest/',
      description: 'ARM 架構參考手冊，說明其弱序記憶體模型與所需的屏障指令（如 dmb）。',
    },
    {
      title: 'hwloc / lstopo Documentation',
      href: 'https://www.open-mpi.org/projects/hwloc/',
      description: 'hwloc 專案文件，說明如何以 lstopo 判讀多核與 NUMA 硬體拓樸。',
    },
    {
      title: 'Power ISA — Storage Model (IBM)',
      href: 'https://openpowerfoundation.org/specifications/isa/',
      description: 'OpenPOWER ISA 規格中對其弱序儲存模型與同步指令（lwsync／sync）的定義。',
    },
  ],
};

export default ind02HardwareReality;
