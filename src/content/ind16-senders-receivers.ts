import type { ChapterContent } from '@/types/ChapterContent';

const ind16SendersReceivers: ChapterContent = {
  slug: 'ind16-senders-receivers',
  chapterLabel: '第 16 章',
  title: 'Senders/Receivers 與 std::execution（C++26, P2300）',
  group: 'L · 第四部：高階平行抽象',
  description: '結構化並行、scheduler 抽象、then／when_all／bulk，以及此模型與執行緒池、GPU 後端解耦的意義。',
  concept: {
    standard: 'C++26',
    body:
      'P2300「std::execution」是預計併入 C++26 標準庫的結構化並行框架，核心是 sender／receiver 這對抽象：sender 描述一段「尚未開始執行」的非同步計算（懶惰、可組合），receiver 則是計算完成時的「接收端」，透過 set_value／set_error／set_stopped 三個管道之一收到結果。這與第 13 章介紹的 std::future 形成鮮明對比：future 一旦建立就已經在背景執行（eager），且沒有標準化的方式接續下一步工作；sender 則是純粹的描述，必須顯式「啟動」才會真正執行，因此可以先組合出完整的非同步計算圖，再一次性交給某個執行環境（scheduler）去跑。截至目前，這套機制尚未在所有主流編譯器中完整實作，讀者若想在 C++26 之前實驗，通常需要借助 NVIDIA／Meta 主導的 stdexec 參考實作（一個獨立函式庫，目標是最終被各編譯器廠商採納為標準庫實作基礎）。',
  },
  deepDive: [
    {
      heading: 'Sender／Receiver 概念模型：懶惰、可組合的非同步計算',
      body:
        '一個 `sender` 本質上是一份「食譜」，描述了要做什麼運算、在何種條件下完成、以及完成時會傳遞哪種型別的值，但它本身不持有任何執行緒或已經啟動的工作。要讓 sender 真正執行，必須把它與一個 `receiver`（完成的接收端）連接（`connect`）成一個 `operation_state`，再呼叫 `start` 啟動這個操作狀態，執行完成後 receiver 會收到三種完成訊號之一：`set_value`（成功並帶有結果值）、`set_error`（發生例外或錯誤）、`set_stopped`（被取消，例如收到 stop_token 的停止請求）。\n\n這與 `std::future` 的差異是根本性的：`std::async` 回傳的 future 在建立當下工作可能已經在其他執行緒開始執行（eager），而且 future 沒有標準化的「完成後接著做什麼」機制——你只能呼叫 `get()` 阻塞等待，無法用 `.then(...)` 接續，這正是第 13 章指出的組合性侷限。Sender 反過來是完全懶惰（lazy）的：組合 `then`、`when_all`、`bulk` 等 adaptor 時，只是在建構描述計算圖的型別，沒有任何一行使用者程式碼被執行，直到整個計算圖被 `start`（或透過 `sync_wait` 等便利函式間接觸發 `start`）才會真正跑起來。這個「先描述、後啟動」的分離，讓工具鏈可以在編譯期分析、最佳化整張非同步計算圖，也讓錯誤處理與取消語意可以貫穿整條鏈路，而不必為每個非同步步驟各自手動傳遞 error callback。',
    },
    {
      heading: 'Scheduler：把「在哪裡執行」從演算法邏輯中抽離',
      body:
        '`scheduler` 是一個輕量的「sender 工廠」：呼叫 `sched.schedule()` 會回傳一個 sender，這個 sender 唯一的作用就是把後續接上的工作排入該 scheduler 所代表的執行環境（execution context）——可能是某個執行緒池的下一個空閒執行緒、某個 GPU stream 的下一個 kernel launch 位置，甚至是 SIMD 向量化的批次執行單元。關鍵在於，撰寫 `then`、`when_all`、`bulk` 等組合邏輯的程式碼完全不需要知道底層是哪一種 scheduler：同一段演算法程式碼，換一個 scheduler 就能從 CPU 執行緒池搬到 GPU stream 上執行，不需要重寫任何組合邏輯。\n\n這個「演算法結構」與「執行環境」正交（orthogonal）的設計，正是 P2300 相對於過去各家平行函式庫（TBB、OpenMP、CUDA streams 各自有一套 API）最大的突破：如果每種硬體後端都实作出符合 sender／receiver 概念的 scheduler，那麼上層的排程程式碼就能保持不變，僅在建構計算圖的最後一步替換 scheduler 物件即可切換後端，大幅降低異質運算（heterogeneous computing）程式碼的維護成本。',
    },
    {
      heading: '核心演算法：then（接續）、when_all（匯合）、bulk（資料平行展開）',
      body:
        '`then(sender, func)` 是最基本的序列組合：等待前一個 sender 完成並取得其 `set_value` 傳出的值，再以該值呼叫 `func`，並把 `func` 的回傳值作為新 sender 的完成值往下傳遞——語意上等同 future 想要卻做不到的「接續（continuation）」。\n\n`when_all(sender1, sender2, ...)` 則是扇入（fan-in）／匯合（join）語意：把多個彼此獨立、可以平行啟動的 sender 包成一個新 sender，只有當所有輸入 sender 都以 `set_value` 完成時，`when_all` 才會以「所有輸入值的 tuple」完成；只要任何一個輸入以 `set_error` 完成，整體就會以該錯誤完成（其餘尚未完成的分支視實作而定，通常會被要求停止）。這讓「同時做三件互不相依的事，等三件都做完再繼續」這種常見的結構化並行模式，可以用一行程式碼表達，而不必手動管理計數器或 condition_variable。\n\n`bulk(sender, shape, func)` 則是資料平行的扇出（fan-out）：對一段索引範圍（`shape`，例如 `0` 到 `n-1`）中的每一個索引並行呼叫 `func(index, ...)`，概念上類似 `std::for_each`（第 10 章執行策略）加上顯式索引，但因為它本身也是一個 sender，可以被無縫接到 `then`／`when_all` 組成的更大計算圖中，並且交給任何 scheduler 執行——同一份 `bulk` 呼叫，換成 GPU scheduler 就可能被映射為一次 kernel launch，換成執行緒池 scheduler 就可能被映射為切成數個區塊平行執行的迴圈。',
    },
    {
      heading: '為何這是未來十年的平行框架方向：對 HPC 排程的意義',
      body:
        'HPC 系統的核心痛點之一，是不同硬體後端（多核 CPU 執行緒池、GPU stream、甚至未來的加速器）各自擁有語意不相容的非同步 API，導致排程邏輯必須為每種後端各寫一份，跨後端組合（例如「CPU 前處理 → GPU 運算 → CPU 後處理」）更是充滿手寫的同步與回呼地獄。Senders/receivers 之所以被視為未來十年的方向，正是因為它把「非同步計算的結構」（先做什麼、平行做什麼、匯合什麼、出錯怎麼辦）與「這段計算實際跑在哪個硬體上」徹底解耦：只要某個硬體廠商提供符合概念的 scheduler，該硬體就能無縫加入既有的 sender 計算圖。\n\n對 HPC 排程而言，這代表單一一張結構化並行圖（structured concurrency graph）就能橫跨異質後端：排程器（例如未來的 runtime 或任務圖執行引擎）可以在編譯期或執行期分析整張 sender 圖的相依關係，做全局最佳化（例如決定哪些子圖該搬到 GPU、如何重疊通訊與計算），而不必依賴每個函式庫各自為政的 ad-hoc 同步機制。這也呼應了第 15 章 executors 提案演進的脈絡——P2300 正是那條演進路線最終匯聚而成的標準化答案，NVIDIA、Meta 等業界重量級單位投入 stdexec 參考實作並持續向標準委員會回饋經驗，顯示這不只是學術提案，而是已經在真實 HPC／GPU 程式碼庫中驗證可行性的工業級設計。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `// 以下語法代表 P2300 提案／stdexec 參考實作的典型用法，
// 部分編譯器尚未完整支援 C++26 std::execution，
// 實驗時建議使用 NVIDIA/Meta 的 stdexec 函式庫。
#include <exec/static_thread_pool.hpp>
#include <stdexec/execution.hpp>

int main() {
    // 建立一個小型執行緒池，並取得其 scheduler。 [1]
    exec::static_thread_pool pool(4);
    stdexec::scheduler auto sch = pool.get_scheduler();

    // schedule() 回傳一個 sender：描述「排入這個執行環境」的懶惰計算。 [2]
    auto work = stdexec::schedule(sch) | stdexec::then([] { return 21; })  // [3]
                | stdexec::then([](int x) { return x * 2; });

    // when_all 把兩個獨立分支匯合成一個 tuple 結果。 [4]
    auto combined =
        stdexec::when_all(work, stdexec::schedule(sch) | stdexec::then([] { return 100; }));

    // bulk 對索引範圍 [0, 4) 做資料平行展開，仍然回傳一個 sender。 [5]
    auto fanned_out = stdexec::schedule(sch) | stdexec::bulk(4, [](std::size_t index) {
                          // 每個索引平行處理各自的一份工作。
                          (void)index;
                      });

    // 在此之前，上面所有變數都只是「描述」，尚未執行任何一行使用者程式碼。
    // sync_wait 才會真正 start 整張計算圖並阻塞等待完成。 [6]
    auto [sum_tuple] = stdexec::sync_wait(combined).value();
    auto [a, b] = sum_tuple;

    stdexec::sync_wait(fanned_out);
    return (a + b == 142) ? 0 : 1;
}`,
    callouts: [
      { n: 1, text: 'scheduler 是「排程工廠」，只知道要在哪個執行環境跑，不知道也不需要知道上層的演算法結構。' },
      { n: 2, text: 'schedule(sch) 回傳的 sender 尚未執行任何工作，只是描述「之後要排入 sch 這個環境」。' },
      { n: 3, text: 'then 串接接續邏輯，語意等同 future 想要卻做不到的 .then(...)。' },
      { n: 4, text: 'when_all 讓兩個互不相依的分支各自平行排入執行緒池，等兩者都完成才繼續，取代手動計數器/condvar。' },
      { n: 5, text: 'bulk 對一段索引範圍做資料平行展開，換成 GPU scheduler 時可能被映射成一次 kernel launch。' },
      { n: 6, text: 'sender 是懶惰的：在 sync_wait（或其他 start 觸發點）呼叫之前，整張計算圖完全不會執行。' },
    ],
  },
  pitfalls: [
    '誤以為 `std::execution` 已經像 `std::thread`、`std::atomic` 一樣在所有主流編譯器中普遍可用——截至目前它仍是逐步併入 C++26 的新提案，實務上多半需要 stdexec 這類參考實作。',
    '把 sender 誤當成已經在背景執行的 `std::future`：sender 只是「描述」，不啟動（`start`／`sync_wait`）就永遠不會執行任何一行使用者程式碼，這與 future 建立當下即已開始執行的語意完全相反。',
    '忘記啟動 sender：只組合了 `then`／`when_all`／`bulk` 卻沒有呼叫 `sync_wait` 或把它交給某個 scheduler 執行，程式看起來沒有錯誤，實際上什麼事都沒發生。',
    '把 `when_all` 誤用在有相依關係的工作上：`when_all` 假設所有輸入 sender 可以彼此獨立平行啟動，若其中一個工作其實依賴另一個的結果，應該用 `then` 序列組合，而不是硬塞進 `when_all`。',
    '忽略錯誤與取消路徑：只處理 `set_value` 而不考慮 `set_error`／`set_stopped`，會讓例外或 stop_token 觸發的取消在計算圖中「消失」而非被妥善處理。',
  ],
  bestPractices: [
    '把「演算法結構」（哪些步驟、如何平行、如何匯合）與「執行在哪裡」（scheduler 選擇）刻意分離：演算法程式碼盡量只依賴 sender／scheduler 概念，不要寫死特定執行緒池或 GPU API。',
    '在原型與學習階段使用 NVIDIA/Meta 的 stdexec 參考實作，並留意其 API 可能隨 P2300 提案定案而微調，正式導入生產環境前需確認目標編譯器對 C++26 `std::execution` 的支援進度。',
    '複雜的計算圖優先用 `when_all` 表達可平行的獨立分支、用 `then` 表達必要的序列相依，讓計算圖的結構本身就說明了相依關係，而不是額外用鎖或旗標手動同步。',
    '涉及大量獨立子任務的資料平行工作優先考慮 `bulk`，讓底層 scheduler（執行緒池或 GPU stream）決定如何切分與排程，而不是手動迴圈搭配執行緒池 API。',
    '每一條 sender 鏈路都應該明確考慮 `set_error`／`set_stopped` 路徑（例如搭配 stop_token 支援取消），不要只針對 happy path 撰寫 `then` 邏輯。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: 'sender 與 std::future 最根本的差異是什麼？',
      options: [
        { id: 'a', text: 'sender 只能用在 GPU 上，future 只能用在 CPU 上' },
        { id: 'b', text: 'sender 是懶惰的描述，必須顯式啟動（如 sync_wait）才會執行；future 建立當下工作通常已經開始執行，且沒有標準化的接續機制' },
        { id: 'c', text: 'sender 無法回傳值，只有 future 可以回傳值' },
        { id: 'd', text: '兩者完全等價，只是命名不同' },
      ],
      correctOptionId: 'b',
      explanation:
        'sender 描述一段尚未啟動的非同步計算，直到被 start（例如透過 sync_wait）才會真正執行；future 則是 eager 的，建立時工作可能已在背景執行，且缺乏標準化的 .then(...) 接續機制，這正是 senders/receivers 要解決的問題。',
    },
    {
      id: 'q2',
      stem: '為什麼把演算法邏輯寫成依賴 scheduler 抽象、而不是直接呼叫特定執行緒池或 GPU API，對 HPC 排程特別重要？',
      options: [
        { id: 'a', text: '因為 scheduler 抽象可以讓程式碼變短，與效能或可移植性無關' },
        { id: 'b', text: '因為這樣可以讓同一段演算法結構在不同硬體後端間切換，只需替換 scheduler，讓單一結構化並行圖能橫跨異質後端並被整體最佳化' },
        { id: 'c', text: '因為 scheduler 抽象是唯一支援多執行緒的方式' },
        { id: 'd', text: '因為不使用 scheduler 就無法編譯' },
      ],
      correctOptionId: 'b',
      explanation:
        '把「做什麼」與「在哪裡做」解耦後，換一個 scheduler（CPU 執行緒池、GPU stream 等）就能切換執行後端而不必重寫組合邏輯，讓排程器得以對橫跨異質硬體的整張計算圖做全局分析與最佳化。',
    },
    {
      id: 'q3',
      stem: '下列哪一種情境最適合使用 `when_all` 而非單純的一連串 `then`？',
      options: [
        { id: 'a', text: '第二步的輸入必須是第一步的輸出' },
        { id: 'b', text: '有多個彼此獨立、互不相依的子任務，需要全部完成後才繼續下一步' },
        { id: 'c', text: '只有一個任務需要執行' },
        { id: 'd', text: '任務需要無限重複執行直到程式結束' },
      ],
      correctOptionId: 'b',
      explanation:
        'when_all 的語意是扇入（fan-in）：把多個可以獨立平行啟動的 sender 匯合成一個，等所有分支都以 set_value 完成才繼續；若後一步依賴前一步的結果，應該用 then 表達序列相依，而不是 when_all。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['scheduler', 'sender', 'then', 'when_all', 'bulk', 'receiver（set_value/error/stopped）'],
    caption:
      'sender 由 scheduler 產生，經 then／when_all／bulk 組合成計算圖，最終啟動時把結果交給 receiver 的 set_value／set_error／set_stopped 之一。',
  },
  tryIt: {
    code: `// 簡化示意：P2300 風格的 sender 組合，實際執行需要 stdexec 函式庫。
#include <exec/static_thread_pool.hpp>
#include <iostream>
#include <stdexec/execution.hpp>

int main() {
    exec::static_thread_pool pool(2);
    auto sch = pool.get_scheduler();

    // 描述「排入執行緒池 -> 算出 21 -> 乘以 2」的計算圖，此刻尚未執行。
    auto pipeline = stdexec::schedule(sch) | stdexec::then([] { return 21; }) |
                    stdexec::then([](int x) { return x * 2; });

    // sync_wait 才會真正啟動整張圖並阻塞取得結果。
    auto [result] = stdexec::sync_wait(pipeline).value();
    std::cout << "result = " << result << "\\n";  // 預期輸出 42
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'P2300R10 — std::execution',
      href: 'https://wg21.link/p2300',
      description: 'senders/receivers 與 std::execution 的正式提案文件，涵蓋動機、設計原理與完整 API 規格。',
    },
    {
      title: 'NVIDIA/stdexec — Reference implementation of P2300',
      href: 'https://github.com/NVIDIA/stdexec',
      description: 'NVIDIA 主導、業界廣泛採用的 P2300 參考實作，可在 C++26 編譯器完整支援前實驗 senders/receivers。',
    },
    {
      title: 'Working with Asynchrony Generically: A Tour of C++ Executors — Eric Niebler, CppCon 2021',
      href: 'https://www.youtube.com/watch?v=xLboNIf7BTg',
      description: 'P2300 作者之一 Eric Niebler 講解 sender/receiver 模型與泛用非同步演算法（then／when_all／sync_wait）的設計動機。',
    },
    {
      title: 'std::execution reference — en.cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/execution',
      description: 'cppreference 上逐步更新的 std::execution API 參考頁面，可追蹤各編譯器實作進度。',
    },
  ],
};

export default ind16SendersReceivers;
