import type { ChapterContent } from '@/types/ChapterContent';

const appendixAFeatureTimeline: ChapterContent = {
  slug: 'appendix-a-feature-timeline',
  chapterLabel: '附錄 A',
  title: 'C++11→C++26 並行特性年表',
  group: '附錄',
  description:
    'C++11 到 C++26 並行相關語言與函式庫特性的年表，以及各特性在 GCC／Clang／MSVC／nvc++／ROCm 的支援矩陣。',
  concept: {
    standard: 'C++26',
    body: '這份附錄不是一堂課，而是一份查表用的參考資料：把 C++11 到 C++26（含草案階段）與並行相關的語言／函式庫特性，依標準版本整理成年表，並附上各主要編譯器（GCC、Clang、MSVC、nvc++、ROCm/HIP）的支援概況。C++ 的並行能力是逐版累積的——`<thread>` 與記憶體模型在 C++11 打下地基，C++17 帶來平行演算法，C++20 補齊協程與同步原語，C++23／26 則朝向 senders/receivers 與 SIMD 標準化前進。實務上真正決定能不能用某特性的，從來不是「標準發布年份」，而是你目標工具鏈當下的函式庫實作進度，因此本附錄刻意用方向性描述而非精確版本號，並提醒讀者以官方 conformance 表為準。',
  },
  deepDive: [
    {
      heading: 'C++11：地基——執行緒、原子性與正式的記憶體模型',
      body: 'C++11 首次把並行程式設計納入標準本身，之前只能仰賴 pthreads 或平台特定 API。核心新增包括：`<thread>`（`std::thread` 可攜式建立/join 執行緒）、`<atomic>`（`std::atomic<T>` 與明確的 memory_order，讓無鎖程式設計有標準語意）、`<mutex>`（`std::mutex`／`std::lock_guard`／`std::unique_lock`）、`<condition_variable>`（配合 mutex 的等待/喚醒）、`<future>`（`std::future`／`std::promise`／`std::async`，把非同步結果包裝成可組合物件）。\n\n最重要但最容易被忽視的是「C++ 記憶體模型」的正式化：它定義了什麼是資料競爭（data race）、happens-before 關係，以及各種 memory_order（`relaxed`／`acquire`／`release`／`seq_cst`）的精確語意。在這之前，C++ 標準完全沒有「多執行緒」的概念，編譯器最佳化甚至可能假設程式是單執行緒的。',
    },
    {
      heading: 'C++14／C++17：小補丁與平行演算法的到來',
      body: 'C++14 對並行本身著墨不多，主要是輔助性工具，例如 `std::exchange`（常用於無鎖資料結構與 move-only 型別的實作技巧）以及泛型 lambda，讓撰寫並行相關的函式物件更方便。`std::shared_timed_mutex` 也在此時出現，是後續讀寫鎖的前身。\n\nC++17 才是真正的重點：`<execution>` 引入平行演算法的執行策略（`std::execution::seq`／`par`／`par_unseq`），讓 `std::sort`、`std::transform` 等超過 100 個標準演算法可以宣告式地要求平行或向量化執行，而不必手寫執行緒池。同時新增 `std::shared_mutex`（真正的讀寫鎖）與 `std::scoped_lock`（可一次無死鎖地鎖定多個 mutex，取代巢狀的 `std::lock` + `std::adopt_lock` 慣用法）。',
    },
    {
      heading: 'C++20：協程、可停止執行緒與一整組新同步原語',
      body: 'C++20 是並行相關特性最密集的一版。執行緒模型面：`std::jthread` 取代 `std::thread`，解構時自動 join 並內建 `std::stop_token` 可協作式取消；`std::stop_token`／`std::stop_source` 提供標準化的取消訊號機制，不再需要自行用 `std::atomic<bool>` 拼湊。\n\n同步原語面：`std::latch`（一次性倒數閂）、`std::barrier`（可重複使用的集合點，支援完成階段回呼）、`std::counting_semaphore`／`std::binary_semaphore`（標準號誌），加上 `std::atomic_ref`（讓非 atomic 物件也能以原子方式存取）與 `std::atomic<T>::wait`／`notify_one`／`notify_all`（輕量的 futex 風格阻塞，不必再靠 condition_variable）。\n\n另一大支柱是協程（`co_await`／`co_yield`／`co_return`），但 C++20 只定義了語言層機制，標準函式庫並未附上 task／generator 型別，需要自行實作或依賴第三方函式庫，這也是「協程雖然是 C++20 語言特性，但要好用往往要等到 C++23 甚至更晚」的常見誤解來源。此外 `std::span`（非擁有的連續記憶體視圖）雖非狹義的並行特性，但在平行資料傳遞上極常用；容易與 C++23 的 `std::mdspan` 搞混，切記 `span` 是 C++20、`mdspan` 是 C++23。平行演算法也新增 `std::execution::unseq`（純向量化、不含平行）補齊策略矩陣。',
    },
    {
      heading: 'C++23：多維視圖、產生器與錯誤處理的並行周邊',
      body: 'C++23 補齊了幾塊 C++20 協程留下的空缺與資料檢視能力：`std::mdspan`（多維、可自訂佈局與存取策略的陣列視圖，對平行數值運算的資料切分非常關鍵）、`std::generator`（標準化的協程產生器型別，終於補上 C++20 協程缺的「開箱即用」範例）。\n\n`std::expected`（顯式的成功/錯誤聯集型別）雖非並行專屬，但在非同步管線裡取代例外做錯誤傳遞非常實用；`std::stacktrace` 則有助於除錯多執行緒程式的崩潰堆疊。整體而言 C++23 較少新增「核心」並行原語，更多是讓 C++20 引入的機制變得真正可用。',
    },
    {
      heading: 'C++26（截至撰寫時為提案／草案階段，需以官方最終決議為準）',
      body: 'C++26 尚未定稿，以下條列的是目前並行相關、討論熱度較高、且已進入或接近進入工作草案的提案方向，實際是否、以何種形式進入最終標準仍可能變動，讀者應以 WG21 官方文件與各編譯器發行紀錄為準：`std::execution`（P2300，senders/receivers，統一非同步/平行任務組合的框架，被視為 C++ 並行史上規模最大的函式庫提案之一）、`std::simd`（P1928，可攜式資料平行 SIMD 型別，取代長期只能依賴編譯器內建向量型別或第三方函式庫的局面）、`std::linalg`（P1673，BLAS 風格的線性代數演算法，受益於底層平行/向量化）、hazard pointer 與 RCU 風格的無鎖記憶體回收機制標準化方向、`std::hive`（原 `std::colony`，一種允許平行安全插入/刪除的容器）。這些特性即使被正式採納，編譯器與標準函式庫實作通常也會落後標準發布一段時間，切勿假設「標準定案＝隔天就能用」。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <mutex>
#include <thread>
#include <version>  // [1] 取得所有 __cpp_lib_* / __cpp_* 功能測試巨集

// 以功能測試巨集撰寫跨標準版本皆可編譯的可攜程式碼。
// 這是業界推薦的做法：不要用 __cplusplus 猜測函式庫是否齊全，
// 因為「語言標準版本」與「函式庫實作進度」經常不同步。

#if defined(__cpp_lib_jthread)  // [2] C++20：可自動 join、可取消的執行緒
using WorkerThread = std::jthread;
#else
using WorkerThread = std::thread;  // 退回 C++11 的 std::thread，需自行 join
#endif

#if defined(__cpp_lib_barrier)  // [3] C++20：可重複使用的集合點
#include <barrier>
void sync_phase(std::barrier<>& sync_point) { sync_point.arrive_and_wait(); }
#endif

#if defined(__cpp_lib_shared_mutex)  // [4] C++17：讀寫鎖
#include <shared_mutex>
using ReadWriteLock = std::shared_mutex;
#else
using ReadWriteLock = std::mutex;  // 退回一般互斥鎖，犧牲讀取平行度
#endif

#if __has_include(<execution>)  // [5] C++17：平行演算法執行策略
#include <execution>
constexpr bool kHasExecutionPolicies = true;
#else
constexpr bool kHasExecutionPolicies = false;
#endif

int main() {
    WorkerThread worker([] {
        // 若底層是 std::jthread，離開作用域時會自動請求停止並 join；
        // 若退回 std::thread，呼叫端必須自行負責 join，否則會 std::terminate。
    });

    if constexpr (!std::is_same_v<WorkerThread, std::jthread>) {
        worker.join();  // [6] 僅在退回 std::thread 時才需要手動 join
    }

    return kHasExecutionPolicies ? 0 : 1;
}`,
    callouts: [
      {
        n: 1,
        text: '<version> 是取得所有標準功能測試巨集（__cpp_lib_*／__cpp_*）最乾淨的方式，不需要為了巨集特別 include 對應的重量級標頭。',
      },
      {
        n: 2,
        text: '__cpp_lib_jthread 只有在函式庫真的實作了 std::jthread 時才會被定義；語言支援 C++20 不代表函式庫已跟上。',
      },
      {
        n: 3,
        text: 'std::barrier 是 C++20 新增的可重複使用集合點，透過功能測試巨集判斷可用性再決定是否納入編譯單元。',
      },
      {
        n: 4,
        text: '找不到 __cpp_lib_shared_mutex 時退回一般 std::mutex，讀取效能會下降，但至少維持可編譯、可正確運作。',
      },
      {
        n: 5,
        text: '__has_include 是檢查標頭是否存在的可攜寫法，適合用來偵測整個功能區塊（如 <execution>）是否被實作。',
      },
      {
        n: 6,
        text: 'std::jthread 解構時自動 join；若退回 std::thread 則必須顯式呼叫 join，否則物件解構時仍持有可 join 狀態會直接 std::terminate。',
      },
    ],
  },
  pitfalls: [
    '只檢查編譯器宣稱支援 `--std=c++23`／`--std=c++20`，就假設對應的函式庫特性（如 `std::generator`、`std::jthread`）也已經實作完成——語言與函式庫的支援進度經常脫節。',
    '直接寫死版本號比較（例如 `#if __cplusplus >= 202002L`）來判斷特性可用性，而不是用 `__cpp_lib_*` 功能測試巨集；同一語言版本下不同函式庫實作的完成度可能不同。',
    '長期依賴編譯器特定的實驗性命名空間（如早期的 `std::experimental::coroutine`／`std::experimental::simd`）而不設定遷移期限，等到正式標準定案時介面已改變，導致大量程式碼需要重寫。',
    '假設 C++26 的提案（如 `std::execution`／`std::simd`）已是定案特性並直接依賴其細節設計於生產程式碼，而未意識到提案階段的介面仍可能在標準化過程中修改甚至被否決。',
    '把「本機開發環境的編譯器版本很新」等同於「部署環境也支援同樣特性」，跨團隊、跨平台建置時才發現線上編譯器版本落後，導致 CI 失敗。',
  ],
  bestPractices: [
    '優先使用 `<version>` 標頭提供的 `__cpp_lib_*`／`__cpp_*` 功能測試巨集做條件式編譯，而非臆測或依賴 `__cplusplus` 版本號。',
    '在導入任何新標準特性前，查閱 cppreference 的 compiler support 表與各編譯器官方 conformance 頁面，並在 CI 對目標平台的最低編譯器版本實際驗證，而非只在開發機上測試。',
    '把仍在草案／提案階段的特性（如目前的 C++26 項目）隔離在一個相容性標頭或介面層之後，一旦標準定案或實作改變介面，只需修改該層，不必動到整個程式碼庫。',
    '對關鍵並行原語（`jthread`、`barrier`、`shared_mutex` 等）準備明確的降級路徑（fallback），讓程式碼在較舊工具鏈上仍可編譯，即使效能或功能略打折扣。',
    '定期（例如每季）重新檢視工具鏈支援矩陣，因為 GCC／Clang／MSVC 的函式庫實作進度更新頻繁，本附錄的版本描述只反映撰寫當下的概況。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '下列哪一組並行原語是在 C++20 才被加入標準函式庫的？',
      options: [
        { id: 'a', text: 'std::thread、std::mutex、std::future' },
        { id: 'b', text: 'std::shared_mutex、std::scoped_lock、執行策略 par/par_unseq' },
        { id: 'c', text: 'std::jthread、std::latch、std::barrier、std::counting_semaphore' },
        { id: 'd', text: 'std::mdspan、std::generator、std::expected' },
      ],
      correctOptionId: 'c',
      explanation:
        'std::jthread（可自動 join、可取消的執行緒）、std::latch、std::barrier、std::counting_semaphore 都是 C++20 新增的同步／執行緒原語；(a) 屬於 C++11，(b) 屬於 C++17，(d) 屬於 C++23。',
    },
    {
      id: 'q2',
      stem: '關於 std::span 與 std::mdspan，下列敘述何者正確？',
      options: [
        { id: 'a', text: '兩者都是 C++20 引入的' },
        { id: 'b', text: 'std::span 是 C++20，std::mdspan 是 C++23，兩者引入的標準版本不同' },
        { id: 'c', text: '兩者都是 C++23 引入的' },
        { id: 'd', text: 'std::mdspan 比 std::span 更早引入標準' },
      ],
      correctOptionId: 'b',
      explanation:
        'std::span（一維、非擁有的連續記憶體視圖）於 C++20 引入；std::mdspan（多維視圖，支援自訂佈局與存取策略）則要到 C++23 才加入標準函式庫，兩者常被誤以為同時引入。',
    },
    {
      id: 'q3',
      stem: '截至本附錄撰寫時，std::execution（senders/receivers，P2300）與 std::simd（P1928）最準確的狀態描述是？',
      options: [
        { id: 'a', text: '已經是 C++20 的正式標準特性，各主要編譯器皆已完整實作' },
        {
          id: 'b',
          text: '屬於 C++26 討論中的提案／草案階段特性，是否、以何種形式定案仍可能變動，須以官方文件與編譯器發行紀錄為準',
        },
        { id: 'c', text: '已被 WG21 正式否決，不會出現在任何未來標準中' },
        { id: 'd', text: '只是編譯器廠商自訂的擴充功能，從未提交給標準委員會' },
      ],
      correctOptionId: 'b',
      explanation:
        'std::execution 與 std::simd 是目前 C++26 討論中份量很重的提案方向，但標準尚未定稿，讀者應查閱 WG21 官方文件與各編譯器的最新支援公告，而不要假設它們已是穩定的既成特性。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['C++11', 'C++17', 'C++20', 'C++23/26'],
    caption:
      '並行特性隨標準版本累積：C++11 打下執行緒與記憶體模型地基，C++17 帶來平行演算法，C++20 補齊協程與新同步原語，C++23/26 朝多維視圖、產生器與 senders/receivers 等方向持續演進（C++26 部分仍為提案階段）。',
  },
  tryIt: {
    code: `#include <mutex>
#include <thread>
#include <version>

// 用功能測試巨集判斷目前工具鏈支援到哪個並行特性等級。
#if defined(__cpp_lib_jthread)
using WorkerThread = std::jthread;
#else
using WorkerThread = std::thread;
#endif

#if defined(__cpp_lib_shared_mutex)
#include <shared_mutex>
using ReadWriteLock = std::shared_mutex;
#else
using ReadWriteLock = std::mutex;
#endif

int main() {
    WorkerThread worker([] {
        // 空工作項目，僅示範型別選擇邏輯。
    });

    if constexpr (!std::is_same_v<WorkerThread, std::jthread>) {
        worker.join();  // 退回 std::thread 時必須手動 join
    }

    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'C++ compiler support - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/compiler_support',
      description:
        '逐特性列出 GCC／Clang／MSVC 等編譯器支援的標準版本與函式庫落地進度，是查詢當下真實支援狀態的權威來源。',
    },
    {
      title: 'Feature testing (C++20) - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/feature_test',
      description:
        '完整的 __cpp_lib_*／__cpp_* 功能測試巨集清單，撰寫可攜式條件編譯程式碼的必查頁面。',
    },
    {
      title: 'C++ Standards Support in GCC',
      href: 'https://gcc.gnu.org/projects/cxx-status.html',
      description: 'GCC 官方的 C++ 標準支援狀態頁面，含各版本語言與函式庫特性的實作進度。',
    },
    {
      title: 'C++ Support in Clang',
      href: 'https://clang.llvm.org/cxx_status.html',
      description: 'Clang 官方的 C++ 標準支援狀態頁面，可對照 libc++ 的函式庫實作進度。',
    },
  ],
};

export default appendixAFeatureTimeline;
