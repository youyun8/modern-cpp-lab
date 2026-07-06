import type { ChapterContent } from '@/types/ChapterContent';

const ind10LockFreeBasics: ChapterContent = {
  slug: 'ind10-lock-free-basics',
  chapterLabel: '第 39 章',
  title: '無鎖程式設計基礎',
  group: '第 11 部：無鎖與並行資料結構',
  description:
    'wait-free／lock-free／obstruction-free 三種 progress guarantee 的精確定義，無鎖為何在高競爭下不必然更快，以及記憶體回收難題的初步鋪陳。',
  concept: {
    standard: 'C++11',
    body: '無鎖程式設計（lock-free programming）是以原子操作（std::atomic）取代互斥鎖來協調多執行緒對共享狀態的存取。它不是單一技術，而是一套「進度保證」（progress guarantee）的分類：wait-free、lock-free、obstruction-free 由強到弱排列，描述的是「在最壞情況的排程下，系統能否持續往前推進」，而非單純的效能承諾。理解這三個名詞的精確定義，是判斷一個無鎖資料結構是否真的解決了你的問題（例如即時系統的延遲上界、避免優先反轉）的前提。同樣重要的是破除迷思：無鎖不等於更快——在高競爭下，CAS 重試與快取一致性流量可能讓無鎖結構比一把設計良好的鎖還慢。本章聚焦於分類與效能直覺，記憶體回收（reclamation）的具體解法留給下一章。',
  },
  deepDive: [
    {
      heading: '進度保證的三個等級：精確定義',
      body: '`wait-free`：每個呼叫此操作的執行緒，都保證在有限、且與其他執行緒排程無關的步驟數內完成。即使排程器故意讓其他所有執行緒無限搶佔你，你仍會在有限步驟內完成。這是最強的保證，也最難實作。範例：一個以固定大小陣列實作、每個執行緒各自寫入專屬 slot 的 wait-free 計數器——每個執行緒只要一次 `fetch_add` 就完成，不受他人影響。\n\n`lock-free`：不保證每個執行緒都能在有限步驟內完成，但保證系統整體一定有進展——換句話說，只要持續執行，就一定有某個執行緒的操作會成功，不會出現「所有執行緒都卡住」的情況。典型範例是以 CAS 迴圈實作的無鎖堆疊 push：某次 CAS 失敗的執行緒代表別的執行緒的 CAS 成功了，系統整體仍在前進，即使那個倒楣的執行緒可能重試很多次。\n\n`obstruction-free`：保證只在「沒有其他執行緒同時競爭」的條件下，單一執行緒能在有限步驟內完成；一旦有競爭，甚至可能所有執行緒都活鎖（livelock，彼此不斷讓對方的操作失效而誰都無法完成）。這是最弱的保證，通常需要搭配退避（backoff）或優先權機制才能在實務上可用。三者的關係是包含：wait-free 蘊含 lock-free，lock-free 蘊含 obstruction-free，但反之不成立。',
    },
    {
      heading: '為何無鎖不等於更快',
      body: '無鎖結構的直覺賣點是「不用鎖，所以沒有鎖競爭、沒有優先反轉、沒有死鎖」。但這個直覺忽略了 CAS 迴圈本身的成本結構：每次 CAS 失敗代表一次「白做工」——執行緒讀了一份舊資料、做了計算、嘗試寫回，結果因為別人搶先而整套作廢，必須重讀重算。在低競爭下這個成本可忽略；但在高競爭（例如數十個執行緒同時對同一個 `std::atomic` 做 CAS）下，會出現 CAS retry storm：大量執行緒同時重試，彼此持續使對方的 CAS 失效。\n\n更根本的問題是快取一致性流量（cache-coherence traffic，銜接第 31 章 MESI 協定）。每一次 CAS 嘗試，無論成功與否，都需要以獨佔（Exclusive/Modified）狀態取得該快取線的所有權。當多個核心競爭同一條快取線時，這條線會在核心間反覆彈跳（cache-line ping-pong），每次彈跳都是一次跨核心、甚至跨 NUMA node 的匯流排交易，延遲遠高於一次本地快取存取。相較之下，一把設計良好的互斥鎖在競爭時會讓失敗的執行緒直接睡眠（透過 futex），不會產生這種持續的匯流排流量。因此，在高競爭、低臨界區工作量的場景，無鎖 CAS 迴圈的總線流量可能反而超過鎖的開銷，實測效能更差。這也是為何業界建議「先量測、再決定」，而不是預設無鎖優於有鎖。',
    },
    {
      heading: '記憶體回收難題：下一章的伏筆',
      body: '無鎖資料結構最棘手的部分，往往不是 CAS 邏輯本身，而是「何時可以安全釋放一個節點」。考慮一個無鎖佇列：執行緒 A 正在讀取節點 N 的內容（例如透過已經載入的指標在做 `N->value`），與此同時執行緒 B 把 N 從佇列中移除並呼叫 `delete N`。如果 A 的讀取發生在 `delete` 之後，這就是一次釋放後使用（use-after-free）——即使 A 讀到的指標在移除當下是合法的，記憶體已經被回收甚至被重新配置給別的用途。\n\n互斥鎖版本的資料結構沒有這個問題，因為持有鎖期間保證沒有其他執行緒在存取；但無鎖結構刻意不用鎖，所以無法用「鎖住就安全」這個保證。你需要額外機制回答「所有可能持有這個節點指標的執行緒都已經不再需要它了嗎？」這正是記憶體回收（memory reclamation）問題，常見解法包括 hazard pointers、epoch-based reclamation（EBR）與 RCU（read-copy-update），它們的核心思路都是讓讀者「登記」自己正在存取的節點，回收者延後釋放直到確認沒有讀者。這些技術複雜且容易出錯，將是下一章的主題；本章先建立問題意識：只要你的無鎖結構會刪除節點，就必須有一套回收策略，`delete` 絕不能天真地緊跟在「從結構中移除」之後。',
    },
    {
      heading: '什麼時候值得無鎖：實務決策框架',
      body: '無鎖程式設計的複雜度與除錯成本都遠高於互斥鎖，因此在動手之前應該先問幾個問題。第一，是否有硬性的延遲上界或即時性需求（例如音訊處理、交易系統）？若有，wait-free 的可預測延遲可能是唯一可接受的選項，因為鎖可能導致無界的等待。第二，是否存在優先反轉風險（低優先權執行緒持有鎖，卻被中優先權執行緒搶佔，導致高優先權執行緒被間接餓死）？無鎖可以規避這個問題，但作業系統層的優先權繼承鎖（priority-inheritance mutex）也是替代方案。第三，實際競爭程度如何？在競爭極低的場景（大部分時間只有一個執行緒在存取），鎖的快速路徑（fast path，例如 `std::mutex` 在無競爭時可能只需一次原子操作）與無鎖 CAS 的成本相近，此時無鎖的額外複雜度未必划算。\n\n實務建議是：優先使用經過同儕審查、廣泛測試的既有無鎖函式庫（如 folly、boost.lockfree、moodycamel::ConcurrentQueue），而非自行實作；只有在效能量測明確顯示鎖是瓶頸、且團隊有能力承擔 ABA 與記憶體回收的複雜度時，才考慮自製無鎖結構，並務必搭配 ThreadSanitizer 與壓力測試驗證正確性。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <atomic>
#include <chrono>
#include <iostream>
#include <thread>
#include <vector>

// Observe a CAS retry storm: multiple threads do high-frequency CAS on the same atomic counter. [1]
std::atomic<long long> shared_counter{0};
std::atomic<long long> retry_count{0};  // [2] Counts CAS failures (retries), for teaching purposes only.

void hammer(int iterations) {
    for (int i = 0; i < iterations; ++i) {
        long long expected = shared_counter.load(std::memory_order_relaxed);  // [3]
        // When compare_exchange_weak fails, it updates expected to the current value,
        // so the loop can retry directly without a manual reload. [4]
        while (!shared_counter.compare_exchange_weak(
            expected, expected + 1, std::memory_order_relaxed, std::memory_order_relaxed)) {
            retry_count.fetch_add(1, std::memory_order_relaxed);  // [5] Each failure represents wasted work.
        }
    }
}

int main() {
    constexpr int kThreads = 8;
    constexpr int kItersPerThread = 200000;

    std::vector<std::thread> workers;
    auto start = std::chrono::steady_clock::now();
    for (int t = 0; t < kThreads; ++t) {
        workers.emplace_back(hammer, kItersPerThread);
    }
    for (auto& w : workers) {
        w.join();
    }
    auto elapsed = std::chrono::steady_clock::now() - start;

    // [6] The higher the contention (more threads, smaller critical section), the ratio of
    // retry_count to total operations typically rises significantly — this is quantitative evidence of a CAS retry storm.
    std::cout << "counter = " << shared_counter.load() << "\\n";
    std::cout << "retries = " << retry_count.load() << "\\n";
    std::cout << "elapsed(ms) = "
              << std::chrono::duration_cast<std::chrono::milliseconds>(elapsed).count() << "\\n";
    return 0;
}`,
    callouts: [
      {
        n: 1,
        text: '刻意讓多個執行緒對同一顆 atomic 變數做高頻率 CAS，用來觀察高競爭下的重試行為。',
      },
      { n: 2, text: '額外用一個 atomic 計數器統計失敗次數，僅為教學示範；正式程式碼通常不需要。' },
      { n: 3, text: '每次迴圈重新讀取目前值作為 CAS 的期望值。' },
      {
        n: 4,
        text: 'compare_exchange_weak 失敗時會自動把 expected 更新為目前實際值，因此可以直接重試。',
      },
      {
        n: 5,
        text: '每一次 CAS 失敗都代表一次讀取與計算被丟棄，這正是 CAS retry storm 的成本來源。',
      },
      {
        n: 6,
        text: '把執行緒數調高並觀察 retries 與 elapsed 的變化，可直接感受到高競爭下無鎖不必然更快。',
      },
    ],
  },
  pitfalls: [
    '把「無鎖」等同於「一定更快」——高競爭下 CAS retry storm 與快取一致性流量可能讓它比鎖更慢。',
    '只驗證正確性、不量測效能，就假設無鎖版本在生產環境中的競爭情境下依然占優。',
    '混淆 lock-free 與 wait-free：以為系統整體有進展，就代表每個執行緒都有延遲上界，實際上 lock-free 不保證這點。',
    '完全忽略記憶體回收問題，直接對移除的節點呼叫 `delete`，等到壓力測試才發現偶發的釋放後使用。',
    '忽略 ABA 問題：只檢查值是否相等，未察覺期間值曾被改動又改回，導致 CAS 誤判為「沒有變化」。',
  ],
  bestPractices: [
    '動手實作前，先用效能量測工具在目標競爭程度下比較鎖與無鎖版本，而非憑直覺選擇。',
    '明確分辨你真正需要的是 wait-free（硬延遲上界）還是 lock-free（整體吞吐）保證，兩者的設計代價差異很大。',
    '優先採用經同儕審查的既有無鎖函式庫，除非量測證實有必要自行實作。',
    '一旦資料結構涉及節點刪除，在設計初期就規劃記憶體回收策略（hazard pointers、EBR 等），不要事後補救。',
    '以 ThreadSanitizer 與長時間壓力測試驗證無鎖程式碼，因為其錯誤往往是低機率、難重現的競態。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '下列何者最準確描述 lock-free 與 wait-free 的差異？',
      options: [
        {
          id: 'a',
          text: 'lock-free 保證每個執行緒都在有限步驟內完成；wait-free 只保證系統整體有進展',
        },
        {
          id: 'b',
          text: 'wait-free 保證每個執行緒都在有限步驟內完成，不受其他執行緒排程影響；lock-free 只保證系統整體至少有一個執行緒能持續前進',
        },
        { id: 'c', text: '兩者完全相同，只是命名習慣不同' },
        { id: 'd', text: 'lock-free 一定比 wait-free 快，因為限制較少' },
      ],
      correctOptionId: 'b',
      explanation:
        'wait-free 是更強的保證：每個執行緒無論排程如何都能在有限步驟內完成；lock-free 較弱，只保證系統整體持續前進，個別執行緒可能被迫多次重試。',
    },
    {
      id: 'q2',
      stem: '在高執行緒競爭、臨界區工作量極小的場景，為什麼一個以 CAS 迴圈實作的無鎖計數器可能比互斥鎖版本更慢？',
      options: [
        { id: 'a', text: '因為 std::atomic 在硬體上比 std::mutex 慢一個數量級' },
        {
          id: 'b',
          text: '因為大量執行緒反覆對同一條快取線做 CAS，造成快取一致性流量暴增與持續重試，而鎖在競爭時會讓執行緒睡眠、不產生持續匯流排流量',
        },
        { id: 'c', text: '因為 CAS 是一個系統呼叫，開銷比使用者態的鎖更高' },
        { id: 'd', text: '因為 compare_exchange_weak 在多核心系統上不是原子的' },
      ],
      correctOptionId: 'b',
      explanation:
        '高競爭下所有執行緒反覆爭奪同一條快取線的獨佔權，造成快取線在核心間彈跳與大量重試（CAS retry storm）；相較之下失敗的鎖競爭者通常會睡眠，不持續消耗匯流排頻寬。',
    },
    {
      id: 'q3',
      stem: '為什麼無鎖資料結構在刪除節點時不能直接呼叫 `delete`？',
      options: [
        { id: 'a', text: '因為 `delete` 不是原子操作，在多執行緒下語法上不合法' },
        {
          id: 'b',
          text: '因為其他執行緒可能仍持有指向該節點的指標並正在存取它，直接釋放會造成釋放後使用',
        },
        { id: 'c', text: '因為 `delete` 會自動觸發鎖，違反無鎖設計的初衷' },
        { id: 'd', text: '因為無鎖結構的節點必須配置在堆疊上，不能用 `delete`' },
      ],
      correctOptionId: 'b',
      explanation:
        '無鎖結構沒有鎖來保證「此刻沒有人在存取這個節點」，其他執行緒可能已經讀取了指向該節點的指標並準備存取；必須靠 hazard pointers、epoch-based reclamation 等機制確認安全後才能回收，這正是下一章的主題。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: [
      'Wait-free（保證每執行緒有限步驟）',
      'Lock-free（保證系統整體前進）',
      'Obstruction-free（僅無競爭時保證）',
      '有鎖備案（睡眠等待，避免匯流排風暴）',
    ],
    caption:
      '進度保證由強到弱排列：wait-free 蘊含 lock-free，lock-free 蘊含 obstruction-free；高競爭且複雜度不划算時，回退到設計良好的鎖仍是合理選項。',
  },
  tryIt: {
    code: `#include <atomic>
#include <iostream>
#include <thread>
#include <vector>

// Simplified version: measures CAS retry counts under different thread counts.
std::atomic<long long> counter{0};
std::atomic<long long> retries{0};

void worker(int iters) {
    for (int i = 0; i < iters; ++i) {
        long long cur = counter.load(std::memory_order_relaxed);
        while (!counter.compare_exchange_weak(cur, cur + 1, std::memory_order_relaxed)) {
            retries.fetch_add(1, std::memory_order_relaxed);
        }
    }
}

int main() {
    constexpr int kThreads = 4;
    std::vector<std::thread> ts;
    for (int t = 0; t < kThreads; ++t) {
        ts.emplace_back(worker, 50000);
    }
    for (auto& t : ts) {
        t.join();
    }

    std::cout << "counter = " << counter.load() << "\\n";
    std::cout << "retries = " << retries.load() << "\\n";
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::atomic<T>::is_lock_free - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/atomic/atomic/is_lock_free',
      description: '如何在執行期檢查特定型別的原子操作是否確實為無鎖實作。',
    },
    {
      title: 'Preshing on Programming: Lock-Free Programming',
      href: 'https://preshing.com/20120612/an-introduction-to-lock-free-programming/',
      description: '對 wait-free／lock-free／obstruction-free 與常見無鎖模式的深入淺出介紹。',
    },
    {
      title:
        'Simple, Fast, and Practical Non-Blocking and Blocking Concurrent Queue Algorithms (Michael & Scott, 1996)',
      href: 'https://www.cs.rochester.edu/~scott/papers/1996_PODC_queues.pdf',
      description: '無鎖佇列的經典論文，奠定後續多數無鎖資料結構設計的基礎。',
    },
    {
      title: 'C++ Concurrency in Action — Lock-free concurrent data structures',
      href: 'https://www.manning.com/books/c-plus-plus-concurrency-in-action-second-edition',
      description: '涵蓋進度保證分類、CAS 迴圈設計與記憶體回收概觀的系統性參考書。',
    },
  ],
};

export default ind10LockFreeBasics;
