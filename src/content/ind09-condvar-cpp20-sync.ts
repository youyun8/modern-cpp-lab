import type { ChapterContent } from '@/types/ChapterContent';

const ind09CondvarCpp20Sync: ChapterContent = {
  slug: 'ind09-condvar-cpp20-sync',
  chapterLabel: '第 38 章',
  title: '條件變數與 C++20 新同步原語',
  group: '第 10 部：執行緒與同步',
  description:
    'condition_variable 的 spurious/lost wakeup、C++20 的 latch／barrier／counting_semaphore，以及 atomic 的 wait/notify。',
  concept: {
    standard: 'C++20',
    body: 'condition_variable 讓執行緒在條件不滿足時休眠，由另一執行緒改變狀態後喚醒，但正確用法必須搭配述詞（predicate）在迴圈中重新檢查，否則會受偽喚醒與遺失喚醒所害。C++20 為結構化同步場景引入三個新原語：一次性倒數的 std::latch、可重複使用且每輪呼叫完成函式的 std::barrier（天生對應 BSP 模型）、以及計數資源的 std::counting_semaphore。此外 std::atomic<T> 新增 wait／notify_one／notify_all，讓輕量的「等值變化再喚醒」不必再借用 mutex 與 condition_variable，降低開銷。',
  },
  deepDive: [
    {
      heading: 'condition_variable 的正確等待：為何一定要用述詞',
      body: '`cv.wait(lock)`（不帶述詞）會解鎖 `lock`、把執行緒放入等待佇列、被喚醒後重新上鎖再返回。問題在於「被喚醒」不等於「條件已成立」，主要有兩種真實會發生的情境：偽喚醒（spurious wakeup）——作業系統或函式庫實作允許 `wait` 在沒有任何 `notify` 呼叫的情況下自行返回（POSIX 條件變數規格明確允許此行為，用以簡化底層實作），以及遺失喚醒（lost wakeup）——若通知方在等待方尚未進入 `wait` 之前就呼叫 `notify_one`，這次通知會憑空消失，等待方將永遠卡住。\n\n`cv.wait(lock, pred)` 等價於 `while (!pred()) cv.wait(lock);`，因此同時解決兩個問題：偽喚醒發生時迴圈會重新檢查 `pred()`、發現條件仍不成立就再度睡眠；遺失喚醒則因為 `pred()` 的檢查與 `wait` 進入等待佇列都在持有 `lock` 的情況下完成，只要通知方也在同一個 `mutex` 保護下修改狀態，就不會有「檢查條件」與「進入等待」之間的競態視窗。結論：`wait` 沒有帶述詞版本幾乎必然是 bug。',
    },
    {
      heading: 'std::latch：一次性倒數閂',
      body: '`std::latch` 以建構時指定的計數器運作：任意執行緒可呼叫 `count_down(n)` 遞減計數，`wait()` 會阻塞直到計數歸零，`arrive_and_wait()` 則是「遞減後立即等待」的便利組合。它是一次性的——計數歸零後無法重置，適合「等待 N 個初始化任務全部完成才開始主流程」這類場景，例如等待所有執行緒完成暖身或載入設定檔。\n\n相較於用 `condition_variable` 加一個計數器與述詞手寫等價邏輯，`std::latch` 免除自行管理 mutex 與正確性風險，介面更小、意圖更清楚。',
    },
    {
      heading: 'std::barrier：可重複使用的分階同步點，天生對應 BSP',
      body: '`std::barrier` 與 `latch` 的關鍵差異在於可重複使用：一群固定數量的執行緒各自呼叫 `arrive_and_wait()`，當所有參與者都抵達後，barrier 會執行一次可選的「完成函式」（completion function），接著自動重置計數，讓同一批執行緒進入下一輪。這正是 Bulk-Synchronous Parallel（BSP）模型的天然對應：每一輪包含「本地平行運算」與「全域同步屏障」兩個階段，barrier 就是那個屏障。\n\n完成函式由抵達 barrier 的其中一個執行緒（實作定義、非使用者可控是哪一個）在其餘執行緒仍被阻塞、下一輪尚未開始之前執行，適合用來做輕量的每輪收尾工作，例如交換 read/write 緩衝區指標或印出進度；但不應假設是特定執行緒或主執行緒執行，也不該放置重量級工作以免拖慢整體。',
    },
    {
      heading: 'std::counting_semaphore：計數資源同步',
      body: '`std::counting_semaphore<LeastMaxValue>` 以整數計數表示可用資源數量：`acquire()` 在計數為零時阻塞、否則遞減並繼續；`release(n)` 遞增計數並喚醒等待者；`try_acquire`／`try_acquire_for` 提供非阻塞或逾時版本。`std::binary_semaphore` 是 `counting_semaphore<1>` 的別名，可作為輕量的「訊號旗標」使用，語意上比 `mutex + condition_variable` 更直接地表達「有 N 份資源可用」。\n\n semaphore 不像 mutex 要求「誰上鎖誰解鎖」，任何執行緒都可以 `release`，因此很適合生產者-消費者的資源池計數，或作為兩階段交握（handshake）的訊號傳遞機制。',
    },
    {
      heading: 'std::atomic<T>::wait/notify：比 condition_variable 更輕量的喚醒',
      body: 'C++20 為所有 `std::atomic` 特化加入 `wait(old)`、`notify_one()`、`notify_all()`。`wait(old)` 會阻塞直到原子變數的值不再等於 `old`（且保證不會受述詞式的偽喚醒誤導——實作內部仍可能有底層虛假喚醒，但 `wait` 會自動重新比較值，因此對呼叫者而言語意等同「值改變才返回」），`notify_one`／`notify_all` 則喚醒因該原子變數而阻塞的執行緒。\n\n與 `condition_variable` 相比，`atomic::wait` 不需要額外的 `mutex` 與鎖操作，適合「單一旗標值變化即可喚醒」的輕量場景，例如自旋等待升級為阻塞等待、或簡單的完成旗標通知，能省去鎖的開銷與死鎖疑慮；但它不像 `condition_variable` 能表達任意複雜述詞，複雜的多條件等待仍應使用 `condition_variable`。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <barrier>
#include <cstddef>
#include <iostream>
#include <thread>
#include <vector>

constexpr int kThreads = 4;
constexpr int kRows = 4;
constexpr int kIterations = 3;

std::vector<double> current(kRows, 0.0);
std::vector<double> next(kRows, 0.0);

void onPhaseComplete() noexcept {  // [1]
    std::swap(current, next);      // [2]
}

int main() {
    std::barrier phase_barrier(kThreads, onPhaseComplete);  // [3]

    std::vector<std::thread> workers;
    for (int t = 0; t < kThreads; ++t) {
        workers.emplace_back([t, &phase_barrier]() {
            for (int iter = 0; iter < kIterations; ++iter) {
                int row = t;  // [4]
                double left = current[(row + kRows - 1) % kRows];
                double right = current[(row + 1) % kRows];
                next[row] = 0.5 * (left + right);  // local stencil update

                phase_barrier.arrive_and_wait();  // [5]
            }
        });
    }
    for (auto& w : workers) w.join();

    for (double v : current) std::cout << v << ' ';
    std::cout << '\\n';
    return 0;
}`,
    callouts: [
      {
        n: 1,
        text: '完成函式在每輪所有執行緒都抵達 barrier 後、下一輪開始前執行一次，由其中一個抵達的執行緒代為呼叫。',
      },
      {
        n: 2,
        text: '在此交換讀寫緩衝區指標，確保下一輪讀取的是上一輪已完全寫入的資料，避免資料競爭。',
      },
      {
        n: 3,
        text: '建構時指定參與執行緒數與完成函式；barrier 可重複使用於多輪，這是與 std::latch 的關鍵差異。',
      },
      { n: 4, text: '每個執行緒只負責固定的一列（BSP 的本地平行運算階段）。' },
      {
        n: 5,
        text: 'arrive_and_wait 讓該執行緒抵達 barrier 並阻塞，直到所有 kThreads 個執行緒都抵達為止，才會進入下一輪讀取鄰居資料。',
      },
    ],
  },
  pitfalls: [
    '呼叫 `cv.wait(lock)` 卻不帶述詞、也不在自己的迴圈中重新檢查條件，導致偽喚醒或遺失喚醒造成錯誤或死鎖。',
    '通知方在未持有對應 `mutex` 的情況下修改共享狀態再呼叫 `notify_one`，與等待方之間出現競態視窗。',
    '把 `std::latch` 當成可重複使用的屏障——它歸零後無法重置，跨多輪同步應改用 `std::barrier`。',
    '假設 `std::barrier` 的完成函式一定在特定執行緒（例如主執行緒）上執行，或在其中放置重量級工作拖慢整輪同步。',
    '在只需要「單一旗標值變化即喚醒」的簡單場景仍使用 `condition_variable + mutex`，白白付出鎖的開銷，其實 `std::atomic::wait/notify` 更輕量。',
  ],
  bestPractices: [
    '一律使用 `cv.wait(lock, pred)` 的述詞版本，讓迴圈重新檢查同時處理偽喚醒與遺失喚醒。',
    '通知前確保狀態變更發生在持有同一把 `mutex` 的臨界區內，通知可在解鎖前後皆可但狀態變更務必受保護。',
    '一次性的「等待 N 件事完成」用 `std::latch`；需要跨多輪重複同步（如 BSP 迭代）用 `std::barrier`。',
    '資源計數式同步（例如限制同時進行的工作數）優先用 `std::counting_semaphore`，語意比手動計數器加鎖更清楚。',
    '單一旗標或完成通知等輕量場景改用 `std::atomic<T>::wait/notify`，避免不必要的 mutex 開銷。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '為什麼 `std::condition_variable::wait(lock)` 必須搭配述詞在迴圈中重新檢查條件？',
      options: [
        { id: 'a', text: '因為述詞版本執行速度比較快，與正確性無關' },
        {
          id: 'b',
          text: '因為偽喚醒允許 wait 在沒有任何 notify 的情況下返回，且遺失喚醒可能讓 notify 發生在等待方進入等待佇列之前',
        },
        { id: 'c', text: '因為不帶述詞的版本無法編譯' },
        { id: 'd', text: '因為述詞版本不需要持有 mutex' },
      ],
      correctOptionId: 'b',
      explanation:
        '偽喚醒與遺失喚醒都是條件變數規格允許發生的真實情境；述詞迴圈能在被喚醒後重新確認條件是否真正成立，並避免檢查與等待之間的競態視窗。',
    },
    {
      id: 'q2',
      stem: '在多執行緒 stencil 迭代中，使用 std::barrier 而非 std::latch 的主要理由是什麼？',
      options: [
        { id: 'a', text: 'std::barrier 比 std::latch 更早被標準化' },
        { id: 'b', text: 'std::latch 只能被單一執行緒等待' },
        {
          id: 'c',
          text: 'std::barrier 在計數歸零後會自動重置並可重複使用於下一輪，適合多輪迭代同步；std::latch 是一次性的',
        },
        { id: 'd', text: 'std::barrier 不需要指定參與執行緒數量' },
      ],
      correctOptionId: 'c',
      explanation:
        'std::latch 的計數只能遞減到零一次、無法重置；std::barrier 每輪所有參與者抵達後會執行完成函式並自動重置，正好對應 BSP 需要重複多輪同步的需求。',
    },
    {
      id: 'q3',
      stem: '相較於 std::condition_variable，std::atomic<T>::wait/notify 的主要優勢是什麼？',
      options: [
        { id: 'a', text: '它可以表達任意複雜的多條件等待邏輯' },
        { id: 'b', text: '它不需要搭配 mutex 與上鎖操作，對單一值變化的輕量喚醒場景開銷更低' },
        { id: 'c', text: '它保證完全不會有虛假喚醒發生在底層實作中' },
        { id: 'd', text: '它可以跨行程（process）使用' },
      ],
      correctOptionId: 'b',
      explanation:
        'atomic::wait 直接對原子變數的值做比較與等待，不需額外的 mutex 與鎖操作，適合單一旗標變化即喚醒的輕量場景；但無法像 condition_variable 一樣表達任意述詞條件。',
    },
  ],
  diagram: {
    key: 'thread-timeline',
    caption:
      '多執行緒在每一輪 stencil 更新後於 barrier 匯合：所有執行緒抵達才觸發完成函式、重置計數並放行下一輪，形成 BSP 的「運算—同步」交替節奏。',
  },
  tryIt: {
    code: `#include <atomic>
#include <barrier>
#include <iostream>
#include <thread>
#include <vector>

int main() {
    constexpr int kThreads = 3;
    constexpr int kRounds = 2;

    std::atomic<int> round_counter{0};
    std::barrier sync_point(kThreads, [&round_counter]() noexcept {
        // Runs once per round after every thread has arrived.
        round_counter.fetch_add(1, std::memory_order_relaxed);
    });

    std::vector<std::thread> workers;
    for (int t = 0; t < kThreads; ++t) {
        workers.emplace_back([t, &sync_point]() {
            for (int r = 0; r < kRounds; ++r) {
                std::cout << "thread " << t << " working round " << r << '\\n';
                sync_point.arrive_and_wait();
            }
        });
    }
    for (auto& w : workers) w.join();

    std::cout << "rounds completed = " << round_counter.load() << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::barrier - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/thread/barrier',
      description: 'C++20 可重複使用的分階同步屏障，含完成函式語意與範例。',
    },
    {
      title: 'std::latch - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/thread/latch',
      description: 'C++20 一次性倒數閂的完整介面與使用場景。',
    },
    {
      title: 'std::counting_semaphore - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/thread/counting_semaphore',
      description: '計數號誌與 binary_semaphore 特化，資源計數式同步的標準介面。',
    },
    {
      title: 'std::atomic<T>::wait - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/atomic/atomic/wait',
      description: 'C++20 原子等待／通知機制，比 condition_variable 更輕量的喚醒方式。',
    },
  ],
};

export default ind09CondvarCpp20Sync;
