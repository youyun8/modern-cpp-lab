import type { ChapterContent } from '@/types/ChapterContent';

const ind21ThreadPoolsScheduling: ChapterContent = {
  slug: 'ind21-thread-pools-scheduling',
  chapterLabel: '第 21 章',
  title: '執行緒池與任務排程',
  group: 'N · 第六部：效能工程',
  description:
    'work-stealing 排程、任務粒度與負載平衡、優先權反轉，以及自建 vs TBB／OpenMP runtime 的取捨。',
  concept: {
    standard: 'C++20',
    body: '執行緒池把「建立執行緒」與「派送工作」解耦：執行緒在程式啟動時就建立好並常駐，之後只負責不斷從某個佇列取出任務執行，藉此避免每次任務都要付出 `pthread_create`／`std::thread` 建構的高昂成本。最簡單的實作是所有執行緒共享一個以 mutex 與 condition_variable 保護的任務佇列，正確且容易理解，但在核心數增加時，所有執行緒搶同一把鎖會成為序列化瓶頸。工業級 runtime（TBB、Cilk、OpenMP 的部分排程器）改用 work-stealing：每個執行緒擁有自己的雙端佇列（deque），優先執行自己佇列裡的任務，只有在自己的佇列空了才去「偷」其他執行緒佇列尾端的任務，把鎖競爭分散到多把鎖，並利用局部性把大部分工作留在生產它的執行緒上。搭配 work-stealing 而來的兩個實務課題是任務粒度（granularity）如何取捨，以及當任務帶有優先權時如何避免優先權反轉；而在專案層級，多數團隊面對的第一個決策其實是要不要自己刻執行緒池，還是直接採用 TBB task_arena 或 OpenMP runtime。',
  },
  deepDive: [
    {
      heading: 'work-stealing 排程機制：本地 LIFO、遠端 FIFO',
      body: 'work-stealing 排程器給每個工作執行緒（worker）配一條屬於自己的雙端佇列（deque），而非讓所有執行緒共享單一佇列。當某個執行緒自己產生新任務（例如遞迴分割出的子任務）時，把它推進自己 deque 的「頭」（head）；當它要找下一個任務執行時，也優先從自己 deque 的頭部彈出——這是一種 LIFO（後進先出）行為，好處是最近才產生的任務通常與剛剛執行完的任務共享資料（例如同一塊快取行、同一個陣列區段），優先執行它能提高快取命中率。\n\n只有當一個執行緒自己的 deque 空了、暫時無事可做時，它才會去「偷」（steal）：挑一個受害者（victim）執行緒，從對方 deque 的「尾」（tail）彈出一個任務——這是 FIFO（先進先出）行為，刻意與本地存取的一端相反。這樣設計有兩個理由：其一，本地存取頭部、遠端偷竊尾部，讓兩種操作大多落在 deque 的不同端點，只有在 deque 幾乎清空時才會真正競爭同一個位置，鎖或無鎖同步的爭用機率因此大幅降低；其二，尾部通常存放較早、較「粗」的任務（在分治遞迴中，越早產生的任務往往涵蓋越大的子問題），竊取尾部的任務能讓竊取者一次拿到夠大的工作量，減少之後又要重複偷竊的次數。相較於單一共享佇列讓每次取任務都要對同一把鎖競爭，work-stealing 把大部分操作留在無競爭或低競爭的本地路徑上，只在真正空閒時才付出跨執行緒同步的代價，這是它在核心數上升時仍能維持吞吐量與負載平衡的根本原因。',
    },
    {
      heading: '任務粒度與負載平衡的取捨',
      body: '任務粒度（granularity）指每個任務單位所包含的實際工作量。粒度太細——例如把一個迴圈拆成數百萬個只做一次加法的任務——會讓排程本身的開銷（建立任務物件、推入／彈出 deque、可能的原子操作）遠遠超過任務本身要做的計算，整體效能反而比不分割還差，這種情況稱為排程開銷主導（overhead-dominated）。粒度太粗——例如把工作切成剛好等於執行緒數的幾個大任務——則容易讓不同任務實際耗時差異很大時，部分執行緒早早做完、其餘執行緒還在苦幹，其他執行緒即使想幫忙也沒有更細的任務可偷，造成負載不平衡（load imbalance），總完成時間被最慢的那個任務拖累。\n\n實務上的經驗法則是：讓任務數量明顯多於執行緒數（例如硬體並行度的 4 到 10 倍以上），並讓單一任務的執行時間落在遠高於排程開銷的量級（微秒級以上而非奈秒級），這樣即使任務耗時不均，work-stealing 也有足夠多、足夠細的任務可以被竊取來填補空閒執行緒，達到動態負載平衡；同時任務本身仍夠「厚」，讓排程開銷相對於實際工作可以忽略。像 TBB 的 `parallel_for` 之所以提供 grain size（分割閾值）參數，OpenMP 的遞迴切割樣板要設定基準情況（base case）閾值，本質上都是在幫使用者手動調整這個粒度與平衡之間的權衡點。',
    },
    {
      heading: '優先權反轉與 priority inheritance',
      body: '優先權反轉（priority inversion）指的是一個低優先權的任務持有某把鎖（或其他共享資源），導致一個高優先權任務被迫等待這把鎖，而如果此時又有中優先權的任務持續佔用 CPU、排擠掉低優先權任務執行的機會，高優先權任務就會被間接、甚至無限期地阻塞——即使它的優先權遠高於正在跑的中優先權任務。這不是理論問題：1997 年火星探路者號（Mars Pathfinder）任務就因為優先權反轉導致系統持續看門狗重啟，是這個問題最著名的實例。\n\n經典的修正方式是優先權繼承（priority inheritance）：當一個高優先權任務因為等待鎖而被阻塞時，作業系統／執行期暫時把持有該鎖的低優先權任務的優先權「借」給它，提升到與等待者相同的等級，讓它能盡快執行完臨界區並釋放鎖，之後再恢復原本的優先權。POSIX 執行緒提供 `PTHREAD_PRIO_INHERIT` 互斥鎖屬性、即時作業系統的排程器通常內建此機制。這件事在「只是」執行緒池的情境下同樣重要：如果任務池允許不同優先權的任務排隊執行，而這些任務又共享某個以一般 mutex 保護的資料結構（例如共享的計數器或快取），一個低優先權任務持有該鎖的期間，高優先權任務即使被排程器優先派送，也會卡在鎖上等待——任務池本身的優先權排序完全無法防止這種鎖層級的反轉，必須額外確保共享鎖具備優先權繼承語意，或乾脆重新設計成避免跨優先權共享鎖資源。',
    },
    {
      heading: '自建 vs TBB／OpenMP runtime 的取捨',
      body: '自己刻一個執行緒池的價值在於完全掌控排程策略、記憶體配置與延遲特性：當你有非常明確、非典型的即時延遲需求（例如金融交易系統要求微秒級、可預測的尾端延遲），或者需要與特定硬體拓撲（NUMA 節點、特定核心綁定）緊密配合、標準函式庫或第三方 runtime 無法滿足時，手刻執行緒池、甚至自訂 work-stealing deque 是合理的投資，但代價是你要自行處理所有正確性議題（ABA、記憶體回收、優先權反轉、負載平衡調校），且往往要投入大量效能剖析與壓力測試才能達到成熟 runtime 的水準。\n\n多數應用場景更適合直接採用成熟的 runtime。Intel TBB 的 `task_arena` 與 `task_group` 提供了經過多年生產環境驗證的 work-stealing 排程器，還內建 NUMA 感知、巢狀平行度控制與例外傳播；OpenMP 則透過 `schedule(static)`、`schedule(dynamic, chunk_size)`、`schedule(guided)` 等排程子句，讓你在編譯器／runtime 既有的排程器上調整粒度而不必自己管理執行緒與佇列——`dynamic` 適合每次迭代耗時不均的場合（動態向 runtime 索取下一批工作，類似手動版的負載平衡），`guided` 則是一開始給大區塊、逐漸縮小區塊大小，兼顧初期低排程開銷與後期的負載平衡。除非效能剖析明確指出這些成熟 runtime 是瓶頸、或者需求極度特化到它們無法涵蓋，否則優先選用 TBB／OpenMP 通常能用遠低於自建的工程成本達到相近甚至更好的效能與正確性。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <condition_variable>
#include <functional>
#include <mutex>
#include <queue>
#include <thread>
#include <vector>

// 最小可用的執行緒池：共享任務佇列 + mutex/condition_variable。 [1]
class ThreadPool {
 public:
  explicit ThreadPool(std::size_t thread_count) {
    workers_.reserve(thread_count);
    for (std::size_t i = 0; i < thread_count; ++i) {
      workers_.emplace_back([this] { WorkerLoop(); });  // [2]
    }
  }

  ~ThreadPool() {
    {
      std::lock_guard<std::mutex> lock(mutex_);
      stopping_ = true;
    }
    cv_.notify_all();  // [3]
    for (std::thread& worker : workers_) {
      worker.join();
    }
  }

  // 提交任務；同一把鎖保護佇列，因此在高核心數下鎖競爭會隨執行緒數上升。
  void Submit(std::function<void()> task) {
    {
      std::lock_guard<std::mutex> lock(mutex_);
      tasks_.push(std::move(task));
    }
    cv_.notify_one();  // [4]
  }

 private:
  void WorkerLoop() {
    while (true) {
      std::function<void()> task;
      {
        std::unique_lock<std::mutex> lock(mutex_);
        // 等待直到有任務或收到停止訊號，避免忙等（busy-wait）。 [5]
        cv_.wait(lock, [this] { return stopping_ || !tasks_.empty(); });
        if (stopping_ && tasks_.empty()) {
          return;
        }
        task = std::move(tasks_.front());
        tasks_.pop();
      }
      task();  // 鎖已釋放才執行任務本體，避免任務內再次呼叫 Submit 時死鎖。 [6]
    }
  }

  std::vector<std::thread> workers_;
  std::queue<std::function<void()>> tasks_;
  std::mutex mutex_;
  std::condition_variable cv_;
  bool stopping_ = false;
};

// 概念草圖：每執行緒一條 deque 的 work-stealing 介面（非完整實作）。
// 真正的無鎖版本需要對頭尾各自的 CAS 協定與 ABA 防範，這裡只示意介面切分。
class WorkStealingDeque {
 public:
  // 只有擁有者執行緒呼叫：從頭部推入，屬本地端。
  void PushFront(std::function<void()> task);

  // 只有擁有者執行緒呼叫：從頭部彈出（LIFO，延續快取局部性）。
  bool PopFront(std::function<void()>& out);

  // 其他執行緒呼叫：從尾部偷（FIFO，與本地端相反，降低爭用）。
  bool StealBack(std::function<void()>& out);
};`,
    callouts: [
      {
        n: 1,
        text: '所有 worker 共享同一個 std::queue，正確且易懂，但代表每次 push/pop 都要搶同一把 mutex_。',
      },
      {
        n: 2,
        text: '執行緒在建構子啟動時就常駐、不斷從佇列取任務，避免每個任務都要付出建立執行緒的成本。',
      },
      {
        n: 3,
        text: '解構子設定 stopping_ 並喚醒所有等待中的 worker，讓它們檢查旗標後正常結束迴圈。',
      },
      {
        n: 4,
        text: 'Submit 只喚醒一個等待中的 worker（notify_one），因為只新增了一筆任務，不需要驚群喚醒。',
      },
      { n: 5, text: '用條件變數等待而非忙等（busy-wait）輪詢佇列，避免空閒 worker 白白耗費 CPU。' },
      { n: 6, text: '任務在解鎖之後才執行，若任務本身又呼叫 Submit，不會因為持有同一把鎖而死鎖。' },
    ],
  },
  pitfalls: [
    '任務切得太細（例如每個任務只做一次加法）：建立 std::function、鎖定佇列、condition_variable 喚醒等排程開銷會遠超過任務本身的計算量，整體反而比單執行緒慢。',
    '所有 worker 共用一個以單一 mutex 保護的佇列，在核心數上升時，鎖競爭會成為序列化瓶頸，吞吐量無法隨核心數線性成長；這正是 work-stealing 用每執行緒 deque 分散競爭的動機。',
    '混合不同優先權的任務時忽略優先權反轉：只讓排程器依優先權派送任務，卻讓不同優先權任務共享一個一般 mutex，高優先權任務仍可能被低優先權任務持有的鎖間接卡住。',
    '在任務內部呼叫會阻塞等待其他任務完成的操作（例如同步等待另一個尚未派送的任務），若執行緒池執行緒數有限，可能耗盡所有 worker 造成死結（所有執行緒都在等對方，沒人能真正執行新任務）。',
    '看到效能問題就直接手刻 work-stealing 排程器，卻沒有先用效能剖析確認瓶頸確實在排程層，而非任務本身的演算法或記憶體存取型態。',
  ],
  bestPractices: [
    '讓任務數量明顯多於執行緒數（經驗法則約 4 到 10 倍以上），且單一任務耗時遠高於排程開銷，兼顧負載平衡與低開銷。',
    '核心數較多、任務會動態產生子任務（如遞迴分治）時，優先選用具備 work-stealing 的成熟 runtime（TBB task_arena、OpenMP 的動態排程），而非自建單一共享佇列的執行緒池。',
    '若任務帶有優先權且會共享鎖保護的資料，確保該鎖具備優先權繼承語意（如 `PTHREAD_PRIO_INHERIT`），或重新設計避免跨優先權共享同一把鎖。',
    '只有在效能剖析明確指出既有 runtime 是瓶頸、且有非典型延遲或硬體拓撲需求時，才考慮自建執行緒池或 work-stealing deque，並投入對應的正確性驗證資源。',
    'OpenMP 使用者依工作負載選排程子句：迭代耗時均勻用 `schedule(static)` 降低開銷，耗時不均用 `schedule(dynamic, chunk_size)` 或 `schedule(guided)` 換取動態負載平衡。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: 'work-stealing 排程中，執行緒從自己 deque 的哪一端取任務執行、又從別人 deque 的哪一端「偷」任務？兩者為何刻意設計成不同端點？',
      options: [
        { id: 'a', text: '都從頭部取／偷；因為頭部永遠是最新任務，最容易存取' },
        {
          id: 'b',
          text: '本地從頭部取（LIFO，延續快取局部性），偷竊從尾部拿（FIFO）；分散在不同端點可降低爭用，且尾部任務通常較粗',
        },
        { id: 'c', text: '本地從尾部取，偷竊從頭部拿；純粹是實作慣例，沒有效能考量' },
        { id: 'd', text: '一律隨機挑選端點，藉此避免任何規律導致的爭用' },
      ],
      correctOptionId: 'b',
      explanation:
        '本地端優先存取剛產生、與快取局部性相關的任務（頭部，LIFO），空閒執行緒偷竊時改拿另一端（尾部，FIFO），讓兩種操作大多落在不同位置以降低爭用，且尾部任務通常涵蓋較大工作量，減少重複竊取次數。',
    },
    {
      id: 'q2',
      stem: '任務粒度切得「太細」與「太粗」分別會造成什麼問題？',
      options: [
        {
          id: 'a',
          text: '太細會排程開銷主導整體時間；太粗容易造成負載不平衡（有些執行緒早完成、有些還在忙且無細任務可偷）',
        },
        { id: 'b', text: '太細會造成記憶體洩漏；太粗會造成死結' },
        { id: 'c', text: '兩者都只影響編譯時間，不影響執行期效能' },
        { id: 'd', text: '太細會提升快取命中率；太粗會降低快取命中率，兩者都與負載平衡無關' },
      ],
      correctOptionId: 'a',
      explanation:
        '任務太細時，建立任務、推入/彈出佇列等排程開銷會超過任務本身的計算量；任務太粗時，若各任務耗時不均，提早完成的執行緒缺乏足夠細的任務可偷，導致總時間被最慢任務拖累。',
    },
    {
      id: 'q3',
      stem: '為什麼「執行緒池依優先權派送任務」無法單獨防止優先權反轉？修正這個問題的經典機制是什麼？',
      options: [
        {
          id: 'a',
          text: '因為任務仍可能共享以一般 mutex 保護的資源，低優先權任務持有鎖時仍會間接卡住高優先權任務；經典修正是優先權繼承（priority inheritance）',
        },
        { id: 'b', text: '因為排程器的優先權比較永遠是錯的；修正方式是完全禁止任務共享任何資源' },
        { id: 'c', text: '這種情況不會發生，只要排程器依優先權派送任務就一定不會反轉' },
        {
          id: 'd',
          text: '因為 condition_variable 本身有 bug；修正方式是改用忙等（busy-wait）取代阻塞等待',
        },
      ],
      correctOptionId: 'a',
      explanation:
        '排程層級的優先權只決定誰先被派送執行，並不能防止鎖層級的阻塞：低優先權任務持有共享鎖時，高優先權任務仍要排隊等鎖。經典修正是優先權繼承，暫時把等待者的優先權借給鎖持有者，讓它盡快釋放鎖。',
    },
  ],
  diagram: {
    key: 'thread-timeline',
    caption:
      '多個工作執行緒各自的任務時間軸：本地佇列頭部優先執行、空閒執行緒向他人佇列尾端偷取任務，形成動態負載平衡。',
  },
  tryIt: {
    code: `#include <atomic>
#include <condition_variable>
#include <functional>
#include <iostream>
#include <mutex>
#include <queue>
#include <thread>
#include <vector>

class ThreadPool {
 public:
  explicit ThreadPool(std::size_t thread_count) {
    for (std::size_t i = 0; i < thread_count; ++i) {
      workers_.emplace_back([this] { WorkerLoop(); });
    }
  }

  ~ThreadPool() {
    {
      std::lock_guard<std::mutex> lock(mutex_);
      stopping_ = true;
    }
    cv_.notify_all();
    for (std::thread& worker : workers_) {
      worker.join();
    }
  }

  void Submit(std::function<void()> task) {
    {
      std::lock_guard<std::mutex> lock(mutex_);
      tasks_.push(std::move(task));
    }
    cv_.notify_one();
  }

 private:
  void WorkerLoop() {
    while (true) {
      std::function<void()> task;
      {
        std::unique_lock<std::mutex> lock(mutex_);
        cv_.wait(lock, [this] { return stopping_ || !tasks_.empty(); });
        if (stopping_ && tasks_.empty()) {
          return;
        }
        task = std::move(tasks_.front());
        tasks_.pop();
      }
      task();
    }
  }

  std::vector<std::thread> workers_;
  std::queue<std::function<void()>> tasks_;
  std::mutex mutex_;
  std::condition_variable cv_;
  bool stopping_ = false;
};

int main() {
  ThreadPool pool(4);
  std::atomic<int> completed{0};

  for (int i = 0; i < 20; ++i) {
    pool.Submit([i, &completed] {
      completed.fetch_add(1, std::memory_order_relaxed);
      std::cout << "task " << i << " done on thread "
                << std::this_thread::get_id() << "\\n";
    });
  }

  // 解構子會等待所有已提交任務完成後才結束，這裡先睡一下讓輸出更好觀察。
  std::this_thread::sleep_for(std::chrono::milliseconds(50));
  std::cout << "completed so far: " << completed.load() << "\\n";
  return 0;
}`,
  },
  furtherReading: [
    {
      title: 'oneTBB: task_arena Class',
      href: 'https://uxlfoundation.github.io/oneTBB/main/tbb_userguide/work_isolation.html',
      description:
        'Intel oneTBB（原 TBB）task_arena 官方文件，說明如何控制 work-stealing 排程器的並行度與工作隔離。',
    },
    {
      title: 'OpenMP Application Programming Interface',
      href: 'https://www.openmp.org/spec-html/5.2/openmpsu42.html',
      description: 'OpenMP 規格書中 schedule 子句（static／dynamic／guided）的完整語意定義。',
    },
    {
      title: 'Scheduling Multithreaded Computations by Work Stealing',
      href: 'https://dl.acm.org/doi/10.1145/324133.324234',
      description:
        'Blumofe 與 Leiserson 提出 work-stealing 排程理論分析的經典論文，Cilk runtime 的理論基礎。',
    },
    {
      title: 'Priority Inversion — Wikipedia',
      href: 'https://en.wikipedia.org/wiki/Priority_inversion',
      description:
        '優先權反轉的定義、Mars Pathfinder 案例，以及優先權繼承（priority inheritance）等修正機制概述。',
    },
  ],
};

export default ind21ThreadPoolsScheduling;
