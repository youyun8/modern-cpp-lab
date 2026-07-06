import type { ChapterContent } from '@/types/ChapterContent';

const ind20MemoryNumaOptimization: ChapterContent = {
  slug: 'ind20-memory-numa-optimization',
  chapterLabel: '第 20 章',
  title: '記憶體與 NUMA 優化',
  group: 'N · 第六部：效能工程',
  description: 'alignas／padding 消除 false sharing、first-touch 配置、thread affinity，以及記憶體池與 huge pages。',
  concept: {
    standard: 'C++17',
    body:
      '第 2 章談過 NUMA 的硬體現實：跨節點記憶體存取延遲可達數倍。本章關心的是「怎麼寫程式碼因應」。Linux 的實體記憶體配置遵循 first-touch 政策——`malloc`／`new` 只保留虛擬位址空間，真正的實體頁面要等第一次被寫入（touch）時才配置，而且是配置在當下執行該次寫入的執行緒所在的 NUMA 節點。這代表「誰先寫」決定了資料實際落在哪裡，而不是「誰配置」。若用單一執行緒初始化一大塊之後才平行運算的資料，所有頁面都會落在同一節點，其餘節點上的執行緒得承受遠端存取的延遲與頻寬懲罰。搭配 `alignas`／padding 消除快取行層級的 false sharing、記憶體池／arena allocator 降低配置開銷、huge pages 減少 TLB miss，是撰寫 NUMA-aware HPC 核心（GEMM、stencil 等）的標準工具箱。',
  },
  code: {
    lang: 'cpp',
    code: `#include <cstddef>
#include <cstdint>
#include <memory>
#include <new>
#include <thread>
#include <vector>

// Padded per-thread accumulator: even though each thread only ever
// writes its own slot, unpadded adjacent doubles would still fall on
// the same 64-byte cache line and cause false sharing across sockets,
// which is far more expensive than same-socket false sharing because
// it also triggers cross-node coherence traffic. [1]
struct alignas(64) PerThreadAccumulator {
    double sum{0.0};
};

// A large buffer that will be first-touch-initialized in parallel so
// that each thread's chunk physically lands on the NUMA node the
// thread itself runs on. [2]
struct NumaBuffer {
    explicit NumaBuffer(std::size_t n) : data(n) {}
    std::vector<double> data;
};

// Parallel first-touch initialization: every worker thread writes only
// the contiguous slice of memory it "owns" for the rest of the
// computation. This is the standard NUMA-aware allocation trick -- the
// Linux kernel places each page on the node of the thread performing
// the *first write*, not the thread that called operator new. [3]
void firstTouchInit(NumaBuffer& buf, unsigned num_threads) {
    const std::size_t n = buf.data.size();
    const std::size_t chunk = (n + num_threads - 1) / num_threads;
    std::vector<std::thread> workers;
    workers.reserve(num_threads);

    for (unsigned t = 0; t < num_threads; ++t) {
        const std::size_t begin = t * chunk;
        const std::size_t end = std::min(n, begin + chunk);
        workers.emplace_back([&buf, begin, end] {
            // [4] The write below is the "first touch": the OS backs
            // these virtual addresses with physical pages on whichever
            // NUMA node this thread is currently scheduled on.
            for (std::size_t i = begin; i < end; ++i) buf.data[i] = 0.0;
        });
    }
    for (auto& w : workers) w.join();
}

// Compute phase that reuses the *same* chunking as firstTouchInit, so
// each thread only ever touches memory that was first-touched by
// itself (or at least by a thread on the same node). [5]
double parallelSum(NumaBuffer& buf, unsigned num_threads) {
    const std::size_t n = buf.data.size();
    const std::size_t chunk = (n + num_threads - 1) / num_threads;
    std::vector<PerThreadAccumulator> partial(num_threads);
    std::vector<std::thread> workers;
    workers.reserve(num_threads);

    for (unsigned t = 0; t < num_threads; ++t) {
        const std::size_t begin = t * chunk;
        const std::size_t end = std::min(n, begin + chunk);
        workers.emplace_back([&buf, &partial, t, begin, end] {
            double local = 0.0;
            for (std::size_t i = begin; i < end; ++i) local += buf.data[i];
            partial[t].sum = local;  // [6] Padded slot: no cross-core invalidation here.
        });
    }
    for (auto& w : workers) w.join();

    double total = 0.0;
    for (auto& p : partial) total += p.sum;
    return total;
}`,
    callouts: [
      { n: 1, text: '若無 alignas(64)，相鄰的每執行緒累加器仍可能落在同一快取行；跨插槽（socket）的 false sharing 比單插槽內更昂貴，因為它會觸發跨節點的一致性流量。' },
      { n: 2, text: 'NumaBuffer 只是普通的 std::vector；配置時（建構子）尚未產生實體頁面，真正決定落點的是之後的第一次寫入。' },
      { n: 3, text: 'first-touch 政策：實體記憶體在第一次被寫入時才配置，且配置在執行該寫入的執行緒目前所在的 NUMA 節點——這是本章最核心的機制。' },
      { n: 4, text: '每個執行緒只初始化自己負責的區段，讓資料均勻分散到各 NUMA 節點，而非全部集中在呼叫 new 的那顆核心所在節點。' },
      { n: 5, text: '運算階段刻意重用與初始化階段相同的切塊方式，確保每個執行緒之後存取的仍是自己（或同節點）first-touch 過的記憶體，維持區域性。' },
      { n: 6, text: 'partial[t] 各自佔滿一條快取行，多執行緒同時寫入不同插槽（slot）不會互相使快取失效。' },
    ],
  },
  deepDive: [
    {
      heading: 'alignas／padding：NUMA 尺度下的 false sharing',
      body:
        '第 24 章與第 2 章已介紹過用 `alignas(std::hardware_destructive_interference_size)` 把熱資料隔開到獨立快取行，避免同插槽內多核心互相使快取失效。在多插槽（multi-socket）NUMA 系統上，這個問題會被放大：跨插槽的一致性流量必須經過插槽間互連（例如 Intel UPI 或 AMD Infinity Fabric），延遲遠高於同插槽內的核心對核心通訊。因此，若一個結構被多個位於不同插槽的執行緒同時寫入且未對齊，其效能懲罰不只是「快取失效」，而是「跨插槽匯流排流量 + 遠端一致性協定往返」的疊加。\n\n實務上的作法不變：把每執行緒／每核心的熱資料以 `alignas(64)`（或 `std::hardware_destructive_interference_size`）填充成獨立快取行；差別在於，NUMA 環境下更應該同時檢視「這些填充後的物件，各自落在哪個 NUMA 節點」——填充只解決快取行層級的干擾，若填充後的陣列仍整段配置在單一節點，遠端存取延遲的問題依然存在，必須靠下一節的 first-touch 手法解決。',
    },
    {
      heading: 'first-touch 政策與平行初始化',
      body:
        'Linux 對匿名記憶體（`malloc`、`new`、`mmap` 的私有匿名對映）預設採用 first-touch 配置政策：`mmap`／`brk` 只建立虛擬位址空間的對映，實體頁框（page frame）要等到第一次被讀寫時才由核心配置，並且優先配置在「執行這次存取的 CPU」所在的 NUMA 節點。這代表配置記憶體的那一行程式碼本身不決定資料落點；真正決定落點的，是之後誰先寫入這塊記憶體。\n\n這也是為什麼「先用單一執行緒（通常是 main 執行緒）把整個陣列清零或填入初始值，再啟動多執行緒平行運算」是 NUMA 系統上一個常見卻隱蔽的效能陷阱：清零迴圈的第一次寫入，讓所有頁面全部落在 main 執行緒所在的那一個 NUMA 節點；之後即使運算階段平均分配給所有節點的執行緒，位於其他節點的執行緒每次存取都是遠端記憶體存取。正確做法是「平行初始化」：讓每個工作執行緒初始化（first-touch）它之後在運算階段會負責的那塊資料，且切塊方式在初始化與運算兩階段保持一致，這樣每個執行緒讀寫的永遠是自己節點上的本地記憶體。這正是本章程式碼範例中 `firstTouchInit` 與 `parallelSum` 使用相同 chunk 邊界的原因。\n\n光靠平行初始化還不夠精確控制，因為作業系統排程器可能把執行緒在節點間搬移。若要更嚴格保證資料局部性，可再搭配執行緒親和性（thread affinity，如 `pthread_setaffinity_np` 或 OpenMP 的 `OMP_PROC_BIND`）把每個執行緒釘選在固定核心／節點上，並用 `numactl --membind` 或 `libnuma` 的 `numa_alloc_onnode` 做更明確的節點級配置。',
    },
    {
      heading: '記憶體池、arena allocator 與 huge pages',
      body:
        'HPC 程式常在熱路徑中頻繁配置／釋放大量小物件，通用配置器（glibc malloc、tcmalloc 等）的鎖與 metadata 管理會帶來不可忽視的開銷，且配置模式難以預測會使 first-touch 落點更難掌控。記憶體池（memory pool）與 arena allocator 把配置模式收斂為「一次跟作業系統要一大塊記憶體，之後在使用者空間自行切分」，好處有二：配置／釋放變成近乎零成本的指標運算，且可以在建立 arena 時就明確決定要 first-touch 在哪個 NUMA 節點（例如整個 arena 由固定在該節點的執行緒一次性初始化），把節點放置的決策從「每次小配置各自為政」收斂成「整個 arena 一次決定」。C++17／20 的 allocator-aware 容器（`std::pmr::polymorphic_allocator` 搭配 `std::pmr::monotonic_buffer_resource`）提供了語言層級支援，可以在不改變容器介面的前提下把記憶體來源換成自訂 arena。\n\n對於數 GB 等級的 HPC 資料集，另一個常被忽略的成本是分頁表（page table）查詢：預設頁面大小通常是 4 KiB，一個 8 GB 的陣列就需要超過兩百萬個分頁表項，TLB（Translation Lookaside Buffer）條目數遠不足以涵蓋，導致大量 TLB miss，每次 miss 都要多次記憶體存取去走訪多層分頁表（page walk）。Huge pages（x86 上常見 2 MiB 或 1 GiB）把單一分頁表項涵蓋的實體記憶體範圍放大數百至數十萬倍，同樣大小的資料集所需的分頁表項數量隨之大幅減少，TLB 命中率因而提升。Linux 提供兩種取得方式：`hugetlbfs`（需要管理員預先保留 huge page 池，透過 `mmap` 搭配 `MAP_HUGETLB` 存取）以及 Transparent Huge Pages（THP，核心嘗試自動用大頁支撐一般配置，但可能有延遲配置與記憶體碎片化的副作用，需視工作負載評估是否停用 THP 改採顯式 hugetlbfs）。',
    },
    {
      heading: '概念性實驗：NUMA-aware 配置對 GEMM／stencil 的加速',
      body:
        '設想一個雙插槽伺服器，每個插槽各有一個 NUMA 節點，共 N 個核心平均分配於兩節點。要對一個大型矩陣做分塊 GEMM（矩陣乘法）或 5 點 stencil（如簡化的熱傳導迭代），輸入矩陣先以單一執行緒配置並用一個迴圈初始化，再啟動 N 個執行緒依列或依區塊平行運算。由於 first-touch 全部發生在單一執行緒（假設固定在節點 0），整個矩陣的實體頁面幾乎全部落在節點 0；節點 1 上的一半執行緒，此後每一次存取自己負責的那部分資料，都是跨節點的遠端存取，實測上遠端延遲常是本地延遲的 1.5 到 2 倍以上，且遠端頻寬也明顯低於本地頻寬。stencil 這類記憶體頻寬受限（memory-bandwidth-bound）的核心對此特別敏感：即使運算本身完全平行、沒有任何邏輯上的資料相依或鎖，整體吞吐量仍會被卡在單一節點的本地記憶體頻寬上限，加了更多執行緒也無法讓吞吐量隨核心數線性成長，因為節點 1 的執行緒始終在等待跨插槽記憶體流量。\n\n把初始化改成平行 first-touch：依照運算階段會採用的相同分塊方式（例如依列或依區塊切分），讓節點 0 的執行緒初始化屬於節點 0 那半的資料，節點 1 的執行緒初始化屬於節點 1 那半的資料。之後運算階段每個執行緒存取的資料絕大部分已經是本地記憶體。在雙插槽、記憶體頻寬受限的核心上，這類修正常能觀察到吞吐量從「遠低於雙節點理論頻寬總和」提升到「接近兩個節點本地頻寬的加總」，也就是說相較於單執行緒初始化的版本，平行 GEMM／stencil 的整體加速倍率可望從原本受限於單一節點頻寬（實質上等於只用了一半機器的記憶體頻寬）改善到接近兩倍——確切倍率取決於節點數、跨節點距離與工作負載的頻寬／計算比例，但方向與量級是 NUMA 系統上這類最佳化的典型效果。',
    },
  ],
  pitfalls: [
    '用單一執行緒把大型陣列清零或填入初始值，再交給多執行緒平行運算——所有頁面已因 first-touch 落在同一個 NUMA 節點，之後怎麼平行運算都無法消除遠端存取延遲。',
    '只做了平行初始化卻未設定 thread affinity，作業系統排程器把執行緒在節點間搬移，導致執行緒後來實際執行的節點與它當初 first-touch 資料的節點不一致。',
    '以為「每執行緒各自一個變數」就自動安全，卻忘了替小型 per-thread 結構加 `alignas`／padding，導致這些結構仍擠在同一批快取行，在多插槽環境下產生比單插槽更昂貴的 false sharing。',
    '在 NUMA 機器上用 `numactl --interleave=all` 這類「平均灑在所有節點」的政策取代 first-touch 分析，掩蓋了真正的資料局部性問題，某些場景下甚至比不管它更慢。',
    '無條件對所有配置啟用 huge pages 或 THP，未評估工作負載的記憶體存取模式，反而因記憶體碎片化或 THP 背景 compaction 造成延遲尖峰。',
  ],
  bestPractices: [
    '將初始化階段與運算階段採用相同的切塊（chunking）策略，讓每個執行緒 first-touch 的資料就是它之後實際運算會存取的資料。',
    '對高頻寫入的每執行緒／每核心資料結構（累加器、局部緩衝區索引等），以 `alignas(64)` 或 `std::hardware_destructive_interference_size` 隔離到獨立快取行，並在多插槽拓樸下驗證效果。',
    '搭配 `pthread_setaffinity_np`／`numactl --cpunodebind` 把執行緒釘選在固定核心，避免排程器搬移執行緒導致資料局部性失效。',
    '對頻繁配置／釋放的小物件改用 arena／pool allocator（如 `std::pmr::monotonic_buffer_resource`），把配置開銷與 NUMA 節點放置決策收斂到 arena 建立時一次決定。',
    '對數 GB 等級的大型資料集評估 huge pages（`hugetlbfs` 或 THP），並用 `numastat`、`perf stat` 量測 TLB miss 與遠端存取比例，確認優化確實帶來改善而非臆測。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '在 Linux 的 first-touch 記憶體政策下，決定一塊記憶體「實際配置在哪個 NUMA 節點」的關鍵時刻是什麼？',
      options: [
        { id: 'a', text: '呼叫 malloc／new 配置虛擬位址空間的當下' },
        { id: 'b', text: '程式結束、記憶體被釋放的當下' },
        { id: 'c', text: '該記憶體第一次被寫入（touch）的當下，配置在執行該次寫入的執行緒所在節點' },
        { id: 'd', text: '編譯期，由編譯器靜態決定' },
      ],
      correctOptionId: 'c',
      explanation:
        'malloc／new 只建立虛擬位址對映，實體頁框要等第一次被寫入時才由核心配置，且配置在當下執行該寫入的 CPU 所在 NUMA 節點；這就是為何「誰先寫」而非「誰配置」決定資料落點。',
    },
    {
      id: 'q2',
      stem: '為什麼「先用單一執行緒初始化一整塊大陣列，再啟動多執行緒平行運算」在 NUMA 系統上常導致擴充性不佳？',
      options: [
        { id: 'a', text: '因為單執行緒初始化本身運算量太大，與後續平行運算無關' },
        { id: 'b', text: '因為 first-touch 政策讓整塊資料全落在初始化執行緒所在的單一節點，其餘節點的執行緒之後都要付出遠端記憶體存取的延遲與頻寬代價' },
        { id: 'c', text: '因為單執行緒初始化會導致編譯器關閉向量化' },
        { id: 'd', text: '因為這樣做會觸發額外的分頁表建立，與節點無關' },
      ],
      correctOptionId: 'b',
      explanation:
        '初始化階段的第一次寫入決定了實體頁面落點；單執行緒初始化把所有頁面釘死在同一節點，之後其他節點的執行緒存取這些資料都是跨節點遠端存取，在記憶體頻寬受限的核心（如 stencil）上尤其明顯拖累擴充性。',
    },
    {
      id: 'q3',
      stem: '在多插槽（multi-socket）NUMA 系統上，未對齊的每執行緒小結構造成的 false sharing，相較於單插槽系統上的 false sharing，主要差異是什麼？',
      options: [
        { id: 'a', text: '完全沒有差異，兩者代價一致' },
        { id: 'b', text: '多插槽下不會發生 false sharing，因為每個插槽有自己的快取' },
        { id: 'c', text: '多插槽下的一致性流量需經過插槽間互連，延遲與代價通常高於同插槽內的核心對核心一致性流量' },
        { id: 'd', text: '多插槽下 false sharing 只影響讀取，不影響寫入' },
      ],
      correctOptionId: 'c',
      explanation:
        '同插槽內的核心透過共享的末階快取與插槽內互連通訊，延遲相對較低；跨插槽的一致性流量必須經過插槽間互連（如 UPI、Infinity Fabric），因此多插槽環境下的 false sharing 代價通常更高，凸顯 alignas／padding 在 NUMA 系統上更為重要。',
    },
  ],
  diagram: {
    key: 'cache-line',
    caption:
      '快取行示意延伸到 NUMA 尺度：同插槽內的 false sharing 已需靠 alignas 填充避免；當寫入該快取行的核心分屬不同插槽（不同 NUMA 節點）時，一致性流量還須經過插槽間互連，代價更高——這正是 first-touch 平行初始化要盡量讓每執行緒資料落在本地節點的原因。',
  },
  tryIt: {
    code: `#include <cstddef>
#include <iostream>
#include <thread>
#include <vector>

// Simplified runnable variant: parallel first-touch initialization of
// a buffer, followed by a compute phase that reuses the same chunking
// so each thread stays on memory it (or its node) first-touched.
struct alignas(64) Partial {
    double sum{0.0};
};

int main() {
    constexpr std::size_t kN = 1 << 24;
    constexpr unsigned kThreads = 4;
    std::vector<double> data(kN);

    auto chunk_of = [&](unsigned t, std::size_t& begin, std::size_t& end) {
        const std::size_t chunk = (kN + kThreads - 1) / kThreads;
        begin = t * chunk;
        end = std::min(kN, begin + chunk);
    };

    // Parallel first-touch: each thread writes only its own slice.
    std::vector<std::thread> init_workers;
    for (unsigned t = 0; t < kThreads; ++t) {
        std::size_t begin, end;
        chunk_of(t, begin, end);
        init_workers.emplace_back([&data, begin, end, t] {
            for (std::size_t i = begin; i < end; ++i) data[i] = static_cast<double>(t);
        });
    }
    for (auto& w : init_workers) w.join();

    // Compute phase reuses the same chunk boundaries.
    std::vector<Partial> partial(kThreads);
    std::vector<std::thread> compute_workers;
    for (unsigned t = 0; t < kThreads; ++t) {
        std::size_t begin, end;
        chunk_of(t, begin, end);
        compute_workers.emplace_back([&data, &partial, t, begin, end] {
            double local = 0.0;
            for (std::size_t i = begin; i < end; ++i) local += data[i];
            partial[t].sum = local;
        });
    }
    for (auto& w : compute_workers) w.join();

    double total = 0.0;
    for (auto& p : partial) total += p.sum;
    std::cout << "total: " << total << "\\n";
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'numa(7) — Linux manual page',
      href: 'https://man7.org/linux/man-pages/man7/numa.7.html',
      description: '說明 Linux NUMA 支援、first-touch 政策與相關系統呼叫的官方手冊頁。',
    },
    {
      title: 'numactl(8) — Linux manual page',
      href: 'https://man7.org/linux/man-pages/man8/numactl.8.html',
      description: 'numactl 指令的用法，包含 --cpunodebind、--membind、--interleave 等節點綁定選項。',
    },
    {
      title: 'std::hardware_destructive_interference_size - cppreference',
      href: 'https://en.cppreference.com/w/cpp/thread/hardware_destructive_interference_size',
      description: 'C++17 標準函式庫提供的快取行大小常數，用於避免 false sharing 的可攜寫法。',
    },
    {
      title: 'Optimizing Applications for NUMA (Intel Developer Zone)',
      href: 'https://www.intel.com/content/www/us/en/developer/articles/technical/optimizing-applications-for-numa.html',
      description: 'Intel 官方文章，說明 first-touch、執行緒親和性與 NUMA-aware 配置策略。',
    },
    {
      title: 'HugeTLB Pages — The Linux Kernel documentation',
      href: 'https://www.kernel.org/doc/html/latest/admin-guide/mm/hugetlbpage.html',
      description: 'Linux 核心文件，說明 huge pages 的設定、hugetlbfs 使用方式與 TLB 效益。',
    },
  ],
};

export default ind20MemoryNumaOptimization;
