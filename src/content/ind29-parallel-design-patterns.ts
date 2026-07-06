import type { ChapterContent } from '@/types/ChapterContent';

const ind29ParallelDesignPatterns: ChapterContent = {
  slug: 'ind29-parallel-design-patterns',
  chapterLabel: '第 58 章',
  title: '並行設計樣式',
  group: '第 18 部：架構、樣式與整合',
  description:
    'Producer-Consumer、Pipeline、Fork-Join、Actor、Active Object、Monitor 等樣式，以及 thread-per-request 對事件迴圈、SPMD/BSP 在 C++ 抽象下的表達。',
  concept: {
    standard: 'C++20',
    body: '並行設計樣式是把「多個執行流如何協作」的重複性問題結晶成可重用的結構。Producer-Consumer 以有界佇列解耦生產速率與消費速率；Pipeline 把工作切成多個階段，每個階段各自佔用一條或多條執行緒，資料像水流一樣依序流過；Fork-Join 是遞迴分治：把問題「fork」成子任務平行執行，再於「join」點彙整結果；Actor 讓每個運算單元只透過訊息傳遞溝通、彼此不共享可變狀態；Active Object 把方法呼叫（介面）與方法執行（實作、排程）解耦，呼叫端把請求丟進佇列即可返回，實際執行由專屬執行緒處理；Monitor 則是把同步邏輯封裝進物件本身，對外只曝露執行緒安全的操作，呼叫者無需關心鎖的存在。這些樣式並非互斥，實務上常組合使用，例如以 Active Object 包裝一個內部使用 Producer-Consumer 佇列的服務。',
  },
  code: {
    lang: 'cpp',
    code: `#include <condition_variable>
#include <deque>
#include <future>
#include <mutex>
#include <print>
#include <thread>

// Active Object：把「呼叫」與「執行」解耦。
// 公開介面回傳 std::future，實際工作在內部專屬執行緒上依序執行。 [1]
class Logger {
   public:
    Logger() : worker_(&Logger::run, this) {}

    ~Logger() {
        {
            std::lock_guard<std::mutex> lock(mutex_);
            stop_ = true;
        }
        cv_.notify_all();
        worker_.join();
    }

    // 公開方法立即返回 future，呼叫端不會被實際的 I/O 阻塞。 [2]
    std::future<void> log(std::string message) {
        auto task = std::make_shared<std::packaged_task<void()>>([msg = std::move(message)] {
            std::println("[log] {}", msg);  // 模擬耗時的實際輸出
        });
        std::future<void> fut = task->get_future();
        {
            std::lock_guard<std::mutex> lock(mutex_);
            queue_.push_back([task] { (*task)(); });  // [3] 請求進入內部佇列
        }
        cv_.notify_one();
        return fut;
    }

   private:
    // 專屬執行緒：Monitor 風格，所有存取都在鎖保護下完成。 [4]
    void run() {
        while (true) {
            std::function<void()> job;
            {
                std::unique_lock<std::mutex> lock(mutex_);
                cv_.wait(lock, [this] { return stop_ || !queue_.empty(); });  // [5]
                if (queue_.empty() && stop_) return;
                job = std::move(queue_.front());
                queue_.pop_front();
            }
            job();  // [6] 鎖已釋放，執行實際工作不阻塞其他呼叫端
        }
    }

    std::deque<std::function<void()>> queue_;
    std::mutex mutex_;
    std::condition_variable cv_;
    bool stop_ = false;
    std::thread worker_;
};

int main() {
    Logger logger;
    auto f1 = logger.log("hello");
    auto f2 = logger.log("world");
    f1.wait();
    f2.wait();
    return 0;
}`,
    callouts: [
      { n: 1, text: 'Active Object 的核心：介面（log）與執行（run 內部執行緒）分屬不同執行緒。' },
      {
        n: 2,
        text: '呼叫端得到 std::future，可選擇立即返回或稍後 wait／get 結果，達成非同步語意。',
      },
      { n: 3, text: '請求被打包成任務放入內部佇列，等同 Producer-Consumer 中生產者的角色。' },
      {
        n: 4,
        text: '所有共享狀態（queue_、stop_）只在 mutex_ 保護下存取，符合 Monitor 樣式的精神。',
      },
      { n: 5, text: '以條件變數搭配 predicate 等待，避免忙等並防止虛假喚醒造成錯誤行為。' },
      { n: 6, text: '執行任務前釋放鎖，讓耗時工作不會阻塞其他執行緒送入新請求。' },
    ],
  },
  deepDive: [
    {
      heading: 'Producer-Consumer、Pipeline、Fork-Join：資料如何流動',
      body: 'Producer-Consumer 樣式用一個有界佇列（可參考本教材 SPSC／MPMC 佇列章節）解耦生產者與消費者的速率差異：生產者滿了就阻塞或丟棄，消費者空了就等待，避免無界佇列造成記憶體暴增。Pipeline 是 Producer-Consumer 的鏈式延伸：每個階段既是前一階段的消費者，也是下一階段的生產者，各階段可平行執行、彼此透過佇列銜接，整體吞吐量由最慢的階段決定。\n\nFork-Join 則是另一種形狀：不是穩定的資料流，而是遞迴分治——把問題切成獨立子問題（fork），各自平行求解，最後在 join 點合併結果。C++ 中最直接的表達是 `std::async` 搭配 `std::future`，或以任務為粒度丟進執行緒池；標準庫的平行演算法（`std::reduce`、`std::transform_reduce` 搭配 `std::execution::par`）在實作內部往往正是用 fork-join 排程。',
    },
    {
      heading: 'Actor：訊息傳遞取代共享狀態',
      body: 'Actor 樣式的核心約束是「不共享可變狀態」：每個 actor 擁有自己的私有狀態，只能透過非同步訊息（通常是一個專屬的收件匣佇列）與其他 actor 溝通，且一次只處理一則訊息。這樣的隔離讓資料競爭在設計上就不可能發生，因為沒有任何記憶體位置被兩個執行緒同時可變存取。\n\nC++ 沒有內建的 actor runtime（不像 Erlang／Akka），但可以用「一個執行緒 + 一個訊息佇列 + 一個訊息迴圈」手動組出最小 actor：每個 actor 是一個物件，內部跑一個迴圈不斷從自己的佇列取出訊息並處理，其他 actor 只能呼叫它的 send 方法把訊息塞進佇列，不能直接觸碰其內部欄位。這與範例程式中的 Active Object 幾乎同構，差別在於 actor 通常強調「多個 actor 互相通訊組成系統」，而 Active Object 通常強調「單一物件把同步呼叫變成非同步」。',
    },
    {
      heading: 'Active Object 與 Monitor：把同步鎖進物件裡',
      body: 'Monitor 樣式的重點是封裝：物件的每一個公開方法在進入時自動取得鎖、離開時自動釋放，呼叫者完全不需要知道背後有鎖存在，也拿不到任何指向內部可變狀態的參考或指標——一旦洩漏了內部參考，呼叫端就能繞過鎖直接讀寫，Monitor 的保護就形同虛設。C++ 中最自然的實作方式是把 `std::mutex` 當成私有成員，在每個公開方法內用 `std::lock_guard` 或 `std::scoped_lock` 包住臨界區。\n\nActive Object 在 Monitor 的基礎上再加一層：不只是同步存取，而是把「執行」搬到另一條專屬執行緒上，呼叫端的方法呼叫變成「把請求放進佇列後立刻返回」，真正的執行發生在稍後、在 worker 執行緒的情境（context）中。範例程式的 `Logger` 正是如此：`log()` 這個公開方法本身不執行任何 I/O，只是把任務排入佇列並回傳 `future`，讓呼叫端可以選擇同步等待或繼續做其他事。',
    },
    {
      heading: 'Thread-per-request 對事件迴圈、SPMD 與 BSP',
      body: 'Thread-per-request 模型（每個連線／請求配一條執行緒）程式邏輯直觀：每條執行緒的程式碼可以線性、同步地書寫，不需要顯式的狀態機。但代價是每條執行緒都要配置獨立的呼叫堆疊（常見預設是數百 KB 到數 MB），且執行緒數一多，作業系統排程器的 context switch 成本與快取失效會急遽上升；當並發連線數達到數千甚至數萬時，這個模型會先於 CPU 或頻寬瓶頸就先耗盡記憶體或排程頻寬。事件迴圈（reactor／event-loop，概念上對應 epoll、io_uring 等 I/O 多工機制）改用少量執行緒（常是一條）搭配非阻塞 I/O 與回呼／協程，把「等待 I/O」變成「註冊事件、繼續處理下一個就緒事件」，用程式複雜度換取遠高的可擴充性，但也讓程式邏輯被拆散成回呼片段，除錯與推理因果變得更困難；C++20 的協程可在一定程度上把事件迴圈的程式碼寫回接近同步的樣貌。\n\nSPMD（Single Program, Multiple Data）與 BSP（Bulk Synchronous Parallel）是 HPC 常見的程式設計模型，在 C++ 中可具體對應：SPMD 通常表達為固定數量的 worker 執行緒，各自執行「相同的程式邏輯」但處理資料的不同切片（依 thread id 決定資料範圍），概念上與 GPU kernel 的 grid-of-threads 相似。BSP 則是把計算切成一連串「本地計算 → 全域同步屏障 → 通訊」的超步（superstep），C++20 的 `std::barrier` 正好對應這個同步點：所有 worker 各自完成本階段的本地計算後在 barrier 處等待，等全部到齊才一起進入下一個超步，確保跨執行緒的資料相依只在明確定義的同步點之後才被讀取。',
    },
  ],
  pitfalls: [
    '在極高並發（數千至數萬連線）情境仍採用 thread-per-request，導致堆疊記憶體與 context-switch 成本壓垮排程器，而非被 CPU 算力限制。',
    '實作 Monitor 時讓公開方法回傳內部容器的參考或迭代器，呼叫端因此能繞過鎖直接修改狀態，使封裝形同虛設。',
    'Pipeline 各階段成本不均卻用相同的並行度配置，最慢的階段成為全域瓶頸，其餘階段的執行緒等於閒置浪費。',
    '把 Actor 誤實作成「共享一塊記憶體、只是加了鎖」，而非真正透過訊息傳遞隔離狀態，失去 Actor 樣式原本要避免資料競爭的優勢。',
    'Active Object 的內部佇列無界成長：生產請求速率長期高於執行速率時，佇列無限累積導致記憶體用盡，應搭配有界佇列與背壓（backpressure）機制。',
  ],
  bestPractices: [
    '為 Monitor 類別的每個公開方法都在入口取得鎖、絕不回傳指向內部狀態的參考／指標，讓同步邏輯完全對呼叫端透明。',
    'Pipeline 依各階段實際耗時分配並行度（例如給慢階段更多執行緒或以資料並行切分），而不是每階段配置相同資源。',
    '高並發 I/O 服務優先採用事件迴圈／協程而非 thread-per-request；只有連線數可控或每連線需要大量 CPU 運算時才考慮固定執行緒池。',
    'BSP 風格的多階段平行迴圈使用 `std::barrier`（必要時搭配完成回呼）明確標示超步邊界，讓跨執行緒資料相依只在同步點之後才可見。',
    'Active Object／Producer-Consumer 的內部佇列一律設定容量上限並定義滿佇列時的行為（阻塞、丟棄或計數），避免無界佇列造成記憶體問題。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '下列何者最準確描述 Actor 樣式與 Monitor 樣式的關鍵差異？',
      options: [
        { id: 'a', text: 'Actor 一定比 Monitor 快，沒有其他差異' },
        {
          id: 'b',
          text: 'Actor 強調狀態完全私有、只透過訊息傳遞溝通；Monitor 則是把鎖封裝進物件的方法中，仍允許以同步方法呼叫存取共享狀態',
        },
        { id: 'c', text: '兩者是同一個樣式的不同名稱，可交換使用' },
        { id: 'd', text: 'Monitor 只能用於單執行緒程式' },
      ],
      correctOptionId: 'b',
      explanation:
        'Actor 靠訊息傳遞隔離狀態，任何時候都沒有兩個執行單元同時可變存取同一塊記憶體；Monitor 則是允許同步方法呼叫，但把鎖的取得與釋放封裝在物件內部，對呼叫者透明。',
    },
    {
      id: 'q2',
      stem: '為什麼在極高並發（例如數萬個同時連線）情境下，thread-per-request 模型通常會先遇到瓶頸？',
      options: [
        { id: 'a', text: '因為 C++ 不支援超過 1000 條執行緒' },
        {
          id: 'b',
          text: '因為每條執行緒需要獨立堆疊記憶體，且執行緒數一多，排程器的 context-switch 與快取失效成本會急遽上升，往往在 CPU 算力被用滿之前就先耗盡記憶體或排程頻寬',
        },
        { id: 'c', text: '因為 thread-per-request 無法處理任何 I/O' },
        { id: 'd', text: '因為每條執行緒都必須使用相同的全域鎖' },
      ],
      correctOptionId: 'b',
      explanation:
        '每條執行緒的堆疊與核心排程結構帶來固定開銷，執行緒數量隨連線數線性成長時，這些開銷會先於實際運算需求造成資源耗盡，這正是事件迴圈／reactor 模型改用少量執行緒搭配非阻塞 I/O 的原因。',
    },
    {
      id: 'q3',
      stem: '在 C++20 中，`std::barrier` 最適合用來表達下列哪一種 HPC 平行模型的同步點？',
      options: [
        { id: 'a', text: 'Actor 模型中 actor 之間的訊息傳遞' },
        {
          id: 'b',
          text: 'BSP（Bulk Synchronous Parallel）：各 worker 完成本地計算後同步等待，全部到齊才進入下一個超步',
        },
        { id: 'c', text: '事件迴圈中的非阻塞 I/O 註冊' },
        { id: 'd', text: 'Monitor 內部單一方法的臨界區保護' },
      ],
      correctOptionId: 'b',
      explanation:
        '`std::barrier` 提供可重複使用的同步屏障，讓一群執行緒在每個超步結束時互相等待，正好對應 BSP 模型「本地計算 → 全域同步 → 通訊」的階段劃分；臨界區保護通常用 mutex 而非 barrier。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['Producer-Consumer', 'Pipeline', 'Fork-Join', 'Actor / Active Object'],
    caption:
      '四類常見並行設計樣式：以佇列解耦速率、以階段串接資料流、以分治遞迴求解、以訊息傳遞隔離狀態；Monitor 則貫穿其中，負責封裝每個共享物件自身的同步邏輯。',
  },
  tryIt: {
    code: `#include <barrier>
#include <iostream>
#include <thread>
#include <vector>

// SPMD + BSP：固定數量 worker 執行緒各自處理資料切片，
// 每個超步結束後在 barrier 同步，確保下一階段能安全讀到上一階段結果。
int main() {
    constexpr int num_workers = 4;
    constexpr int steps = 3;
    std::vector<int> data(num_workers, 0);

    std::barrier sync_point(num_workers);
    std::vector<std::thread> workers;

    for (int id = 0; id < num_workers; ++id) {
        workers.emplace_back([&, id] {
            for (int step = 0; step < steps; ++step) {
                data[id] += id + step;  // 本地計算（SPMD：相同程式、不同資料）
                sync_point.arrive_and_wait();  // BSP：等所有 worker 完成本超步
            }
        });
    }
    for (auto& t : workers) t.join();

    for (int id = 0; id < num_workers; ++id)
        std::cout << "worker " << id << " -> " << data[id] << "\\n";
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::barrier - cppreference',
      href: 'https://en.cppreference.com/w/cpp/thread/barrier',
      description: 'C++20 可重複使用同步屏障的介面與語意，適合表達 BSP 超步邊界。',
    },
    {
      title:
        'Pattern-Oriented Software Architecture, Volume 2: Patterns for Concurrent and Networked Objects',
      href: 'https://www.dre.vanderbilt.edu/~schmidt/POSA/POSA2/',
      description:
        '收錄 Active Object、Monitor Object、Reactor、Half-Sync/Half-Async 等並行樣式的經典參考書資訊頁。',
    },
    {
      title: 'The Reactor Pattern',
      href: 'https://www.dre.vanderbilt.edu/~schmidt/PDF/reactor-siemens.pdf',
      description:
        'Douglas Schmidt 對 Reactor（事件迴圈）樣式的原始論文，說明如何以單執行緒多工處理多個 I/O 事件來源。',
    },
    {
      title: 'C++ Concurrency in Action — 樣式相關章節資訊',
      href: 'https://www.manning.com/books/c-plus-plus-concurrency-in-action-second-edition',
      description:
        'Anthony Williams 著作，涵蓋以 future／task 為基礎的 fork-join 與訊息傳遞式並行設計實務。',
    },
  ],
};

export default ind29ParallelDesignPatterns;
