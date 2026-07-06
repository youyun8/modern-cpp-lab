import type { ChapterContent } from '@/types/ChapterContent';

const appendixCUbAntipatterns: ChapterContent = {
  slug: 'appendix-c-ub-antipatterns',
  chapterLabel: '附錄 C',
  title: '反面教材集',
  group: 'T · 附錄',
  description: '常見的未定義行為與並行反面教材，逐一附上修正後的正確寫法。',
  concept: {
    standard: 'C++20',
    body: '本附錄彙整全書出現過的並行反面教材（anti-pattern），每一則都以「錯誤寫法」對照「修正寫法」呈現，方便快速查閱與 code review 時比對。涵蓋範圍包括：未同步的共享變數讀寫（資料競爭）、誤用 `volatile` 當作跨執行緒同步原語、無鎖程式碼中的 ABA 問題、無鎖結構忘記延後記憶體回收導致 use-after-free、鎖排序不一致造成的死結、相鄰原子變數未做 padding 造成的 false sharing，以及在 `par_unseq` 演算法中使用不安全（內部上鎖或會拋例外）的可呼叫物件。這些反面教材大多不會在每次執行都重現，測試通過不代表正確；真正的判準是程式碼是否符合 C++ 記憶體模型與各演算法執行策略的前提要求。',
  },
  code: {
    lang: 'cpp',
    code: `#include <atomic>
#include <cstdio>
#include <mutex>

// -----------------------------------------------------------------------
// 1) Data race: unsynchronized shared counter.
// -----------------------------------------------------------------------
int g_bad_counter = 0;  // [1] plain int, no protection

void badIncrement() {
  ++g_bad_counter;  // [1] BUG: read-modify-write race
                    //     from multiple threads
}

std::atomic<int> g_good_counter{0};  // [2]

void goodIncrement() {
  g_good_counter.fetch_add(1, std::memory_order_relaxed);  // [2] FIX
}

// -----------------------------------------------------------------------
// 2) Deadlock: inconsistent lock acquisition order.
// -----------------------------------------------------------------------
struct Account {
  std::mutex mtx;
  int balance = 100;
};

void badTransfer(Account& from, Account& to, int amount) {  // [3] BUG
  std::lock_guard<std::mutex> lock_from(from.mtx);          // [3] order depends
  std::lock_guard<std::mutex> lock_to(to.mtx);              //     on call site;
                                                            //     A->B and B->A
                                                            //     can deadlock
  from.balance -= amount;
  to.balance += amount;
}

void goodTransfer(Account& from, Account& to, int amount) {  // [4] FIX
  std::scoped_lock lock(from.mtx, to.mtx);  // [4] deadlock-avoiding
                                            //     algorithm locks both
                                            //     atomically
  from.balance -= amount;
  to.balance += amount;
}

// -----------------------------------------------------------------------
// 3) False sharing: unpadded adjacent atomics hammered by different
//    threads share one cache line and ping-pong it between cores.
// -----------------------------------------------------------------------
struct BadCounters {
  std::atomic<long> a{0};  // [5] BUG: a and b very likely land on the
  std::atomic<long> b{0};  //     same 64-byte cache line
};

struct alignas(64) PaddedCounter {  // [6] FIX: force each counter onto
  std::atomic<long> value{0};       //     its own cache line
  char padding[64 - sizeof(std::atomic<long>)];
};

struct GoodCounters {
  PaddedCounter a;  // [6]
  PaddedCounter b;  // [6]
};

// -----------------------------------------------------------------------
// 4) volatile misused as a cross-thread synchronization flag.
// -----------------------------------------------------------------------
volatile bool g_legacy_ready = false;  // [7] BUG: no happens-before edge,
                                       //     no atomicity guarantee

std::atomic<bool> g_ready{false};  // [7] FIX: real synchronization
                                   //     primitive with release/acquire

int main() {
  badIncrement();
  goodIncrement();

  Account acc_x, acc_y;
  goodTransfer(acc_x, acc_y, 10);

  GoodCounters counters;
  counters.a.value.fetch_add(1, std::memory_order_relaxed);

  std::printf("counter = %d, x = %d, y = %d\\n", g_good_counter.load(),
              acc_x.balance, acc_y.balance);
  return 0;
}`,
    callouts: [
      {
        n: 1,
        text: 'BUG：`g_bad_counter` 是普通 int，多執行緒同時執行 `++g_bad_counter` 是未同步的讀-改-寫，構成資料競爭與 UB。',
      },
      {
        n: 2,
        text: 'FIX：改用 `std::atomic<int>` 搭配 `fetch_add`，讀-改-寫本身是原子操作，不需外部鎖即可安全遞增。',
      },
      {
        n: 3,
        text: 'BUG：`badTransfer` 依照傳入順序鎖 `from` 再鎖 `to`；若另一個執行緒同時呼叫 `badTransfer(B, A, ...)`，兩者互相持有對方要等的鎖，形成典型的死結（不一致鎖排序）。',
      },
      {
        n: 4,
        text: 'FIX：`std::scoped_lock` 可一次鎖住多個 mutex，內部使用 deadlock-avoidance 演算法（等同 `std::lock`），無論呼叫順序如何都不會死結。',
      },
      {
        n: 5,
        text: 'BUG：`a` 與 `b` 兩個 `std::atomic<long>` 相鄰配置，幾乎必然落在同一條 cache line；不同核心分別高頻寫入 `a`、`b` 時，cache line 會在核心間不斷失效搬動（false sharing），嚴重拖慢效能，即使邏輯上兩者毫無關聯。',
      },
      {
        n: 6,
        text: 'FIX：以 `alignas(64)` 加上 padding，強迫每個計數器獨佔一條 cache line，消除 false sharing。',
      },
      {
        n: 7,
        text: '對照組：`g_legacy_ready`（BUG，`volatile` 不提供跨執行緒排序與原子性）與 `g_ready`（FIX，`std::atomic<bool>` 搭配 release/acquire 才是正確的同步旗標）。',
      },
    ],
  },
  deepDive: [
    {
      heading: '資料競爭與 volatile 誤用',
      body: '未同步存取共享可變狀態是最基礎也最常見的反面教材：多個執行緒同時讀寫同一個非原子、非鎖保護的變數，只要其中至少一個是寫入，就構成資料競爭，屬於未定義行為，而不只是「結果可能不精確」。詳細的 happens-before／synchronizes-with 推導與編譯器如何基於「假設無 UB」做激進最佳化，見本書「資料競爭與 C++ 記憶體模型」一章，這裡不重複展開。\n\n一個常見的變形是把 `volatile` 當作跨執行緒同步手段（例如上方程式碼中的 `g_legacy_ready`）。`volatile` 的語意僅限於「不可被優化掉的可觀察存取」，設計目標是 MMIO 與訊號處理常式，並不建立 synchronizes-with 關係，也不保證原子性；用它取代 `std::atomic` 或 mutex，本質上仍是資料競爭，只是在強順序硬體（x86）與較保守的最佳化等級下「恰好」不出錯，換到 ARM 等弱順序架構或提高最佳化等級後就可能出現間歇性錯誤。',
    },
    {
      heading: '無鎖程式碼中的 ABA 問題',
      body: '無鎖（lock-free）資料結構常以 `compare_exchange_weak/strong` 實作樂觀併發：讀出目前值 A，計算新值，再用 CAS 確認值仍是 A 才寫回。ABA 問題發生在：執行緒 T1 讀到指標值 A，被搶佔；另一個執行緒把值改成 B，之後又改回 A（可能是同一塊記憶體被釋放後重新配置，恰好拿到相同位址）；T1 恢復執行時，CAS 看到值仍是 A，誤判「期間沒有變化」而成功寫回，但實際上資料結構的內部狀態早已不同（例如 lock-free stack 的 next 指標已經被改過）。\n\n典型修法有二：一是為每個節點附加版本號（tagged pointer / generation counter），CAS 時同時比較「值＋版本號」，即使位址重複，版本號也會不同；二是搭配延後回收機制（hazard pointer、epoch-based reclamation、`std::atomic<std::shared_ptr<T>>`）確保節點在仍被其他執行緒持有參照時不會被釋放或重新配置，從根本上避免「同一位址被賦予不同語意」的情況。',
    },
    {
      heading: '無鎖結構的記憶體回收與 use-after-free',
      body: '與 ABA 問題緊密相關的是無鎖結構常見的 use-after-free：一個執行緒剛從 lock-free queue 或 stack 中「邏輯上移除」一個節點（例如把 head 指標 CAS 到 next），另一個執行緒可能仍持有指向該節點的指標並準備讀取它。若移除節點的執行緒立刻 `delete` 該節點，第二個執行緒的讀取就是 use-after-free；更糟的是，若記憶體配置器把這塊記憶體重新配置給別的物件，讀到的資料看似合法卻是完全錯誤的內容，除錯時很難與「單純的空指標存取」區分。\n\n正確作法是不要立即釋放：使用 hazard pointer 讓每個執行緒宣告「目前正在存取哪些指標」，回收執行緒在真正 `delete` 前先檢查沒有任何執行緒宣告該指標；或採用 epoch-based reclamation，將節點放入延後回收佇列，等所有可能持有舊參照的執行緒都離開該 epoch 後才真正釋放。實務上建議優先使用成熟函式庫（如 folly::hazptr、libcds）而非手刻，因為正確實作這些機制的細節（記憶體順序、ABA 交互作用）非常容易出錯。',
    },
    {
      heading: '死結與不一致的鎖排序',
      body: '死結（deadlock）最常見的成因是多個執行緒以不同順序取得多把鎖：執行緒 1 先鎖 A 再鎖 B，執行緒 2 先鎖 B 再鎖 A，兩者同時執行時可能各自持有一把鎖並永久等待對方釋放另一把。上方 `badTransfer` 就是典型案例：轉帳方向不同時，鎖的取得順序就跟著顛倒。\n\n修法有三種常見套路：（一）全域約定鎖的固定取得順序（例如永遠先鎖位址較小的 mutex），需要在每個呼叫點手動遵守，容易因為疏忽而破功；（二）使用 `std::lock`（C++11）或 `std::scoped_lock`（C++17）一次鎖住多個 mutex，函式庫內部保證不會死結，不需要呼叫端自行排序，是目前建議的預設寫法；（三）盡量縮小臨界區、避免在持有鎖時呼叫可能回頭取得同一把鎖的外部程式碼（重入死結）或呼叫使用者提供的回呼。',
    },
    {
      heading: 'False sharing：看不見的效能反面教材',
      body: 'False sharing 不是正確性問題而是效能反面教材：兩個邏輯上互不相關的變數，只因為記憶體位址相鄰而落在同一條 cache line（常見 64 bytes）內，當不同核心分別頻繁寫入各自的變數時，快取一致性協定（如 MESI）會把整條 cache line 在核心間反覆判為失效並搬動，即使程式邏輯完全正確，效能也可能退化數倍甚至數十倍。這類問題在 profiler 上通常表現為「莫名其妙的高 cache miss／高記憶體頻寬」，但程式碼審查很難單靠肉眼發現。\n\n修法是透過 `alignas` 搭配 padding，強迫每個高頻寫入的變數獨佔一條 cache line（如上方 `PaddedCounter`），或者調整資料結構配置，把「同一執行緒常一起存取」的欄位放在一起、把「不同執行緒各自寫入」的欄位隔開。C++17 起 `std::hardware_destructive_interference_size` 提供了可移植取得「避免 false sharing 所需的最小間距」的方式，取代早期靠猜測寫死 64 的做法。',
    },
    {
      heading: '在 par_unseq 演算法中使用不安全的可呼叫物件',
      body: 'C++17 引入的執行策略中，`std::execution::par_unseq` 允許演算法把工作分派到多個執行緒，且同一執行緒內的呼叫還可能被向量化（交錯執行）。這對傳入的可呼叫物件（函式、lambda、functor）施加了嚴格限制：它不可以呼叫任何會取得鎖的操作（包含隱式取鎖的操作，例如某些配置器內部的鎖），不可以配置/釋放記憶體（在許多實作中視為潛在的鎖操作），也不可以拋出例外——因為向量化執行下，例外的堆疊展開語意與 SIMD 交錯執行是不相容的，一旦違反即為未定義行為。\n\n常見誤用是把一個「看起來單純」的 lambda 傳給 `std::for_each(std::execution::par_unseq, ...)`，但 lambda 內部呼叫了會拋例外的 `.at()`、使用了 `std::mutex` 保護的日誌函式，或呼叫了未標示 `noexcept` 但實際上可能配置記憶體的函式。正確做法是嚴格審視傳給 `par_unseq` 的可呼叫物件：確保它是純計算、不上鎖、不配置、且標示或保證 `noexcept`；若真的需要鎖或例外處理，應退回使用限制較寬鬆的 `std::execution::par`。',
    },
  ],
  pitfalls: [
    '無鎖結構回收節點時機過早：邏輯上「移除」節點後立即 `delete`，卻仍有其他執行緒持有指向該節點的指標，造成 use-after-free，且錯誤現象常與記憶體重新配置交織，難以用一般除錯工具重現。',
    'ABA 問題被誤判為「CAS 已經證明沒問題」：只比較值本身而不比較版本號／世代編號，讓「值被改回原值」的中間變化被完全忽略。',
    '把 `std::scoped_lock` 誤用成逐一個別 `lock_guard`：分開鎖多個 mutex 又沒有統一順序，等於重新引入死結風險，`std::scoped_lock` 的優勢在於「一次同時鎖多把」而非單純語法糖。',
    '假設 cache line 大小恆為 64 bytes 並寫死在程式碼中，而不使用 `std::hardware_destructive_interference_size`，在不同微架構上可能失去 padding 的效果。',
    '把會拋例外或內部上鎖的函式物件直接丟進 `par_unseq` 演算法，只在未觸發例外/鎖競爭路徑的測試下「看起來正常」，實際上已是未定義行為，一旦條件改變（例如輸入資料觸發例外分支）就會出錯或崩潰。',
    '以為 `noexcept` 標記本身能「保證」安全用於 `par_unseq`：`noexcept` 只承諺不拋出例外，並不保證函式內部沒有上鎖或沒有記憶體配置，仍需逐一檢查。',
  ],
  bestPractices: [
    '共享且可能被多執行緒寫入的狀態一律使用 `std::atomic` 或以 mutex／`std::scoped_lock` 保護，絕不用 `volatile` 取代同步原語。',
    '需要多把鎖時一律使用 `std::scoped_lock`（或 `std::lock` + `std::adopt_lock`），不要依賴人工約定的鎖排序；找不到合適場景時才考慮個別 `lock_guard`。',
    '無鎖結構的節點回收一律搭配 hazard pointer、epoch-based reclamation 或 `std::atomic<std::shared_ptr<T>>` 等成熟機制，且優先選用經過驗證的函式庫而非手刻。',
    '高頻寫入的獨立原子變數之間以 `alignas` 與 padding（或 `std::hardware_destructive_interference_size`）隔開，避免 false sharing 拖垮多核心擴展性。',
    '傳給 `std::execution::par_unseq` 的可呼叫物件必須是純計算、不上鎖、不動態配置且不拋例外；若做不到，改用 `par` 或 `seq`。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '執行緒 A 讀到某無鎖結構節點的指標值為 P，被排程器搶佔；期間另一執行緒釋放並重新配置出同樣位址 P 的新節點；A 恢復後用 CAS 比較「值仍是 P」而成功寫回。這是哪一種反面教材？',
      options: [
        { id: 'a', text: '死結（deadlock）' },
        { id: 'b', text: 'False sharing' },
        { id: 'c', text: 'ABA 問題' },
        { id: 'd', text: '單純的資料競爭' },
      ],
      correctOptionId: 'c',
      explanation:
        'CAS 只比較「值是否仍等於預期值」，若該位址曾被改成別的值又改回相同值（此例中是被釋放後重新配置到同一位址），CAS 會誤判「期間未發生變化」，這正是 ABA 問題的定義，需以版本號或延後回收機制防範。',
    },
    {
      id: 'q2',
      stem: '兩個執行緒各自負責遞增一個獨立的 `std::atomic<long>` 計數器，兩個計數器被宣告為同一個 struct 裡相鄰的成員且未做任何 padding，效能實測遠低於預期。最可能的原因是什麼？',
      options: [
        { id: 'a', text: '兩個計數器發生 ABA 問題' },
        {
          id: 'b',
          text: 'False sharing：兩個計數器落在同一條 cache line，跨核心寫入互相使對方快取失效',
        },
        { id: 'c', text: '兩個原子變數之間發生資料競爭' },
        { id: 'd', text: '`std::atomic` 本身效能太差，與此情境無關' },
      ],
      correctOptionId: 'b',
      explanation:
        '`std::atomic` 各自的操作本身沒有資料競爭問題；當兩個各被不同核心高頻寫入的變數共用一條 cache line 時，快取一致性協定會反覆使該行在核心間失效搬動，即 false sharing，修法是用 alignas/padding 讓兩者分屬不同 cache line。',
    },
    {
      id: 'q3',
      stem: '在傳給 `std::for_each(std::execution::par_unseq, ...)` 的 lambda 內部呼叫了一個可能拋出例外的 `.at()` 存取，這屬於哪一種反面教材？',
      options: [
        { id: 'a', text: '合法用法，只要例外最終被外層 try/catch 接住即可' },
        {
          id: 'b',
          text: '在 par_unseq 中使用不安全的可呼叫物件：向量化交錯執行下拋出例外是未定義行為',
        },
        { id: 'c', text: 'False sharing' },
        { id: 'd', text: '死結' },
      ],
      correctOptionId: 'b',
      explanation:
        '`par_unseq` 允許同一執行緒內的呼叫被向量化交錯執行，這與例外的堆疊展開語意不相容；傳入的可呼叫物件必須保證不拋出例外、不上鎖、不動態配置，否則即為未定義行為，不是「只要外層接得住就沒事」。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: [
      '資料競爭 / volatile 誤用',
      'ABA 問題',
      '無鎖回收 use-after-free',
      '死結（鎖排序不一致）',
      'False sharing',
      'par_unseq 不安全可呼叫物件',
    ],
    caption:
      '六種反面教材涵蓋從「基本同步」到「進階無鎖與執行策略」的完整光譜：越靠左的問題（資料競爭、volatile 誤用）幾乎每個並行程式都可能踩到，越靠右的問題（false sharing、par_unseq 誤用）則更多出現在效能導向與高階演算法程式碼中，但同樣可能是未定義行為或嚴重效能退化的根源。',
  },
  tryIt: {
    code: `#include <atomic>
#include <cstdio>
#include <mutex>
#include <thread>

// Deadlock anti-pattern vs. std::scoped_lock fix. Toggle which transfer
// function main() calls to compare the two behaviors.

struct Account {
  std::mutex mtx;
  int balance = 100;
};

void badTransfer(Account& from, Account& to, int amount) {
  std::lock_guard<std::mutex> lock_from(from.mtx);
  std::lock_guard<std::mutex> lock_to(to.mtx);
  from.balance -= amount;
  to.balance += amount;
}

void goodTransfer(Account& from, Account& to, int amount) {
  std::scoped_lock lock(from.mtx, to.mtx);
  from.balance -= amount;
  to.balance += amount;
}

int main() {
  Account a, b;

  // Two threads transferring in opposite directions with badTransfer()
  // can deadlock; with goodTransfer() they cannot, regardless of order.
  std::thread t1([&]() { goodTransfer(a, b, 10); });
  std::thread t2([&]() { goodTransfer(b, a, 5); });
  t1.join();
  t2.join();

  std::printf("a.balance = %d, b.balance = %d\\n", a.balance, b.balance);
  return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Undefined behavior - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/ub',
      description: '未定義行為的官方定義與常見觸發情境列表。',
    },
    {
      title: 'ThreadSanitizer - Clang Documentation',
      href: 'https://clang.llvm.org/docs/ThreadSanitizer.html',
      description: '偵測資料競爭與部分死結情境的執行期工具，建議整合進 CI。',
    },
    {
      title: 'std::hardware_destructive_interference_size - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/thread/hardware_destructive_interference_size',
      description: '可移植取得避免 false sharing 所需最小間距的標準做法。',
    },
    {
      title:
        'Understanding and Effectively Preventing the ABA Problem in Descriptor-based Lock-free Designs',
      href: 'https://www.cs.tau.ac.il/~shanir/nir-pubs-web/Papers/ABA_prevention.pdf',
      description: '系統性分析 ABA 問題成因與描述子式無鎖設計中的預防手法。',
    },
  ],
};

export default appendixCUbAntipatterns;
