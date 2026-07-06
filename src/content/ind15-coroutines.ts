import type { ChapterContent } from '@/types/ChapterContent';

const ind15Coroutines: ChapterContent = {
  slug: 'ind15-coroutines',
  chapterLabel: '第 15 章',
  title: '協程（C++20）',
  group: 'L · 第四部：高階平行抽象',
  description:
    'co_await／co_yield／co_return 與 coroutine handle、std::generator（C++23），以及非同步通訊／計算重疊的表達。',
  concept: {
    standard: 'C++23',
    body:
      '本章假設讀者已從「協程 Coroutines」實驗室熟悉手寫 promise_type 與 co_yield 的惰性 generator，在此基礎上深入三個工業級主題。第一，C++23 標準函式庫的 std::generator<T> 直接取代大部分手寫 generator 的需求，並提供配置器支援與遞迴 yield（co_yield ranges::elements_of(range)）等特性。第二，對稱轉移（symmetric transfer）：naive 的協程鏈式恢復會在每次 resume 時堆疊一層呼叫框架，長鏈或迴圈式的協程排程會導致堆疊無界成長甚至溢位；透過讓 await_suspend 回傳欲恢復的 std::coroutine_handle，編譯器可將其編譯為保證的尾呼叫，恢復另一協程時不消耗額外堆疊。第三，協程在 HPC 中可用來表達「發出非阻塞通訊、co_await 其完成、同時讓排程器交錯執行其他計算或通訊任務」的通訊—計算重疊模式，取代手寫回呼狀態機。',
  },
  deepDive: [
    {
      heading: '複習：promise_type 與 awaiter 協定',
      body:
        '協程呼叫時建立協程框架，其行為完全由 `promise_type` 決定：`get_return_object` 產生回傳給呼叫端的物件、`initial_suspend`／`final_suspend` 決定進入與結束時是否暫停、`return_void`／`return_value`／`yield_value` 對應 `co_return`／`co_yield`、`unhandled_exception` 處理例外。\n\n`co_await expr` 則透過 awaiter 三部曲運作：`await_ready()` 回傳 `true` 時可略過暫停直接取值；否則呼叫 `await_suspend(handle)` 執行暫停時的動作（例如把 `handle` 註冊進事件迴圈）；恢復後呼叫 `await_resume()` 取得 `co_await` 表達式的結果。這套協定本身與 generator 或 task 無關，是本章後續機制的共同基礎。',
    },
    {
      heading: 'std::generator<T>（C++23）：不再手寫 promise_type',
      body:
        '既有實驗室手寫的 `Generator<T>` 需要自行定義完整的 `promise_type`、`coroutine_handle` 生命週期管理與解構邏輯。C++23 引入 `std::generator<T>`，讓函式只需回傳 `std::generator<T>` 並以 `co_yield` 產生值，其餘機制（`promise_type`、疊代器介面、資源釋放）全由標準函式庫實作。\n\n`std::generator` 額外支援：以範本參數指定配置器（allocator-aware），以及遞迴展開子範圍——`co_yield std::ranges::elements_of(sub_range)` 可以把另一個 range（甚至另一個 generator）的所有元素依序 yield 出來，等同於巢狀迴圈手動 `for (auto v : sub) co_yield v;` 的語意糖，且避免額外的協程框架巢狀開銷。實務上，凡是「惰性、單向、只被消費一次」的序列，都應優先選 `std::generator` 而非重新手刻 promise_type。',
    },
    {
      heading: '對稱轉移（symmetric transfer）：避免堆疊無界成長',
      body:
        '若 `await_suspend` 內直接呼叫 `other.resume()` 來啟動另一個協程，並且該協程完成後又以同樣方式恢復下一個協程，形成鏈式呼叫，那麼每一次「暫停中的協程呼叫另一個協程的 resume」都會在原生呼叫堆疊上疊加一層——因為 C++ 並不保證這是尾呼叫。在長鏈或迴圈排程（例如 `Task` 之間互相接續執行）下，這會使堆疊逐步加深，最終導致堆疊溢位，這是非對稱轉移（asymmetric transfer）的典型陷阱。\n\n對稱轉移的解法是讓 `await_suspend` 的回傳型別為 `std::coroutine_handle<>`，回傳「接下來該恢復的協程 handle」而不是自行呼叫 `resume()`。編譯器保證以此形式的協程切換會被編譯為保證尾呼叫（guaranteed tail call），也就是先釋放目前的呼叫框架、再跳轉到下一個協程，堆疊深度維持定值，不因協程鏈長度增加而成長。這是撰寫高效能 `Task<T>` 排程器（如延續傳遞 continuation-passing）不可或缺的技巧。',
    },
    {
      heading: 'HPC 應用：非同步通訊與計算重疊',
      body:
        'HPC 程式常見模式是「發出非阻塞通訊（如 MPI_Isend/Irecv 或 GPU 的非同步拷貝），接著執行其他可獨立進行的計算，最後才等待通訊完成」，藉此把通訊延遲隱藏在計算之後。傳統寫法常以回呼（callback）或手寫狀態機表達，程式碼容易因巢狀回呼而難以閱讀與維護。\n\n以協程表達時，可設計一個 `co_await` 得到的 awaitable，其 `await_suspend` 把「協程恢復」註冊為通訊完成時的回呼，並立即返回控制權給排程器；程式邏輯本身仍以線性、同步的風格書寫（`co_await send(...); do_other_work(); co_await recv_done;`），而排程器可在等待期間切換去執行其他協程所代表的計算或通訊任務，達成計算與通訊重疊。這與手寫回呼相比，保留了循序程式碼的可讀性，同時仍受惠於非阻塞、事件驅動的執行模型。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <coroutine>
#include <exception>
#include <utility>

// 一個支援對稱轉移的極簡 Task<T>，示範 await_suspend 回傳
// coroutine_handle 以達成保證尾呼叫，避免鏈式協程造成堆疊成長。 [1]
template <typename T>
struct Task {
    struct promise_type {
        T result{};
        std::coroutine_handle<> continuation;  // [2] 完成後要恢復的呼叫端協程

        Task get_return_object() {
            return Task{std::coroutine_handle<promise_type>::from_promise(*this)};
        }
        std::suspend_always initial_suspend() noexcept { return {}; }

        // final_suspend 回傳的 awaiter 之 await_suspend 會回傳 continuation，
        // 這就是「對稱轉移」：不呼叫 continuation.resume()，而是交給編譯器
        // 以尾呼叫方式直接跳轉，堆疊深度不因鏈長增加而增加。 [3]
        struct FinalAwaiter {
            bool await_ready() noexcept { return false; }
            std::coroutine_handle<> await_suspend(std::coroutine_handle<promise_type> h) noexcept {
                auto& promise = h.promise();
                return promise.continuation ? promise.continuation : std::noop_coroutine();  // [4]
            }
            void await_resume() noexcept {}
        };
        FinalAwaiter final_suspend() noexcept { return {}; }

        void return_value(T v) { result = std::move(v); }
        void unhandled_exception() { std::terminate(); }
    };

    std::coroutine_handle<promise_type> h;

    // Task 本身可被 co_await：把呼叫端 handle 存為 continuation，
    // 再回傳自己的 handle 交由編譯器做尾呼叫式恢復。 [5]
    bool await_ready() noexcept { return false; }
    std::coroutine_handle<> await_suspend(std::coroutine_handle<> caller) noexcept {
        h.promise().continuation = caller;
        return h;
    }
    T await_resume() { return std::move(h.promise().result); }

    ~Task() {
        if (h) h.destroy();
    }
};

// 模擬非同步通訊：實務上 await_suspend 會把 handle 註冊給
// 事件迴圈／通訊完成回呼，此處僅示範介面形狀。 [6]
Task<int> async_partial_sum(int n) {
    int total = 0;
    for (int i = 0; i < n; ++i) total += i;
    co_return total;
}

Task<int> overlap_comm_and_compute(int n) {
    // co_await 另一個 Task：以對稱轉移串接，不論鏈多長皆不增加堆疊深度。
    int partial = co_await async_partial_sum(n);
    co_return partial * 2;
}`,
    callouts: [
      { n: 1, text: 'Task<T> 是可被 co_await 的協程回傳型別，內部以 coroutine_handle 串接完成後的延續。' },
      { n: 2, text: 'continuation 記錄「這個 Task 完成後該恢復哪個協程」，取代手寫回呼。' },
      { n: 3, text: 'FinalAwaiter::await_suspend 回傳 handle 而非呼叫 resume()，即為對稱轉移的關鍵寫法。' },
      { n: 4, text: '沒有 continuation（最外層協程）時回傳 std::noop_coroutine()，代表「不轉移，直接返回排程器」。' },
      { n: 5, text: 'Task 自身的 await_suspend 也回傳 handle，讓 co_await task 同樣走保證尾呼叫路徑。' },
      { n: 6, text: '此處以同步運算模擬非同步通訊；實際 HPC 場景會把 handle 交給 MPI 或裝置的完成回呼。' },
    ],
  },
  pitfalls: [
    '在 await_suspend 內直接呼叫 other.resume() 形成鏈式恢復，未使用對稱轉移，長鏈情境下堆疊可能無界成長甚至溢位。',
    '假設協程「幾乎零成本」：協程框架通常仍在 heap 配置，除非編譯器能證明可套用 HALO（配置省略），大量短命協程的配置成本仍然存在。',
    '忽略協程框架可能比呼叫端的堆疊框架活得更久，導致以參考捕獲的區域變數在暫停後失效（懸置參考）。',
    '手寫 promise_type 重造 std::generator 已提供的功能，增加維護成本且容易在 final_suspend／例外處理上出錯。',
    '將 final_suspend 誤設為 suspend_never，導致協程結束後立即銷毀框架，使 continuation 或結果來不及被讀取。',
  ],
  bestPractices: [
    '優先使用 std::generator<T>（C++23）取代手寫惰性 generator，除非需要客製化的記憶體或排程行為。',
    '自訂 Task／awaitable 時，讓 final_suspend 的 awaiter 回傳 continuation 的 coroutine_handle，以對稱轉移串接協程鏈。',
    '沒有延續可恢復時回傳 std::noop_coroutine()，明確表達「交還控制權給排程器」而非誤用預設建構的 handle。',
    '把非阻塞通訊／裝置操作包裝成 awaitable，讓 HPC 程式碼以線性 co_await 風格表達通訊—計算重疊，取代巢狀回呼。',
    '量測協程框架的配置成本；在極熱路徑上評估是否需要客製化配置器或改用非協程實作。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '為什麼在 await_suspend 內直接呼叫 other.resume() 串接多個協程可能有問題？',
      options: [
        { id: 'a', text: '因為 resume() 只能被呼叫一次' },
        { id: 'b', text: '因為每次 resume() 呼叫都可能在呼叫堆疊上疊加一層框架，長鏈情境下堆疊會無界成長' },
        { id: 'c', text: '因為 resume() 會自動釋放協程框架' },
        { id: 'd', text: '因為這樣寫無法通過編譯' },
      ],
      correctOptionId: 'b',
      explanation:
        '若 resume() 不是尾呼叫，每次協程間的切換都會在原生堆疊上累積一層框架；鏈越長，堆疊用量越大，這正是對稱轉移要解決的問題。',
    },
    {
      id: 'q2',
      stem: '對稱轉移（symmetric transfer）的具體作法是什麼？',
      options: [
        { id: 'a', text: '在 await_ready 中直接回傳 true 以略過暫停' },
        { id: 'b', text: '讓 await_suspend 回傳欲恢復的 std::coroutine_handle，使編譯器以保證尾呼叫方式切換協程' },
        { id: 'c', text: '把所有協程改成非同步執行緒' },
        { id: 'd', text: '在 promise_type 中加入遞迴呼叫' },
      ],
      correctOptionId: 'b',
      explanation:
        'await_suspend 回傳 std::coroutine_handle<> 時，編譯器會將協程切換編譯為保證尾呼叫，先釋放目前框架再跳轉，堆疊深度不隨鏈長增加。',
    },
    {
      id: 'q3',
      stem: '相較於手寫 promise_type 實作 generator，C++23 的 std::generator<T> 主要優勢是什麼？',
      options: [
        { id: 'a', text: '它讓函式可以回傳多個型別' },
        { id: 'b', text: '它消除手寫 promise_type／handle 管理的需要，並支援配置器與遞迴 yield（elements_of）' },
        { id: 'c', text: '它讓協程變成 constexpr' },
        { id: 'd', text: '它取代了 co_await 語法' },
      ],
      correctOptionId: 'b',
      explanation:
        'std::generator<T> 由標準函式庫提供完整的 promise_type 與資源管理，並額外支援配置器與以 std::ranges::elements_of 遞迴展開子範圍，減少樣板程式碼與出錯機會。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['co_await', 'promise_type', 'coroutine handle', '對稱轉移', 'resume'],
    caption:
      '協程執行流：co_await 觸發 awaiter 協定，await_suspend 可直接回傳下一個 coroutine handle 達成對稱轉移，再由排程器 resume。',
  },
  tryIt: {
    code: `#include <coroutine>
#include <exception>
#include <iostream>
#include <utility>

template <typename T>
struct Task {
    struct promise_type {
        T result{};
        std::coroutine_handle<> continuation;

        Task get_return_object() {
            return Task{std::coroutine_handle<promise_type>::from_promise(*this)};
        }
        std::suspend_always initial_suspend() noexcept { return {}; }

        struct FinalAwaiter {
            bool await_ready() noexcept { return false; }
            std::coroutine_handle<> await_suspend(std::coroutine_handle<promise_type> h) noexcept {
                auto& promise = h.promise();
                return promise.continuation ? promise.continuation : std::noop_coroutine();
            }
            void await_resume() noexcept {}
        };
        FinalAwaiter final_suspend() noexcept { return {}; }

        void return_value(T v) { result = std::move(v); }
        void unhandled_exception() { std::terminate(); }
    };

    std::coroutine_handle<promise_type> h;

    bool await_ready() noexcept { return false; }
    std::coroutine_handle<> await_suspend(std::coroutine_handle<> caller) noexcept {
        h.promise().continuation = caller;
        return h;
    }
    T await_resume() { return std::move(h.promise().result); }

    ~Task() {
        if (h) h.destroy();
    }
};

Task<int> compute_partial(int n) {
    int total = 0;
    for (int i = 0; i < n; ++i) total += i;
    co_return total;
}

Task<int> overlap(int n) {
    int partial = co_await compute_partial(n);
    co_return partial * 2;
}

Task<int> run() {
    int v = co_await overlap(10);
    std::cout << v << '\\n';
    co_return v;
}

int main() {
    auto t = run();
    t.h.resume();
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Coroutines - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/coroutines',
      description: 'C++20 協程語言機制：promise_type、awaiter 協定與相關關鍵字語意。',
    },
    {
      title: 'std::generator - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/coroutine/generator',
      description: 'C++23 標準函式庫的協程序列產生器型別，取代大部分手寫 generator 的需求。',
    },
    {
      title: 'co_await - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/coroutines#co_await',
      description: 'co_await 表達式與 await_ready／await_suspend／await_resume 協定細節。',
    },
    {
      title: 'C++ Coroutines: Understanding Symmetric Transfer',
      href: 'https://lewissbaker.github.io/2020/05/11/understanding_symmetric_transfer',
      description: 'Lewis Baker 對對稱轉移與堆疊無界成長問題的權威解說。',
    },
  ],
};

export default ind15Coroutines;
