import type { ChapterContent } from '@/types/ChapterContent';

const ind11SafeMemoryReclamation: ChapterContent = {
  slug: 'ind11-safe-memory-reclamation',
  chapterLabel: '第 11 章',
  title: '安全記憶體回收',
  group: 'K · 第三部：無鎖與並行資料結構',
  description:
    'Hazard Pointers 與 RCU（C++26 標準化方向）、epoch-based reclamation，以及 shared_ptr 原子操作的真實代價。',
  concept: {
    standard: 'C++26',
    body:
      '無鎖資料結構把節點從結構「摘除」很容易，難的是「何時真正釋放」：其他執行緒可能仍持有指向該節點的原始指標，直接 delete 會造成釋放後使用（use-after-free）。安全記憶體回收（Safe Memory Reclamation, SMR）就是解決「延後釋放直到確定沒有人在看」的一族技術，主流做法有三：hazard pointers（每個執行緒公告自己正在存取的指標）、epoch-based reclamation（以全域世代計數器界定安全區間）、RCU（read-copy-update，讀路徑幾乎零開銷，寫路徑等待寬限期）。C++26 正朝著把 hazard pointer 與 RCU 風格 API 標準化的方向推進（P2530／P2545 等提案），但目前主流生產環境仍仰賴 folly::hazptr、libcds、URCU 等第三方函式庫。另一條「看似安全」的捷徑是 std::atomic<std::shared_ptr<T>>，它用控制區塊的原子引用計數換取記憶體安全，但代價往往讓熱路徑無鎖結構得不償失。',
  },
  code: {
    lang: 'cpp',
    code: `#include <array>
#include <atomic>
#include <thread>

// 極簡 hazard pointer：固定大小的公告陣列，每個執行緒一個槽。 [1]
template <typename T, int MaxThreads = 64>
class HazardPointerDomain {
public:
    T* protect(std::atomic<T*>& source) {
        T* ptr;
        do {
            ptr = source.load(std::memory_order_acquire);
            slot(hazard_slot()).store(ptr, std::memory_order_release);  // [2]
            // 重讀一次，避免公告完成前 source 已被更新又被回收。 [3]
        } while (ptr != source.load(std::memory_order_acquire));
        return ptr;
    }

    void clear() {
        slot(hazard_slot()).store(nullptr, std::memory_order_release);  // [4]
    }

    bool is_protected(T* ptr) const {
        for (auto& h : slots_) {
            if (h.load(std::memory_order_acquire) == ptr) return true;  // [5]
        }
        return false;
    }

private:
    static int hazard_slot() {
        static thread_local int id = next_id_.fetch_add(1, std::memory_order_relaxed);
        return id;
    }

    std::atomic<T*>& slot(int i) { return slots_[i]; }

    std::array<std::atomic<T*>, MaxThreads> slots_{};
    static inline std::atomic<int> next_id_{0};
};

// 使用範例：pop 前先「保護」節點，讀完再清除公告。 [6]
template <typename T>
struct Node {
    T value;
    Node* next;
};`,
    callouts: [
      { n: 1, text: '每個執行緒對應公告陣列中的一個槽，用來宣告「目前我正指向哪個節點」。' },
      { n: 2, text: '把讀到的指標寫入自己的槽，向其他執行緒（尤其是回收者）公告：這個節點正被使用。' },
      { n: 3, text: '公告後必須重讀 source，確認節點在公告完成前沒有被別的執行緒搶先摘除並回收。' },
      { n: 4, text: '用完節點後清空自己的槽，讓回收者知道可以考慮釋放這個節點了。' },
      { n: 5, text: '回收者釋放某節點前，必須掃過所有槽確認沒有任何執行緒仍公告該指標。' },
      { n: 6, text: 'push/pop 等操作在存取共享節點期間都要保持公告，直到不再需要該指標為止。' },
    ],
  },
  deepDive: [
    {
      heading: '回收問題回顧與 hazard pointers 機制',
      body:
        '`lab-lock-free` 範例的 push 從未真正釋放節點——這是刻意簡化，因為一旦支援 pop 並釋放節點，就必須回答「其他執行緒此刻是否仍持有指向這個節點的指標？」直接 `delete` 可能導致某執行緒正在讀取已被釋放的記憶體。\n\nHazard pointers 的做法是：每個執行緒維護一小組「公告槽」，在解參考某個共享指標之前，先把該指標寫入自己的槽（`publish`），並重新確認指標未變；用完之後清空槽（`clear`）。想回收某節點的執行緒（reclaimer）在真正 `delete` 前，必須掃描所有執行緒的公告槽，確認沒有人仍在使用該指標，否則就把它放進「待回收清單」延後處理。優點是回收延遲有界、不需要全域同步點；缺點是每次讀取都要付出一次額外的原子寫入與重讀。',
    },
    {
      heading: 'Epoch-based reclamation 機制',
      body:
        'Epoch-based reclamation（EBR，Crossbeam／RCU 系列設計常見手法）改用「世代計數器」取代逐指標公告。系統維護一個全域 epoch（通常只有幾個值，例如 0/1/2 循環），每個執行緒進入臨界區時記錄自己目前所在的全域 epoch 作為 local epoch；離開臨界區則清除。\n\n當節點被摘除時，會連同「當時的全域 epoch」一起放入待回收清單（retire）。回收者只需確認所有執行緒的 local epoch 都已經前進到超過該節點被摘除時的 epoch，就能安全釋放整批節點——不用逐一比對指標。優點是攤銷成本低、實作單純；代價是回收具有「批次延遲」（要等到 epoch 前進），且若某執行緒長時間停留在同一 epoch（例如被搶佔或掛住），會讓所有待回收節點無限期堆積。',
    },
    {
      heading: 'RCU 概念與 C++26 標準化方向',
      body:
        'RCU（Read-Copy-Update）是 epoch 思路的極致優化版本，專為「讀多寫少」場景設計：讀者完全不需要任何同步原語（甚至連原子操作都省略，靠編譯器屏障即可），寫者則透過「先複製、修改副本、再原子性地切換指標」的方式更新資料，並等待一個「寬限期（grace period）」——確保所有在切換前就已經開始的讀取都已結束——才釋放舊版本。這使 RCU 在 Linux 核心等讀路徑極熱的場景中幾乎零開銷，但寫路徑成本較高，且不適合寫頻繁的場景。\n\nC++ 標準委員會的並行工作組已提出多項提案（如 P2530 Hazard Pointer for C++26、P2545 RCU 相關方向）希望把 hazard pointer 與 RCU 風格 API 納入標準庫，讓開發者不必依賴第三方函式庫即可取得經過驗證、可移植的安全記憶體回收機制。截至目前，這些仍在提案／實驗階段，生產程式碼仍普遍倚賴 folly::hazptr、libcds、liburcu 等成熟實作。',
    },
    {
      heading: 'std::shared_ptr 原子操作的真實代價',
      body:
        'C++20 起可用 `std::atomic<std::shared_ptr<T>>`（或更早的 `std::atomic_load`/`atomic_store` 自由函式）讓多執行緒安全地讀寫同一個 shared_ptr，藉由控制區塊的原子引用計數自動延後釋放，直覺上正是「安全記憶體回收」的現成解法。\n\n但代價不小：每次複製 shared_ptr 都牽涉控制區塊的原子 increment，釋放則是原子 decrement 並在歸零時觸發刪除器；在高競爭的熱路徑上，這些原子 RMW 操作會造成快取行來回彈跳（cache-line ping-pong），且控制區塊本身往往落在與節點資料不同的快取行，進一步增加記憶體流量。相較之下，hazard pointers 或 epoch-based reclamation 把「公告成本」限制在讀取路徑的一次原子寫入，回收成本則攤銷到背景批次處理，通常比 shared_ptr 的逐次原子引用計數快上一個數量級。因此在效能敏感的無鎖資料結構中，shared_ptr 更適合作為「正確性優先、頻率不高」的兜底方案，而非熱路徑的預設選擇。',
    },
  ],
  pitfalls: [
    '在節點仍被其他執行緒的 hazard pointer 公告時就將其釋放，造成釋放後使用。',
    '誤以為 std::atomic<std::shared_ptr> 的「執行緒安全」等於「免費」，忽略控制區塊原子引用計數在熱路徑上的實際開銷。',
    'epoch-based reclamation 中若某執行緒長期停滯在舊 epoch（例如被排程延遲），會讓待回收清單無限增長，形同記憶體洩漏。',
    'hazard pointer 的公告槽數量固定，執行緒數超過上限時會沒有槽可用，需要動態擴充或執行緒池化管理。',
    '忘記在讀取路徑結束後清除公告（`clear`），導致回收者誤判該節點仍被使用而永遠無法釋放。',
  ],
  bestPractices: [
    '優先採用經生產驗證的函式庫（folly::hazptr、libcds、liburcu），避免自行實作 SMR 的邊界情境陷阱。',
    '熱路徑（高頻讀取、低頻結構變動）優先考慮 hazard pointers 或 RCU；shared_ptr 適合正確性優先、頻率較低的場景。',
    '監控 epoch-based reclamation 的世代前進速度，避免任何執行緒長期停滯導致待回收清單暴增。',
    '以 ThreadSanitizer／ASan 搭配壓力測試驗證回收時機，確保沒有 use-after-free 或雙重釋放。',
    '關注 C++26 hazard pointer／RCU 標準化提案的進度，逐步評估以標準庫取代第三方依賴的可行性。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: 'Hazard pointers 主要透過什麼機制避免釋放後使用？',
      options: [
        { id: 'a', text: '每個執行緒公告自己正在存取的指標，回收者釋放前確認沒有任何公告指向該節點' },
        { id: 'b', text: '把所有記憶體配置改成靜態陣列，永不釋放' },
        { id: 'c', text: '用互斥鎖保護每一次指標讀取' },
        { id: 'd', text: '編譯器自動偵測並延後所有 delete 呼叫' },
      ],
      correctOptionId: 'a',
      explanation:
        'Hazard pointers 讓每個執行緒在解參考前把指標寫入自己的公告槽，回收者掃描所有槽確認無人仍在使用後才真正釋放，避免釋放後使用。',
    },
    {
      id: 'q2',
      stem: '為什麼 epoch-based reclamation 中，某個執行緒長期停滯會是個問題？',
      options: [
        { id: 'a', text: '會讓該執行緒的 CAS 操作永遠失敗' },
        { id: 'b', text: '會導致全域 epoch 無法前進，使所有待回收節點無限期堆積，形同記憶體洩漏' },
        { id: 'c', text: '會讓其他執行緒的原子操作變成非原子' },
        { id: 'd', text: '完全沒有影響，因為 epoch 是每執行緒獨立的' },
      ],
      correctOptionId: 'b',
      explanation:
        '回收必須等所有執行緒的 local epoch 都前進超過節點被摘除時的 epoch；只要有一個執行緒停滯在舊 epoch，待回收清單就會持續累積而無法釋放。',
    },
    {
      id: 'q3',
      stem: '為什麼 std::atomic<std::shared_ptr<T>> 儘管記憶體安全，卻常常不適合熱路徑的無鎖資料結構？',
      options: [
        { id: 'a', text: '因為 shared_ptr 不支援多執行緒環境，會直接產生未定義行為' },
        { id: 'b', text: '因為每次複製／釋放都牽涉控制區塊的原子引用計數操作，在高競爭下造成明顯的快取行彈跳與延遲' },
        { id: 'c', text: '因為 shared_ptr 在 C++20 之前完全無法用於原子操作' },
        { id: 'd', text: '因為 shared_ptr 會強制使用互斥鎖而非原子操作' },
      ],
      correctOptionId: 'b',
      explanation:
        'shared_ptr 的安全性來自控制區塊的原子引用計數，但這代表每次複製或釋放都是一次原子 RMW，在高競爭熱路徑上會造成快取行來回彈跳，通常比 hazard pointers／epoch-based reclamation 慢上一個數量級。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['Hazard Pointer', 'Epoch-based', 'RCU'],
    caption:
      '三種安全記憶體回收策略的定位：Hazard Pointer 逐指標公告、Epoch-based 以世代計數批次延後、RCU 讀路徑零開銷但寫路徑等待寬限期。',
  },
  tryIt: {
    code: `#include <array>
#include <atomic>
#include <iostream>
#include <thread>
#include <vector>

// 簡化示範：用一個公告槽陣列模擬 hazard pointer 的「保護 -> 使用 -> 清除」流程。
constexpr int kMaxThreads = 4;
std::array<std::atomic<int*>, kMaxThreads> hazard_slots{};

int* protect(std::atomic<int*>& source, int slot) {
    int* ptr;
    do {
        ptr = source.load(std::memory_order_acquire);
        hazard_slots[slot].store(ptr, std::memory_order_release);
    } while (ptr != source.load(std::memory_order_acquire));
    return ptr;
}

void clear(int slot) { hazard_slots[slot].store(nullptr, std::memory_order_release); }

bool is_protected(int* ptr) {
    for (auto& h : hazard_slots) {
        if (h.load(std::memory_order_acquire) == ptr) return true;
    }
    return false;
}

int main() {
    std::atomic<int*> shared_node{new int{42}};

    std::thread reader([&] {
        int* p = protect(shared_node, /*slot=*/0);
        std::cout << "reader sees value = " << *p << "\\n";
        clear(0);
    });
    reader.join();

    int* node = shared_node.load();
    if (!is_protected(node)) {
        delete node;  // 沒有任何執行緒公告該指標，可安全釋放。
        std::cout << "node safely reclaimed\\n";
    }
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'folly::hazptr — Hazard Pointers in Folly',
      href: 'https://github.com/facebook/folly/blob/main/folly/synchronization/Hazptr.h',
      description: 'Meta 的 folly 函式庫中生產等級 hazard pointer 實作與 API 說明。',
    },
    {
      title: 'libcds — Concurrent Data Structures library',
      href: 'https://github.com/khizmax/libcds',
      description: '涵蓋 hazard pointers、epoch-based (RCU-like) 回收策略的 C++ 無鎖資料結構函式庫。',
    },
    {
      title: 'What is RCU, Fundamentally? — LWN.net',
      href: 'https://lwn.net/Articles/262464/',
      description: 'Paul McKenney 撰寫的 RCU 原理經典解說，涵蓋讀路徑零開銷與寬限期概念。',
    },
    {
      title: 'std::atomic<std::shared_ptr> - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/memory/shared_ptr/atomic2',
      description: 'C++20 起 shared_ptr 的原子特化版本與其語意、成本說明。',
    },
  ],
};

export default ind11SafeMemoryReclamation;
