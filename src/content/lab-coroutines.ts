import type { ChapterContent } from '@/types/ChapterContent';

const labCoroutines: ChapterContent = {
  slug: 'lab-coroutines',
  title: '平行化實驗室：協程 Coroutines',
  group: '平行化實驗室',
  description:
    'C++20 協程：co_await、co_yield、co_return，generator<T> 與 Task<T> 模式，以及與非同步 I/O 的關係。',
  concept: {
    standard: 'C++20',
    body:
      'C++20 協程是可暫停與恢復的函式：只要函式體出現 co_await、co_yield 或 co_return，它就是協程。呼叫時不立即執行完畢，而是在暫停點交還控制權，之後可從原處恢復，其狀態保存在一個協程框架（coroutine frame，通常在 heap，但可被最佳化省略）。co_yield 產生一個值並暫停，是實作惰性 generator<T> 的基礎；co_await 暫停直到某個 awaitable 就緒，是非同步 Task<T> 與 async I/O 的核心；co_return 結束協程並回傳結果。C++20 只提供底層機制（promise_type、awaiter 等），實際的 generator 與 task 型別多由函式庫（如 C++23 的 std::generator、cppcoro、asio）提供。協程讓非同步程式以近似同步的線性風格書寫，避免回呼地獄。',
  },
  code: {
    lang: 'cpp',
    code: `#include <coroutine>
#include <cstdint>
#include <exception>

// 一個極簡的惰性 generator：co_yield 逐一產生值並暫停。 [1]
template <typename T>
struct Generator {
  struct promise_type {                       // [2] 協程的 promise 型別
    T current;
    Generator get_return_object() {
      return Generator{std::coroutine_handle<promise_type>::from_promise(*this)};
    }
    std::suspend_always initial_suspend() { return {}; }  // [3] 一開始即暫停
    std::suspend_always final_suspend() noexcept { return {}; }
    std::suspend_always yield_value(T v) {                 // [4] co_yield 進入此處
      current = v;
      return {};
    }
    void return_void() {}
    void unhandled_exception() { std::terminate(); }
  };

  std::coroutine_handle<promise_type> h;
  bool next() { h.resume(); return !h.done(); } // [5] 恢復到下一個 yield
  T value() const { return h.promise().current; }
  ~Generator() { if (h) h.destroy(); }
};

Generator<int> firstN(int n) {
  for (int i = 0; i < n; ++i)
    co_yield i * i;   // 產生平方數，然後暫停
}`,
    callouts: [
      { n: 1, text: '只要函式使用 co_yield／co_await／co_return，它就是協程，呼叫時不會一次執行到底。' },
      { n: 2, text: 'promise_type 是協程的控制中樞，定義如何產生回傳物件、如何處理 yield／return 與例外。' },
      { n: 3, text: 'initial_suspend 回傳 suspend_always，代表協程建立後先暫停，待呼叫端主動恢復。' },
      { n: 4, text: 'co_yield v 會呼叫 yield_value，把值存入 current 並再次暫停，形成惰性序列。' },
      { n: 5, text: 'resume() 讓協程從上次暫停處繼續，直到下一個 yield 或結束（done()）。' },
    ],
  },
  deepDive: [
    {
      heading: '協程框架與配置省略',
      body:
        '協程的狀態（區域變數、暫停點、promise）存於協程框架，通常在堆積配置。當呼叫端的生命週期涵蓋協程且編譯器能證明時，可套用 HALO（堆積配置省略），把框架放到呼叫端堆疊以消除配置成本。\n\n熱路徑上大量短命協程若無法省略配置，成本可觀；這是設計協程式 API 時需留意的效能面向。',
    },
    {
      heading: 'awaitable 與 awaiter 協定',
      body:
        '`co_await expr` 依序呼叫 `await_ready`（是否可略過暫停）、`await_suspend`（暫停時的動作，可回傳待恢復的 handle 以做對稱轉移 symmetric transfer）、`await_resume`（恢復後的回傳值）。\n\n對稱轉移讓協程間切換不增長呼叫堆疊，是實作高效 `Task<T>` 排程的關鍵。理解此協定才能自訂等待語意（如整合事件迴圈或 I/O）。',
    },
    {
      heading: '生命週期與常見陷阱',
      body:
        '協程以參考捕獲的參數若在暫停後才使用，而呼叫端的暫時物件已銷毀，會造成懸置——這是協程最惡名昭彰的陷阱。惰性協程（初始即暫停）需呼叫端主動恢復，用完前不可銷毀其 handle。\n\n協程不能是 `constexpr`；例外需在 `promise_type::unhandled_exception` 妥善處理。多數情況應直接使用函式庫型別（`std::generator`、cppcoro、asio）而非手寫。',
    },
  ],
  pitfalls: [
    '協程以參考捕獲參數，暫停後呼叫端的暫時物件已銷毀而懸置。',
    '在協程 handle 被銷毀後仍使用其 generator／task。',
    '忘記在 `promise_type` 正確設定 `final_suspend` 或處理例外。',
    '熱路徑上大量短命協程無法省略框架配置，成本累積。',
  ],
  bestPractices: [
    '將需跨暫停使用的資料以值傳入協程，避免懸置參考。',
    '優先使用函式庫型別（`std::generator`、cppcoro）而非手寫協程機制。',
    '在 `promise_type::unhandled_exception` 妥善處理例外。',
    '留意協程框架的配置成本，必要時設計以促成 HALO。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '一個 C++ 函式在什麼條件下會成為協程？',
      options: [
        { id: 'a', text: '只要它回傳 void' },
        { id: 'b', text: '只要其函式體中使用了 co_await、co_yield 或 co_return 其中之一' },
        { id: 'c', text: '只要它被標記為 async' },
        { id: 'd', text: '只要它接受一個 lambda 參數' },
      ],
      correctOptionId: 'b',
      explanation:
        'C++20 沒有 async 關鍵字；只要函式體出現 co_await／co_yield／co_return，編譯器就把它編譯為協程。參見協程單元。',
    },
    {
      id: 'q2',
      stem: 'co_yield 的典型用途是什麼？',
      options: [
        { id: 'a', text: '啟動一個新執行緒' },
        { id: 'b', text: '產生一個值並暫停協程，是實作惰性 generator 的基礎' },
        { id: 'c', text: '釋放記憶體' },
        { id: 'd', text: '等待互斥鎖' },
      ],
      correctOptionId: 'b',
      explanation:
        'co_yield 產生一個值後暫停，呼叫端恢復時才計算下一個值，天然適合惰性序列產生器。參見協程單元。',
    },
    {
      id: 'q3',
      stem: '協程的狀態（區域變數、暫停點）保存在哪裡？',
      options: [
        { id: 'a', text: '固定保存在 CPU 暫存器' },
        { id: 'b', text: '協程框架（coroutine frame）中，通常在 heap，但可能被最佳化省略' },
        { id: 'c', text: '全域變數' },
        { id: 'd', text: '呼叫端的 stack，永遠不會釋放' },
      ],
      correctOptionId: 'b',
      explanation:
        '暫停時協程狀態需存於協程框架（一般在 heap 配置），使其能在恢復時還原；編譯器在可行時會省略該配置。參見協程單元。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['呼叫', 'co_await', '暫停', '恢復'],
    caption:
      '協程的執行流：呼叫後於暫停點（co_await／co_yield）交還控制權，稍後可從原處恢復並保留狀態。',
  },
  tryIt: {
    code: `#include <coroutine>
#include <exception>
#include <iostream>

template <typename T>
struct Generator {
  struct promise_type {
    T current;
    Generator get_return_object() {
      return Generator{std::coroutine_handle<promise_type>::from_promise(*this)};
    }
    std::suspend_always initial_suspend() { return {}; }
    std::suspend_always final_suspend() noexcept { return {}; }
    std::suspend_always yield_value(T v) { current = v; return {}; }
    void return_void() {}
    void unhandled_exception() { std::terminate(); }
  };
  std::coroutine_handle<promise_type> h;
  bool next() { h.resume(); return !h.done(); }
  T value() const { return h.promise().current; }
  ~Generator() { if (h) h.destroy(); }
};

Generator<int> squares(int n) {
  for (int i = 0; i < n; ++i) co_yield i * i;
}

int main() {
  auto g = squares(5);
  while (g.next()) std::cout << g.value() << ' ';
  std::cout << '\\n';
  return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Coroutines - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/coroutines',
      description: 'C++20 協程的 promise、awaitable 與關鍵字語意。',
    },
    {
      title: 'std::generator - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/coroutine/generator',
      description: 'C++23 標準的協程序列產生器型別。',
    },
    {
      title: 'Modern C++ Programming — Advanced Topics II (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/22.Advanced_topics_II.html',
      description: 'Busato 課程並行與進階章節，涵蓋協程相關概念原文。',
    },
  ],
};

export default labCoroutines;
