import type { ChapterContent } from '@/types/ChapterContent';

const ch22AdvancedII: ChapterContent = {
  slug: 'ch22-advanced-ii',
  chapterLabel: 'Ch.22',
  title: '進階主題 II：並行程式設計',
  group: 'E · 進階 C++',
  description:
    '深入 C++ 並行程式設計：std::thread、mutex、condition_variable、atomic 與 memory_order，以及以任務為基礎的 async／future／promise 模型。',
  concept: {
    standard: 'C++20',
    body:
      '並行程式設計讓多個執行緒同時推進工作。C++ 標準函式庫提供 std::thread 建立執行緒、std::mutex 與 std::lock_guard 保護共享狀態、std::condition_variable 進行等待與通知、std::atomic 搭配 std::memory_order 做無鎖同步。以任務為導向時，可用 std::async／std::future／std::promise 與 std::packaged_task 把結果與例外自動傳遞回呼叫端。核心原則：讓臨界區越短越好，優先選用高階任務抽象，避免資料競爭與死鎖。',
  },
  code: {
    lang: 'cpp',
    code: `#include <atomic>
#include <future>
#include <mutex>
#include <thread>
#include <vector>

std::mutex g_mutex;  // [1]
long long shared_sum = 0;
std::atomic<long long> atomic_sum{0};  // [2]

void addWithLock(long long value) {
    std::lock_guard<std::mutex> guard{g_mutex};  // [3]
    shared_sum += value;
}

long long computePartial(int begin, int end) {  // [4]
    long long local = 0;
    for (int i = begin; i < end; ++i) local += i;
    return local;
}

int main() {
    std::vector<std::thread> workers;
    for (int t = 0; t < 4; ++t) workers.emplace_back([t]() { addWithLock(t); });  // [5]
    for (auto& w : workers) w.join();

    auto future = std::async(std::launch::async,  // [6]
                             computePartial, 0, 1'000'000);
    atomic_sum.fetch_add(future.get(),  // [7]
                         std::memory_order_relaxed);
    return 0;
}`,
    callouts: [
      { n: 1, text: 'std::mutex 保護跨執行緒共享的可變狀態，是最基本的互斥原語。' },
      { n: 2, text: 'std::atomic 提供不需鎖的原子操作，適合單一計數器或旗標。' },
      { n: 3, text: 'std::lock_guard 以 RAII 在建構時上鎖、解構時解鎖，例外安全且不會忘記解鎖。' },
      { n: 4, text: '純函式只讀取參數、回傳區域結果，天生執行緒安全，適合平行化。' },
      { n: 5, text: 'Lambda 明確以 [t] 值捕獲，避免懸置參考造成的資料競爭。' },
      { n: 6, text: 'std::async 以任務為單位啟動非同步工作，回傳可等待的 std::future。' },
      { n: 7, text: 'fetch_add 搭配 memory_order_relaxed：僅需原子性、不需跨變數排序時效能最佳。' },
    ],
  },
  deepDive: [
    {
      heading: '記憶體順序：從 seq_cst 到 relaxed',
      body:
        'atomic 操作預設為 `memory_order_seq_cst`，提供單一全域總次序、最直觀但成本最高。`release`／`acquire` 配對只保證配對點前後的排序，適合「發佈-取用」模式；`relaxed` 僅保證原子性，適合純計數器或旗標。\n\n誤用較弱的順序會造成極難重現的 bug。除非以剖析證明瓶頸並確實理解語意，否則從 `seq_cst` 起步，再逐步放寬。',
    },
    {
      heading: '鎖、死鎖與條件變數',
      body:
        '需同時鎖多個 mutex 時用 `std::scoped_lock` 一次上鎖以避免死鎖，或全域約定固定的上鎖順序。`std::condition_variable::wait` 必須帶述詞（predicate）以應對偽喚醒（spurious wakeup）與遺失喚醒。\n\n臨界區應盡量短小；鎖的粒度過粗會扼殺並行度、過細則增加開銷與死鎖風險，需以量測平衡。',
    },
    {
      heading: '任務導向並行與 jthread',
      body:
        'C++20 的 `std::jthread` 會在解構時自動 join，並內建 `stop_token` 支援協作式取消，優於裸 `std::thread`。注意 `std::async` 回傳的 `std::future` 若未持有，其解構子可能阻塞直到任務完成。\n\n高吞吐場景多用執行緒池分攤建立成本，並以每執行緒本地累加、最後合併的方式降低原子競爭與偽共享。',
    },
  ],
  pitfalls: [
    '未同步地存取共享可變狀態——資料競爭是未定義行為。',
    '`condition_variable::wait` 未帶述詞，遭遇偽喚醒或遺失喚醒而出錯。',
    '以不一致的順序取得多個鎖，造成死鎖。',
    '`std::async` 的 future 未被持有，其解構子意外阻塞主流程。',
  ],
  bestPractices: [
    '優先使用高階抽象（`std::async`、`std::jthread`）而非裸執行緒。',
    '同時鎖多個 mutex 用 `std::scoped_lock`；`wait` 一律帶述詞。',
    '保持臨界區短小；僅在有量測依據時放寬記憶體順序。',
    '高吞吐用執行緒池，並以本地累加 + 合併降低原子競爭與偽共享。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '下列何者最能描述 std::lock_guard 的用途？',
      options: [
        { id: 'a', text: '以 RAII 方式在作用域結束時自動釋放 mutex' },
        { id: 'b', text: '建立新的執行緒並立即執行' },
        { id: 'c', text: '將變數標記為原子操作' },
        { id: 'd', text: '取代 std::future 傳遞回傳值' },
      ],
      correctOptionId: 'a',
      explanation:
        'std::lock_guard 是 RAII 包裝器，建構時上鎖、解構時解鎖，確保例外情況下也會釋放。參見 Ch.22 PDF 第 38 頁。',
    },
    {
      id: 'q2',
      stem: '當多個執行緒僅需對單一整數計數器做累加，且不需與其他變數保持順序時，最合適的選擇是？',
      options: [
        { id: 'a', text: '每次累加都建立一個新執行緒' },
        { id: 'b', text: 'std::atomic 搭配 memory_order_relaxed 的 fetch_add' },
        { id: 'c', text: '使用 volatile 變數即可保證原子性' },
        { id: 'd', text: '完全不需要同步' },
      ],
      correctOptionId: 'b',
      explanation:
        'volatile 不保證原子性；正確作法是 std::atomic。純計數且無跨變數排序需求時，relaxed 排序效能最佳。參見 Ch.22 PDF 第 61 頁。',
    },
    {
      id: 'q3',
      stem: 'std::async(std::launch::async, f) 相較於手動管理 std::thread 的主要優勢是？',
      options: [
        { id: 'a', text: '它保證程式一定比較快' },
        { id: 'b', text: '回傳值與例外會透過 std::future 自動傳回呼叫端' },
        { id: 'c', text: '它不會真的建立任何執行緒' },
        { id: 'd', text: '它讓所有 mutex 變成可有可無' },
      ],
      correctOptionId: 'b',
      explanation:
        'std::async 以任務為抽象，透過 future.get() 取得結果，若任務丟出例外也會在 get() 時重新拋出。參見 Ch.22 PDF 第 74 頁。',
    },
  ],
  diagram: {
    key: 'thread-timeline',
    caption:
      '動畫時間軸：紅色播放頭掃過時，同一時間僅有一個執行緒持有 mutex，示範臨界區的互斥。',
  },
  tryIt: {
    code: `#include <atomic>
#include <iostream>
#include <thread>
#include <vector>

std::atomic<long long> total{0};

void worker(int begin, int end) {
    long long local = 0;
    for (int i = begin; i < end; ++i) local += i;
    // Combine once per thread to minimise atomic contention.
    total.fetch_add(local, std::memory_order_relaxed);
}

int main() {
    constexpr int kThreads = 4;
    constexpr int kN = 1'000'000;
    std::vector<std::thread> pool;
    for (int t = 0; t < kThreads; ++t) {
        int begin = t * (kN / kThreads);
        int end = (t + 1) * (kN / kThreads);
        pool.emplace_back([begin, end]() { worker(begin, end); });
    }
    for (auto& th : pool) th.join();
    std::cout << "sum = " << total.load() << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::thread - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/thread/thread',
      description: 'std::thread 的建構、join 與 detach 語意完整參考。',
    },
    {
      title: 'std::memory_order - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/atomic/memory_order',
      description: 'relaxed／acquire／release／seq_cst 各記憶體順序的定義與範例。',
    },
    {
      title: 'std::async - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/thread/async',
      description: '以任務為導向的非同步執行與 std::future 回傳值傳遞。',
    },
    {
      title: 'Modern C++ Programming — Advanced Topics II (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/22.Advanced_topics_II.html',
      description: 'Busato 課程第 22 章的 HTML 投影片，涵蓋並行主題原文。',
    },
    {
      title: 'The C++ Memory Model (Rainer Grimm)',
      href: 'https://www.modernescpp.com/index.php/c-memory-model/',
      description: 'Rainer Grimm 對記憶體模型與 atomic 的系列導讀。',
    },
  ],
};

export default ch22AdvancedII;
