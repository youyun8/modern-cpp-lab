import type { ChapterContent } from '@/types/ChapterContent';

const ind07ThreadLifecycle: ChapterContent = {
  slug: 'ind07-thread-lifecycle',
  chapterLabel: '第 7 章',
  title: '執行緒生命週期',
  group: 'J · 第二部：執行緒與同步',
  description:
    'std::thread 與 std::jthread（C++20 RAII join）、std::stop_token 協作式取消，以及與 pthread affinity 的對照。',
  concept: {
    standard: 'C++20',
    body: '`std::thread` 代表一段底層作業系統執行緒，建構時立即啟動。它的生命週期規則嚴苛：解構前必須明確 `join()` 或 `detach()`，否則呼叫 `std::terminate()`。C++20 引入 `std::jthread`，在解構子中自動 `join()`，並內建一個 `std::stop_source`，可透過 `get_stop_token()` 傳給執行緒函式做協作式取消——這比裸執行緒安全得多，也比自製旗標更標準化。執行緒函式中未捕捉的例外一樣會呼叫 `std::terminate()`；要跨執行緒傳遞例外需搭配 `std::exception_ptr`。標準未涵蓋 CPU affinity、堆疊大小等排程細節，需透過 `native_handle()` 搭配 pthread 或平台 API 補足。',
  },
  deepDive: [
    {
      heading: 'std::thread 對比 std::jthread：RAII join 語意',
      body: '裸 `std::thread` 是一個「可 joinable」的資源控制代碼：它沒有解構子自動處理的機制，若物件在 `joinable()` 為 true 時被解構，會直接呼叫 `std::terminate()`。這代表每一條路徑（包含例外路徑）都必須明確呼叫 `join()` 或 `detach()`，稍有疏忽就是程式崩潰，而不是優雅的錯誤處理。\n\n`std::jthread`（C++20）把這個責任交給解構子：若執行緒仍是 joinable，解構子會先呼叫 `request_stop()` 再 `join()`。這正是 RAII 的精神——生命週期管理不該由呼叫端手動保證，而應綁定物件作用域。實務上，`std::jthread` 幾乎應該是預設選擇，只有在需要 `detach()` 語意（執行緒完全獨立於物件生命週期）或與舊 API 相容時才使用裸 `std::thread`。',
    },
    {
      heading: 'stop_token／stop_source：協作式取消的機制',
      body: '協作式取消的核心是三個型別：`std::stop_source` 持有可用來要求停止的控制代碼；`std::stop_token` 是可查詢、可傳遞的唯讀視圖，執行緒函式定期呼叫 `token.stop_requested()` 檢查旗標；`std::stop_callback` 則可在停止被請求的當下同步執行一段回呼，適合喚醒正在阻塞等待的執行緒（例如搭配 `condition_variable_any`）。\n\n`std::jthread` 內建一個 `stop_source`，其建構子若第一參數可接受 `std::stop_token`，會自動把對應的 token 傳入。呼叫 `request_stop()`（可由 jthread 物件、其他持有 stop_source 的程式碼，或解構子自動觸發）會將旗標設為 true，所有持有對應 token 的觀察者都能看見。這是「協作式」取消：執行緒必須自願檢查並讓出，標準不提供強制中斷正在執行中的執行緒的機制（也不應該有，因為那會讓資源處於不一致狀態）。',
    },
    {
      heading: '例外跨執行緒傳遞與 thread_local',
      body: '執行緒函式若丟出未捕捉的例外，會直接呼叫 `std::terminate()` 終止整個程式，而不是像單執行緒那樣被外層 `catch` 捕捉——因為例外堆疊展開無法跨越執行緒邊界。正確做法是在執行緒函式內部用 `try/catch` 攔截例外，透過 `std::current_exception()` 取得 `std::exception_ptr`，存放到共享狀態（例如 `std::promise`），再由等待端呼叫 `future.get()` 時讓例外在原執行緒重新拋出。`std::async` 與 `std::packaged_task` 已內建這套機制。\n\n`thread_local` 儲存期則賦予每個執行緒獨立的一份物件，常用於避免鎖競爭的計數器、每執行緒快取或隨機數引擎狀態。它的初始化在該執行緒首次使用該變數時（或執行緒啟動時，視實作與是否有動態初始化而定）進行，解構則在執行緒結束時發生；務必注意初始化順序在跨編譯單元時與一般靜態變數同樣不保證順序，且執行緒本地物件的建構/解構成本不可忽視，不適合超高頻建立/銷毀執行緒的場景。',
    },
    {
      heading: '與 pthread 的對照：affinity、堆疊大小等標準未覆蓋處',
      body: 'C++ 標準刻意不規範執行緒的排程策略、CPU affinity、堆疊大小或優先權，因為這些高度依賴作業系統。要控制這些屬性，需透過 `std::thread::native_handle()`（`std::jthread` 也有同名成員）取得底層原生控制代碼，在 Linux 上型別即為 `pthread_t`，再交給 POSIX API 如 `pthread_setaffinity_np()`（綁定 CPU 核心）、`pthread_attr_setstacksize()`（需在建立執行緒「之前」透過 `pthread_attr_t` 設定，`native_handle` 拿到的是建立後的控制代碼，故堆疊大小通常要改用 `pthread_create` 自行建立再包裝，或在 Windows 上使用 `SetThreadAffinityMask`／`_beginthreadex` 等對應 API）。\n\n這種「標準介面 + 原生控制代碼逃生艙」的設計，讓可攜程式碼寫起來簡單，同時保留高效能運算場景（NUMA 綁定、即時排程）所需的底層控制。HPC 專案常見做法是包一層平台抽象層，內部依編譯目標分派到 pthread 或 Win32 API，對外仍暴露 `std::jthread` 相容介面。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <atomic>
#include <chrono>
#include <print>
#include <stop_token>
#include <thread>

using namespace std::chrono_literals;

// 協作式取消：worker 定期檢查 stop_token，收到請求就自行收尾離開。 [1]
void pollingWorker(std::stop_token token, std::atomic<int>& ticks) {
  while (!token.stop_requested()) {  // [2]
    ++ticks;
    std::this_thread::sleep_for(20ms);
  }
  std::println("worker: 收到停止請求，離開迴圈");
}

int main() {
  std::atomic<int> ticks{0};

  // jthread 建構子偵測到第一參數接受 stop_token，自動注入。 [3]
  std::jthread worker(pollingWorker, std::ref(ticks));

  // stop_callback 可在 request_stop() 當下同步執行，適合喚醒阻塞等待。 [4]
  std::stop_callback on_stop(worker.get_stop_token(),
                             [] { std::println("main: 停止回呼被觸發"); });

  std::this_thread::sleep_for(100ms);
  worker.request_stop();  // [5] 明確請求取消；也可省略，交給解構子處理

  // 未呼叫 join()：jthread 的解構子會自動 request_stop() + join()。 [6]
  std::println("main: 完成，ticks = {}", ticks.load());
  return 0;
}`,
    callouts: [
      { n: 1, text: 'worker 函式第一參數為 std::stop_token，符合 jthread 的自動注入慣例。' },
      {
        n: 2,
        text: '協作式取消的關鍵：定期輪詢旗標，而非被強制中斷；每次迭代都讓執行緒有機會自願離開。',
      },
      {
        n: 3,
        text: 'std::jthread 建構時會建立內部 stop_source，並將對應 stop_token 綁定到函式呼叫。',
      },
      { n: 4, text: 'std::stop_callback 註冊的回呼會在 request_stop() 呼叫的執行緒上同步執行。' },
      { n: 5, text: 'request_stop() 只是設定旗標，不會強制中斷 worker 正在執行的程式碼。' },
      {
        n: 6,
        text: '即使忘記手動 join，jthread 解構子也會自動處理，避免裸 thread 常見的 std::terminate 崩潰。',
      },
    ],
  },
  pitfalls: [
    '對裸 `std::thread` 忘記在所有路徑（含例外路徑）呼叫 `join()`／`detach()`，解構時 `joinable()` 為 true 導致 `std::terminate()`。',
    '誤以為 `request_stop()` 能強制中斷正在執行的程式碼——它只是設定旗標，執行緒函式仍須主動檢查。',
    '讓例外跨執行緒邊界未捕捉地逃逸出執行緒函式，直接觸發 `std::terminate()` 而非被呼叫端 `catch`。',
    '`thread_local` 物件的建構/解構成本被忽略，在高頻建立、銷毀執行緒的場景造成可觀開銷。',
    '在堆疊大小需求已知的情況下才用 `native_handle()` 事後調整——某些屬性（如堆疊大小）必須在建立執行緒「之前」設定，事後補救已經太遲。',
  ],
  bestPractices: [
    '預設使用 `std::jthread` 取代裸 `std::thread`，讓 RAII 自動處理 join 與取消請求。',
    '執行緒函式接受 `std::stop_token` 並在迴圈中定期檢查 `stop_requested()`，必要時搭配 `stop_callback` 喚醒阻塞等待。',
    '在執行緒函式內以 `try/catch` 攔截例外，透過 `std::exception_ptr`（或 `std::promise`／`std::async`）安全地傳回呼叫端。',
    '只有在確實需要 affinity、堆疊大小等平台特性時才使用 `native_handle()`，並將平台相依程式碼封裝成一層抽象。',
    '避免對短生命週期任務頻繁建立執行緒；改用執行緒池並重用 `thread_local` 狀態。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '若 std::jthread 物件在其解構時仍是 joinable，會發生什麼事？',
      options: [
        { id: 'a', text: '直接呼叫 std::terminate() 終止程式' },
        { id: 'b', text: '解構子自動呼叫 request_stop() 再 join()' },
        { id: 'c', text: '執行緒被強制立即中斷並釋放資源' },
        { id: 'd', text: '什麼都不會發生，執行緒繼續在背景執行' },
      ],
      correctOptionId: 'b',
      explanation:
        'std::jthread 的解構子會先請求停止（request_stop）再等待執行緒結束（join），這正是它相較裸 std::thread 的關鍵安全改進。',
    },
    {
      id: 'q2',
      stem: 'std::stop_token 的 stop_requested() 為 true 之後，會如何影響正在執行的執行緒？',
      options: [
        { id: 'a', text: '執行緒會被作業系統立即強制中斷' },
        { id: 'b', text: '什麼都不會直接發生；執行緒函式需要自行檢查旗標並主動結束' },
        { id: 'c', text: '執行緒的堆疊會被自動釋放' },
        { id: 'd', text: '所有 thread_local 變數會立刻被清空' },
      ],
      correctOptionId: 'b',
      explanation:
        '取消是協作式的：stop_token 只是一個可查詢的旗標，執行緒函式必須自行輪詢並決定何時、如何安全地結束。',
    },
    {
      id: 'q3',
      stem: '要讓一條 std::thread／std::jthread 綁定到特定 CPU 核心（affinity），標準函式庫提供的方式是？',
      options: [
        { id: 'a', text: '直接呼叫 std::thread::set_affinity() 成員函式' },
        {
          id: 'b',
          text: '透過 native_handle() 取得底層原生控制代碼，交給平台 API（如 pthread_setaffinity_np）設定',
        },
        { id: 'c', text: '在建構子傳入一個 CPU 編號參數' },
        { id: 'd', text: '無法做到，C++ 完全不允許控制執行緒排程' },
      ],
      correctOptionId: 'b',
      explanation:
        'C++ 標準不涵蓋 affinity 等排程細節；native_handle() 是刻意保留的逃生艙，讓程式可以呼叫底層平台（如 POSIX pthread）API 補足。',
    },
  ],
  diagram: {
    key: 'thread-timeline',
    caption:
      '時間軸示意：執行緒生命週期從建構、執行迴圈輪詢 stop_token，到收到停止請求後自行收尾、由 RAII 解構完成 join。',
  },
  tryIt: {
    code: `#include <atomic>
#include <chrono>
#include <iostream>
#include <stop_token>
#include <thread>

using namespace std::chrono_literals;

void countUp(std::stop_token token, std::atomic<int>& counter) {
  while (!token.stop_requested()) {
    ++counter;
    std::this_thread::sleep_for(10ms);
  }
}

int main() {
  std::atomic<int> counter{0};
  {
    std::jthread worker(countUp, std::ref(counter));
    std::this_thread::sleep_for(100ms);
    // No explicit join()/request_stop(): jthread's destructor
    // handles both automatically when it goes out of scope.
  }
  std::cout << "counter = " << counter.load() << '\\n';
  return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::jthread - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/thread/jthread',
      description: 'std::jthread 的 RAII join 語意與內建 stop_source 說明。',
    },
    {
      title: 'std::stop_token - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/thread/stop_token',
      description: 'stop_token／stop_source／stop_callback 協作式取消機制的完整參考。',
    },
    {
      title: 'std::thread::native_handle - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/thread/thread/native_handle',
      description: '取得底層原生執行緒控制代碼，用於呼叫 pthread 或平台特定 API。',
    },
    {
      title: 'Storage duration - thread_local (cppreference.com)',
      href: 'https://en.cppreference.com/w/cpp/language/storage_duration',
      description: 'thread_local 儲存期的初始化與解構時機說明。',
    },
  ],
};

export default ind07ThreadLifecycle;
