import type { ChapterContent } from '@/types/ChapterContent';

const ind08MutexLocks: ChapterContent = {
  slug: 'ind08-mutex-locks',
  chapterLabel: '第 37 章',
  title: '互斥與鎖',
  group: '第 10 部：執行緒與同步',
  description:
    'mutex／shared_mutex（C++17 讀寫鎖）、lock_guard／unique_lock／scoped_lock，死結四條件與鎖排序。',
  concept: {
    standard: 'C++17',
    body: '互斥鎖（mutex）是共享狀態最基本的同步機制：同一時間只允許一個執行緒持有鎖並進入臨界區。std::mutex 是最輕量的版本；std::recursive_mutex 允許同一執行緒重複上鎖（代價是額外的計數與較高開銷）；std::shared_mutex（C++17）提供讀寫鎖語意——多個讀者可同時持有共享鎖，但寫者需要獨占鎖，適合讀多寫少的場景。鎖本身不該手動 lock/unlock，而應交給 RAII 包裝：lock_guard 是最單純、開銷最低的選擇；unique_lock 支援延遲鎖定、可轉移所有權、可提前解鎖；scoped_lock（C++17）可一次鎖住多個 mutex 且保證不死結。工業實務上，鎖是熱路徑效能的頭號嫌疑犯：鎖競爭、快取行彈跳與優先反轉都可能讓「正確」的鎖版本遠比預期慢，因此判斷何時該用分割（sharding）或無鎖取代鎖，和正確使用鎖同等重要。',
  },
  code: {
    lang: 'cpp',
    code: `#include <mutex>
#include <print>
#include <thread>

struct Account {
    std::mutex m;
    long balance = 0;
};

// Dangerous version: locks each mutex individually in sequence; the locking
// order depends on the caller, which can deadlock. [1]
void transferNaive(Account& from, Account& to, long amount) {
    std::lock_guard<std::mutex> lockFrom(from.m);  // [2]
    std::lock_guard<std::mutex> lockTo(to.m);
    from.balance -= amount;
    to.balance += amount;
}

// Safe version: std::scoped_lock locks both mutexes at once, using the
// std::lock algorithm internally to avoid deadlock regardless of call order. [3]
void transferSafe(Account& from, Account& to, long amount) {
    std::scoped_lock lock(from.m, to.m);  // [4] C++17 multi-lock construction
    from.balance -= amount;
    to.balance += amount;
}  // [5] Both locks are released automatically, in order, on scope exit

int main() {
    Account a, b;
    a.balance = 100;

    // Transfer in both directions concurrently: the naive version can
    // deadlock when a->b and b->a interleave; scoped_lock guarantees it won't. [6]
    std::thread t1(transferSafe, std::ref(a), std::ref(b), 30);
    std::thread t2(transferSafe, std::ref(b), std::ref(a), 10);
    t1.join();
    t2.join();

    std::println("a.balance = {}, b.balance = {}", a.balance, b.balance);
    return 0;
}`,
    callouts: [
      {
        n: 1,
        text: 'transferNaive 分別對兩個 mutex 呼叫 lock_guard 建構子，鎖定順序完全由呼叫端的參數順序決定。',
      },
      {
        n: 2,
        text: '若另一執行緒以相反順序呼叫 transferNaive(b, a, ...)，兩者互相持有對方需要的鎖，形成典型死結。',
      },
      {
        n: 3,
        text: 'std::scoped_lock 建構時會以類似 std::lock 的演算法一次取得所有 mutex，內部用回退／重試策略避免循環等待。',
      },
      {
        n: 4,
        text: '傳入多個 mutex 給同一個 scoped_lock，無論呼叫順序為何，取鎖結果都是死結安全的。',
      },
      {
        n: 5,
        text: 'scoped_lock 是 RAII：解構子自動釋放所有持有的鎖，不需手動 unlock，也不怕例外路徑漏放。',
      },
      { n: 6, text: '對照組：naive 版本在雙向轉帳的競爭情境下有機會死結，safe 版本則保證終止。' },
    ],
  },
  deepDive: [
    {
      heading: 'mutex、recursive_mutex、shared_mutex 的取捨',
      body: 'std::mutex 是預設選擇：非遞迴、開銷最小，同一執行緒重複 `lock()` 是未定義行為（通常死結）。std::recursive_mutex 允許同一執行緒多次上鎖（需對應次數的解鎖），但額外的擁有者計數帶來效能成本，且往往是設計氣味——需要遞迴鎖通常代表函式呼叫圖或鎖粒度沒設計好。\n\nstd::shared_mutex（C++17）實作讀寫鎖：以 `lock_shared()`／`unlock_shared()` 取得共享（讀）鎖，多個讀者可並存；以 `lock()`／`unlock()` 取得獨占（寫）鎖，會等待所有讀者釋放。適合讀取遠多於寫入、且讀取臨界區夠長以攤銷額外開銷的場景（例如設定表、快取）；若臨界區很短，shared_mutex 內部簿記的成本可能反而高於單純 `std::mutex`。',
    },
    {
      heading: 'lock_guard、unique_lock、scoped_lock 的語意差異',
      body: '`std::lock_guard` 在建構時上鎖、解構時解鎖，作用域固定、不可轉移、不可提前解鎖，是開銷最低的 RAII 包裝，適合「整個作用域都需要鎖」的簡單情境。\n\n`std::unique_lock` 更彈性：支援 `std::defer_lock`（延後鎖定）、`std::try_to_lock`、可在中途 `lock()`／`unlock()`、可移動（轉移鎖的擁有權），也是條件變數 `std::condition_variable::wait` 要求的鎖型別，因為 wait 需要能在等待期間釋放鎖、被喚醒後重新取得。代價是比 lock_guard 多一點狀態與間接開銷。\n\n`std::scoped_lock`（C++17）是 lock_guard 的多鎖泛化：建構子接受任意數量的 mutex，內部以類似 `std::lock` 的演算法（依序嘗試、遇阻塞則釋放已取得的鎖再重試）取得全部，保證不會因鎖定順序不同而死結；只鎖一個 mutex 時它退化為等同 lock_guard 的行為，因此可作為預設選擇。',
    },
    {
      heading: '死結四條件、鎖排序與 std::call_once',
      body: '死結需同時滿足 Coffman 四條件：互斥（資源不可共享）、持有並等待（持有一把鎖的同時等待另一把）、不可搶佔（鎖不能被強制取走）、循環等待（一組執行緒形成等待環）。破壞任一條件即可避免死結；實務上最常用的兩種手段是（a）固定的全域鎖排序——所有程式碼永遠按同一順序取得多把鎖，消除循環等待；（b）用 `std::scoped_lock` 或 `std::lock` 讓「取得多把鎖」成為單一原子步驟，由函式庫保證安全。\n\nstd::call_once 搭配 std::once_flag 解決「執行緒安全的延遲初始化」問題：多個執行緒同時呼叫 `std::call_once(flag, initFunc)`，函式庫保證 initFunc 恰好執行一次，其餘呼叫者會阻塞直到完成，且完成後續呼叫零額外鎖開銷（實作通常用一次性的原子檢查）。這比「用 mutex 手動保護一個 bool 旗標」更簡潔也更不容易寫錯（例如忘記處理拋出例外時旗標應重置的邊界情況，call_once 已內建處理）。',
    },
    {
      heading: 'HPC 視角：鎖在熱路徑幾乎總是錯的',
      body: '在高效能運算與延遲敏感系統中，出現在每次迭代、每個封包、每個 GPU kernel 啟動路徑上的鎖，幾乎必然是可擴展性瓶頸：鎖競爭讓執行緒序列化執行，快取行在核心間彈跳（false sharing 的一種形式），作業系統排程器介入可能引發優先反轉與長尾延遲。剖析工具（perf、VTune）常直接指出鎖等待佔掉多數牆鐘時間。\n\n處理熱路徑鎖競爭的第一選擇通常不是「換成無鎖資料結構」，而是分割（sharding／partitioning）：把一個全域鎖保護的資料結構拆成 N 份、依 thread-id 或 key 的雜湊決定歸屬的分片，各分片各自一把鎖，把競爭機率降到 1/N；更進一步可依 NUMA 節點分割，讓執行緒優先存取本地記憶體的分片，同時降低跨插槽流量與鎖競爭。只有在分割仍不足以消除瓶頸、且測過資料確實證明鎖是瓶頸時，才值得承擔無鎖資料結構的正確性與維護複雜度（見〈無鎖資料結構〉一章）。過早無鎖化是常見的過度工程。',
    },
  ],
  pitfalls: [
    '多把鎖沒有一致的取得順序：不同函式以不同順序鎖定同一組 mutex，形成循環等待而死結。',
    '用 recursive_mutex 掩蓋設計問題：因為某條路徑會重入而加上遞迴鎖，卻沒真正釐清鎖的粒度與呼叫關係。',
    '持有鎖時呼叫可能阻塞的 I/O（檔案、網路、日誌），讓臨界區時間不可預期地拉長，放大其他執行緒的等待。',
    '對 shared_mutex 的寫鎖使用頻率被低估：寫入頻繁時 shared_mutex 的簿記開銷可能比單純 mutex 更慢。',
    '忘記 unique_lock 可被提前 unlock 或轉移所有權的彈性，仍把整個函式包在一把鎖下，人為擴大臨界區。',
  ],
  bestPractices: [
    '預設用 std::scoped_lock（單鎖或多鎖皆可）或 lock_guard；只有需要延遲鎖定、手動解鎖或搭配條件變數時才用 unique_lock。',
    '需要同時取得多把鎖時一律用 std::scoped_lock／std::lock，不要手寫個別 lock_guard 依序上鎖。',
    '沒有一致排序又必須分別上鎖時，制定並記錄全域鎖排序規則（例如依物件位址或 ID 排序）。',
    '執行緒安全的延遲初始化用 std::call_once + std::once_flag，不要自製「檢查旗標再上鎖」的手動邏輯。',
    '剖析發現熱路徑鎖競爭時，先嘗試分割（sharding／依 NUMA 分片）降低競爭，再考慮無鎖資料結構。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: 'std::scoped_lock 相較於分別用兩個 std::lock_guard 鎖住兩個 mutex，關鍵優勢是什麼？',
      options: [
        { id: 'a', text: '它比 lock_guard 更省記憶體' },
        { id: 'b', text: '它以死結避免演算法一次取得所有 mutex，避免因鎖定順序不同而循環等待' },
        { id: 'c', text: '它會自動把 mutex 換成無鎖結構' },
        { id: 'd', text: '它允許同一執行緒重複上鎖同一個 mutex' },
      ],
      correctOptionId: 'b',
      explanation:
        'std::scoped_lock 建構時以類似 std::lock 的演算法一次取得所有傳入的 mutex，不論呼叫順序為何都不會因鎖定順序不同而死結；分別用多個 lock_guard 依序上鎖則可能因不同呼叫順序而死結。',
    },
    {
      id: 'q2',
      stem: '死結的 Coffman 四條件中，「固定的全域鎖排序」主要用來破壞哪一項？',
      options: [
        { id: 'a', text: '互斥（mutual exclusion）' },
        { id: 'b', text: '不可搶佔（no preemption）' },
        { id: 'c', text: '循環等待（circular wait）' },
        { id: 'd', text: '持有並等待（hold and wait）' },
      ],
      correctOptionId: 'c',
      explanation:
        '若所有程式碼都依同一順序取得多把鎖，就不可能形成一組執行緒互相等待對方持有鎖的環，因此消除了循環等待這個條件；互斥、不可搶佔是鎖機制本身的特性，通常無法迴避。',
    },
    {
      id: 'q3',
      stem: '在效能敏感的熱路徑上發現鎖競爭是主要瓶頸時，通常應優先嘗試的做法是什麼？',
      options: [
        { id: 'a', text: '立即改寫成自製的無鎖資料結構' },
        {
          id: 'b',
          text: '把資料依 thread／key／NUMA 節點分割（sharding），讓多把較細粒度的鎖分攤競爭',
        },
        { id: 'c', text: '把 std::mutex 換成 std::recursive_mutex' },
        { id: 'd', text: '把所有臨界區合併成一個更大的臨界區' },
      ],
      correctOptionId: 'b',
      explanation:
        '分割（sharding／partitioning）通常能以低得多的正確性風險大幅降低鎖競爭；無鎖資料結構正確性難、維護成本高，通常只在分割仍不足時才值得考慮。',
    },
  ],
  diagram: {
    key: 'thread-timeline',
    caption:
      '兩個執行緒對同一組鎖的交握：naive 依序上鎖可能因順序不同而互相卡住，scoped_lock 讓取鎖成為單一不可分割的步驟。',
  },
  tryIt: {
    code: `#include <iostream>
#include <mutex>
#include <thread>

struct Account {
    std::mutex m;
    long balance = 0;
};

void transferSafe(Account& from, Account& to, long amount) {
    std::scoped_lock lock(from.m, to.m);  // Locks both mutexes at once, deadlock-safe
    from.balance -= amount;
    to.balance += amount;
}

int main() {
    Account a, b;
    a.balance = 100;

    std::thread t1(transferSafe, std::ref(a), std::ref(b), 30);
    std::thread t2(transferSafe, std::ref(b), std::ref(a), 10);
    t1.join();
    t2.join();

    std::cout << "a.balance = " << a.balance << ", b.balance = " << b.balance << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::scoped_lock - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/thread/scoped_lock',
      description: 'C++17 多鎖 RAII 包裝，內建死結避免演算法。',
    },
    {
      title: 'std::shared_mutex - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/thread/shared_mutex',
      description: 'C++17 讀寫鎖，共享（讀）鎖與獨占（寫）鎖的介面與語意。',
    },
    {
      title: 'std::call_once - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/thread/call_once',
      description: '搭配 std::once_flag 的執行緒安全一次性初始化。',
    },
    {
      title: 'std::lock - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/thread/lock',
      description: '同時鎖定多個鎖物件並避免死結的演算法，scoped_lock 的基礎。',
    },
  ],
};

export default ind08MutexLocks;
