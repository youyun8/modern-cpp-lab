import type { ChapterContent } from '@/types/ChapterContent';

const ind12ConcurrentContainers: ChapterContent = {
  slug: 'ind12-concurrent-containers',
  chapterLabel: '第 41 章',
  title: '並行容器實作',
  group: '第 11 部：無鎖與並行資料結構',
  description:
    'SPSC／MPMC 環形佇列、Michael-Scott queue、無鎖堆疊，以及何時該用 TBB／libcds／folly 而非自造。',
  concept: {
    standard: 'C++20',
    body: '並行容器是 HPC runtime、訊息傳遞框架與事件系統的基礎建材。最簡單也最快的是 SPSC（single-producer-single-consumer）環形佇列：因為永遠只有一個執行緒寫入頭指標、一個執行緒寫入尾指標，兩者之間只需要一對 acquire/release 同步，其餘讀寫都能用 memory_order_relaxed，完全不需要 CAS。一旦變成 MPMC（multi-producer-multi-consumer），多個執行緒會競爭同一個索引，必須引入 compare_exchange 迴圈或如 LMAX Disruptor 的每格序號（sequence number）機制來仲裁誰取得哪個槽位。Michael-Scott queue 用 dummy node 讓佇列永遠「至少有一個節點」，藉此消除空佇列與單一節點時的特殊情況分支。並行雜湊表則常見以分段鎖（sharded／striped locking）換取平行度，而非整表上鎖。這些結構的正確性依賴精確的記憶體順序與 ABA／記憶體回收處理，正確驗證極為困難，生產環境應優先選用 TBB、libcds、folly 等經審查的函式庫，只有在效能剖析證明必要且能投入完整驗證資源時才自行實作。',
  },
  deepDive: [
    {
      heading: 'SPSC 環形佇列：為何可以完全無鎖且幾乎不用 CAS',
      body: 'SPSC（single-producer-single-consumer）環形佇列是最便宜的並行資料結構，因為競爭型態被限制到最小：只有生產者會寫入 `tail`（寫入位置）、只有消費者會寫入 `head`（讀取位置），彼此只會讀取對方寫入的變數，從不會有兩個執行緒同時寫入同一個原子變數。\n\n這代表協定只需要一對 acquire/release：生產者寫入資料後以 `memory_order_release` 更新 `tail_`，消費者以 `memory_order_acquire` 讀取 `tail_` 來確認資料已可見，這個 release-acquire pair 保證資料本體的寫入不會被重排到 `tail_` 更新之後（也不會被消費者看到 `tail_` 更新卻看不到資料）。至於生產者讀自己的 `head_`、消費者讀自己的 `tail_`（用來判斷佇列是否已滿／空的「本地快取」讀取）都可以用 `memory_order_relaxed`，因為那只是自己執行緒的快取優化，不涉及跨執行緒同步。整個實作不需要任何 CAS 迴圈，這也是 SPSC 環形佇列常見於 HPC runtime 執行緒間傳遞任務、音訊/封包處理管線等單一生產者對單一消費者場景的原因。',
    },
    {
      heading: 'MPMC 環形佇列：多方競爭迫使引入 CAS 或序號機制',
      body: '一旦允許多個生產者或多個消費者，SPSC 的假設就不成立了：多個執行緒可能同時想把資料寫進同一個 `tail_` 索引，或同時想從同一個 `head_` 索引取值。單純的 load-then-store 會產生資料競爭與遺失更新，因此 MPMC 環形佇列至少需要以下兩種手段之一。\n\n第一種是用 `compare_exchange` 迴圈搶佔索引：每個生產者先讀取目前 `tail_`，計算下一個索引，再用 CAS 嘗試把 `tail_` 更新為新值，失敗就重讀重試，成功才寫入資料。第二種是 LMAX Disruptor 提出的「每格序號」設計：環形緩衝區的每一格額外儲存一個序號（sequence），生產者／消費者用該序號而非全域索引來判斷這一格是否輪到自己讀寫，避免所有生產者集中競爭同一個 `tail_` 原子變數，能大幅降低快取行爭用（cache-line contention）並提升吞吐量。無論哪種手段，MPMC 版本都比 SPSC 複雜得多，也更容易寫錯記憶體順序。',
    },
    {
      heading: 'Michael-Scott queue：dummy node 消除邊界情況',
      body: 'Michael-Scott（M&S）queue 是教科書等級的無鎖 FIFO 佇列，核心技巧是永遠保留一個「假節點」（dummy/sentinel node）作為佇列的起點，讓 `head_` 永遠指向一個節點，`head_->next` 才是真正的第一筆資料。\n\n如果沒有 dummy node，「佇列為空」與「佇列只有一個節點」會是兩種需要分別處理的特殊情況（例如 dequeue 最後一個節點時要同時更新 head 與 tail，還要避免另一個執行緒同時 enqueue 到同一個位置）。有了 dummy node，enqueue 一律是「在 tail 之後接上新節點、再把 tail 前移」的兩步 CAS 協定，dequeue 一律是「讀出 head->next 的值、把 head 前移到原本的 head->next、釋放舊 dummy」，兩者都不需要為空佇列或單節點佇列寫特殊分支，大幅降低了正確性成本——但節點的安全回收（避免其他執行緒仍在存取即將釋放的舊 dummy）仍然需要 hazard pointers 或 epoch-based reclamation 等機制。',
    },
    {
      heading: '並行雜湊表的分段策略與 build-vs-buy 原則',
      body: '並行雜湊表最常見的做法不是把整張表包在一個鎖裡（那等於序列化所有存取），而是分段鎖（sharded／striped locking）：把雜湊空間切成 N 個桶區（bucket group），每個桶區有自己獨立的鎖，只有雜湊到同一桶區的操作才會互相阻塞，其餘桶區可以完全平行存取。更進階的設計會讓每個 bucket 本身是一條無鎖鏈結串列或使用 RCU 讀取路徑，寫入路徑才短暫上鎖，藉此讓讀多寫少的工作負載幾乎不受鎖影響。\n\n無論是環形佇列、M&S queue 還是並行雜湊表，這類結構的正確性都仰賴極其精確的記憶體順序、ABA 問題防範與安全記憶體回收，而這些屬性幾乎不可能只靠人工推理或一般測試證明——需要 ThreadSanitizer、模型檢查器（如 relacy）甚至形式化驗證才有信心。因此業界的共識是：優先使用 Intel TBB 的 `concurrent_hash_map`、libcds 或 folly 的 `ConcurrentHashMap` 等已經過大量生產環境與同儕審查的實作，只有在效能剖析明確指出既有函式庫是瓶頸、且團隊有能力投入完整的併發驗證資源時，才考慮自行實作無鎖容器。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <atomic>
#include <cstddef>
#include <optional>

// Fixed-capacity SPSC (single-producer-single-consumer) ring buffer. [1]
template <typename T, std::size_t Capacity>
class SpscRingBuffer {
   public:
    // push is only ever called by the single producer thread.
    bool push(T value) {
        const std::size_t tail = tail_.load(std::memory_order_relaxed);  // [2]
        const std::size_t next = (tail + 1) % Capacity;
        if (next == head_.load(std::memory_order_acquire)) {  // [3]
            return false;                                     // Queue is full.
        }
        buffer_[tail] = std::move(value);
        tail_.store(next, std::memory_order_release);  // [4]
        return true;
    }

    // try_pop is only ever called by the single consumer thread.
    std::optional<T> try_pop() {
        const std::size_t head = head_.load(std::memory_order_relaxed);  // [5]
        if (head == tail_.load(std::memory_order_acquire)) {
            return std::nullopt;  // Queue is empty.
        }
        T value = std::move(buffer_[head]);
        head_.store((head + 1) % Capacity, std::memory_order_release);  // [6]
        return value;
    }

   private:
    T buffer_[Capacity]{};
    alignas(64) std::atomic<std::size_t> head_{0};  // Written only by the consumer.
    alignas(64) std::atomic<std::size_t> tail_{0};  // Written only by the producer; each gets its own cache line.
};`,
    callouts: [
      {
        n: 1,
        text: 'SPSC 假設全程只有一個生產者呼叫 push、一個消費者呼叫 try_pop，因此不需要任何 CAS。',
      },
      {
        n: 2,
        text: '生產者讀取自己上次寫入的 tail_，用 relaxed 即可，因為這只是本地執行緒的狀態。',
      },
      {
        n: 3,
        text: '讀取消費者寫入的 head_ 需要 acquire，確保後續寫入資料前能看到消費者已釋放的空間。',
      },
      {
        n: 4,
        text: '寫完資料後用 release 發佈新的 tail_，讓消費者的 acquire 讀取能看到資料本體，形成唯一需要的同步點。',
      },
      { n: 5, text: '消費者讀取自己上次寫入的 head_，同樣用 relaxed，理由與生產者對稱。' },
      { n: 6, text: '讀完資料後用 release 發佈新的 head_，讓生產者能安全地重用這個槽位。' },
    ],
  },
  pitfalls: [
    '把 SPSC 環形佇列誤用在多生產者或多消費者場景：多個執行緒同時寫入同一個 tail_／head_ 會產生資料競爭，必須改用 MPMC 設計（CAS 迴圈或每格序號）。',
    'head_ 與 tail_ 放在同一條快取行（未 `alignas` 隔開）會造成 false sharing：生產者更新 tail_、消費者更新 head_ 時互相使對方的快取行失效，嚴重拖慢吞吐量。',
    '把「本地快取」讀取（讀自己上次寫入的索引）誤用 acquire／release，或把「跨執行緒同步」讀取誤用 relaxed，兩者都會破壞正確性或浪費效能。',
    '看到需求就直接自己刻無鎖雜湊表或 MPMC 佇列，卻沒有 ThreadSanitizer、模型檢查等驗證手段，容易產生極難重現的併發臭蟲。',
    '忽略 ABA 問題與節點回收：自製 Michael-Scott queue 若直接 delete 被摘除的節點，其他執行緒可能仍持有指向它的指標。',
  ],
  bestPractices: [
    '把並行讀寫的原子變數（如 SPSC 的 head_／tail_）以 `alignas(64)` 隔開到各自的快取行，避免 false sharing（延續第 31 章快取一致性與第 49 章效能除錯的概念）。',
    '只在真正跨執行緒同步的讀寫上使用 acquire／release，其餘讀自己執行緒寫入的狀態一律用 relaxed，並在程式碼註解說明每個順序的理由。',
    '優先選用 TBB `concurrent_hash_map`、libcds 或 folly `ConcurrentHashMap`／`ProducerConsumerQueue` 等經審查的函式庫，自製容器僅在效能剖析證明必要時才考慮。',
    '若必須自製無鎖容器，務必搭配 ThreadSanitizer、壓力測試與（若可行）模型檢查工具驗證正確性，而非僅憑人工推理。',
    'MPMC 場景優先評估 Disruptor 式的每格序號設計，而非直接對單一索引做高競爭 CAS，能顯著降低快取行爭用。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '為什麼 SPSC 環形佇列可以完全不使用 compare_exchange？',
      options: [
        { id: 'a', text: '因為容量固定，資料不會遺失' },
        {
          id: 'b',
          text: '因為只有唯一的生產者寫 tail_、唯一的消費者寫 head_，彼此只讀取對方的變數，不會有兩個執行緒競爭同一次寫入',
        },
        { id: 'c', text: '因為 std::atomic 內部自動使用鎖' },
        { id: 'd', text: '因為編譯器會自動插入 CAS' },
      ],
      correctOptionId: 'b',
      explanation:
        'CAS 存在的目的是仲裁多個執行緒對同一變數的並發寫入；SPSC 因為寫入者身份固定且唯一，天生不存在這種競爭，因此只需一對 acquire/release 同步資料可見性即可。',
    },
    {
      id: 'q2',
      stem: 'Michael-Scott queue 使用 dummy node 的主要目的是什麼？',
      options: [
        { id: 'a', text: '減少記憶體使用量' },
        {
          id: 'b',
          text: '讓佇列永遠至少有一個節點，消除「空佇列」與「單一節點」在 enqueue／dequeue 時需要的特殊分支處理',
        },
        { id: 'c', text: '加速雜湊運算' },
        { id: 'd', text: '讓佇列自動排序元素' },
      ],
      correctOptionId: 'b',
      explanation:
        'dummy node 讓 head_ 永遠指向一個節點、真正的資料從 head_->next 開始，使 enqueue／dequeue 能用統一的兩步 CAS 協定處理，不需要為邊界情況（空佇列、只剩一個節點）另外寫分支。',
    },
    {
      id: 'q3',
      stem: '關於並行雜湊表與是否自行實作無鎖容器，下列何者最符合業界建議的原則？',
      options: [
        { id: 'a', text: '任何情況都應該自行實作以獲得最佳效能' },
        {
          id: 'b',
          text: '應優先評估 TBB、libcds、folly 等經審查的函式庫，只有在效能剖析證明必要且能投入完整驗證資源時才自製，因為正確的無鎖容器極難驗證',
        },
        { id: 'c', text: '並行雜湊表只能用單一全域鎖，沒有其他選擇' },
        { id: 'd', text: '無鎖容器一定比加鎖容器快，應無條件優先選用' },
      ],
      correctOptionId: 'b',
      explanation:
        '無鎖與精細鎖定容器的正確性依賴精確的記憶體順序、ABA 防範與安全回收，難以靠一般測試證明，因此應優先選用經審查的成熟函式庫，自製僅在必要且能充分驗證時才考慮。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: [
      'SPSC 環形佇列',
      'MPMC 環形佇列（CAS／序號）',
      'Michael-Scott Queue',
      '無鎖堆疊',
      '分段鎖雜湊表',
    ],
    caption:
      '並行容器的複雜度光譜：從只需一對 acquire/release 的 SPSC 環形佇列，到需要 CAS 或序號仲裁的 MPMC 結構，再到以分段鎖換取平行度的雜湊表。',
  },
  tryIt: {
    code: `#include <atomic>
#include <cstddef>
#include <iostream>
#include <optional>
#include <thread>

// Simplified SPSC ring buffer, demonstrating the minimal relaxed/acquire/release synchronization.
template <typename T, std::size_t Capacity>
class SpscRingBuffer {
   public:
    bool push(T value) {
        const std::size_t tail = tail_.load(std::memory_order_relaxed);
        const std::size_t next = (tail + 1) % Capacity;
        if (next == head_.load(std::memory_order_acquire)) {
            return false;
        }
        buffer_[tail] = value;
        tail_.store(next, std::memory_order_release);
        return true;
    }

    std::optional<T> try_pop() {
        const std::size_t head = head_.load(std::memory_order_relaxed);
        if (head == tail_.load(std::memory_order_acquire)) {
            return std::nullopt;
        }
        T value = buffer_[head];
        head_.store((head + 1) % Capacity, std::memory_order_release);
        return value;
    }

   private:
    T buffer_[Capacity]{};
    std::atomic<std::size_t> head_{0};
    std::atomic<std::size_t> tail_{0};
};

int main() {
    SpscRingBuffer<int, 1024> queue;

    std::thread producer([&queue]() {
        for (int i = 0; i < 100000; ++i) {
            while (!queue.push(i)) {
                // Queue is full; busy-wait and retry.
            }
        }
    });

    long long sum = 0;
    std::thread consumer([&queue, &sum]() {
        for (int i = 0; i < 100000; ++i) {
            std::optional<int> value;
            while (!(value = queue.try_pop())) {
                // Queue is empty; busy-wait and retry.
            }
            sum += *value;
        }
    });

    producer.join();
    consumer.join();
    std::cout << "sum = " << sum << " (should be 4999950000)\\n";
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'oneTBB concurrent_hash_map',
      href: 'https://oneapi-src.github.io/oneTBB/main/tbb_userguide/concurrent_hash_map.html',
      description: 'Intel oneTBB 分段鎖並行雜湊表的官方使用指南。',
    },
    {
      title: 'libcds — Concurrent Data Structures library',
      href: 'https://github.com/khizmax/libcds',
      description:
        '涵蓋 Michael-Scott queue、無鎖堆疊與多種 hazard pointer 回收策略的 C++ 函式庫。',
    },
    {
      title:
        'Simple, Fast, and Practical Non-Blocking and Blocking Concurrent Queue Algorithms (Michael & Scott, 1996)',
      href: 'https://www.cs.rochester.edu/~scott/papers/1996_PODC_queues.pdf',
      description:
        'Michael-Scott queue 的原始論文，說明 dummy node 與 enqueue／dequeue 的 CAS 協定。',
    },
    {
      title: 'The LMAX Disruptor',
      href: 'https://lmax-exchange.github.io/disruptor/disruptor.html',
      description: '以每格序號取代單一索引 CAS 的高吞吐量 MPMC 環形緩衝區設計。',
    },
  ],
};

export default ind12ConcurrentContainers;
