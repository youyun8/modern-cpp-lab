import type { ChapterContent } from '@/types/ChapterContent';

const ind13AsyncFuturePromise: ChapterContent = {
  slug: 'ind13-async-future-promise',
  chapterLabel: '第 13 章',
  title: 'std::async／future／promise 與其侷限',
  group: 'L · 第四部：高階平行抽象',
  description: 'packaged_task 的用法，以及 future 無法組合（no continuation）的痛點，為 senders/receivers 鋪陳。',
  concept: {
    standard: 'C++11',
    body:
      'std::promise／std::future 是一組「一次性、單向」的資料通道：一個 promise 由生產端設定值（或例外），對應的 future 由消費端呼叫 get() 取得，且 get() 只能成功呼叫一次。std::packaged_task 把任意可呼叫物件包裝成「呼叫時自動填好對應 future」的物件，讓你不必手動操作 promise。std::async 則進一步把「建立 packaged_task、丟到執行緒（或延後執行）、回傳 future」三件事包成一個函式呼叫。這一整組設施從 C++11 引入，語意到 C++20 都沒有實質改變：future 本身仍然「不可組合」——沒有 .then()、沒有延續（continuation），想在一個非同步工作完成後接著做下一件事，只能阻塞呼叫 get() 再手動發起下一個 async。這正是後續章節要介紹的 P2300 std::execution（senders/receivers）想解決的核心痛點。',
  },
  deepDive: [
    {
      heading: 'promise／future 的基本契約',
      body:
        '`std::promise<T>` 與 `std::future<T>` 是一對共享同一塊「共享狀態（shared state）」的物件：生產端持有 promise，呼叫 `set_value` 或 `set_exception` 恰好一次；消費端持有對應的 future，呼叫 `get()` 取回結果，若生產端設的是例外，`get()` 會在消費端重新丟出。這是「單一生產者、單一消費者、一次性（single-shot）」的契約：`future::get()` 只能呼叫一次，第二次呼叫是未定義前提下的合法丟例外（`std::future_error`，錯誤碼 `no_state`），因為呼叫後共享狀態即被消耗。如果需要多個消費端各自讀取同一結果，必須用 `future::share()` 轉成 `std::shared_future`，它允許多次、多執行緒呼叫 `get()`。',
    },
    {
      heading: 'packaged_task：把可呼叫物件包成 future 來源',
      body:
        '手動操作 promise 容易出錯（忘記在例外路徑上呼叫 `set_exception`、忘記涵蓋所有 return 路徑）。`std::packaged_task<R(Args...)>` 包裝一個可呼叫物件，呼叫 `task.get_future()` 取得對應 future，之後每次「呼叫」這個 task（像呼叫函式一樣）就會執行包裝的可呼叫物件，並自動把回傳值或例外寫進共享狀態。這讓你可以把 task 丟給 `std::thread`、丟進執行緒池的工作佇列，或直接同步呼叫，而不用自己管理 promise 的生命週期與例外轉發。packaged_task 本身「只能移動、不能複製」，這也提醒它代表的是一次性的執行單元。',
    },
    {
      heading: 'std::async 的啟動策略與常見誤解',
      body:
        '`std::async` 接受一個 `std::launch` 策略：`std::launch::async` 保證在新執行緒上立即開始執行；`std::launch::deferred` 則完全不建立執行緒，工作被延後到第一次呼叫 `future::get()` 或 `wait()` 時才「就地」（同步）執行；不帶策略引數的預設值等同 `std::launch::async | std::launch::deferred`，由實作自行選擇。這意味著在預設策略下，你完全無法從程式碼推斷這段工作到底會不會平行執行——某些實作在系統負載高或執行緒數受限時可能選擇 deferred，導致原本期待平行跑的工作變成呼叫 `get()` 那一刻才同步執行、完全串行化，效能表現與預期南轅北轍。在講究可預測平行度的工業程式碼中，幾乎總是應該顯式指定 `std::launch::async`。',
    },
    {
      heading: '無法組合：future 的「no continuation」痛點',
      body:
        'future 最根本的限制是它不可組合（not composable）：介面上只有阻塞式的 `get()`／`wait()`，沒有「這個 future 完成後，自動接著做下一件事」的延續機制（continuation，例如其他語言常見的 `.then()`）。想把兩個非同步工作串成一條管線，唯一的辦法是在某個執行緒裡阻塞呼叫第一個 `get()`，再拿結果發起第二個 `std::async`——這代價是白白佔用（或封鎖）一個執行緒去空等，而不是讓延續在第一個工作完成時「回呼」被排程執行。future 也沒有內建取消機制：一旦工作已經丟出去，你無法要求它中止；例外也只在消費端呼叫 `get()` 的那一刻才會浮現，如果你從不呼叫 `get()`（例如只是 fire-and-forget），例外會被靜默吞掉直到 future 解構。這些限制——不可組合、不能取消、錯誤處理侷限在同步點——正是 P2300（`std::execution`，senders/receivers）想從根本上解決的問題：sender 描述「尚未啟動的非同步工作」，可以用組合子（如 `then`、`when_all`）串接、轉換、平行組合，最後才交給 scheduler 執行，完全不需要中途阻塞任何執行緒。後續章節會詳細介紹這套模型。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <future>
#include <iostream>
#include <stdexcept>
#include <thread>

// 模擬第一階段：從「感測器」讀值，可能失敗。
int read_sensor() {
    std::this_thread::sleep_for(std::chrono::milliseconds(20));
    return 21;
}

// 模擬第二階段：依賴第一階段的結果做進一步運算。
int scale_and_check(int raw) {
    std::this_thread::sleep_for(std::chrono::milliseconds(20));
    if (raw < 0) {
        throw std::runtime_error("negative reading");  // [1]
    }
    return raw * 2;
}

int main() {
    // 顯式指定 launch::async，避免落入預設策略可能延後執行的陷阱。 [2]
    std::future<int> stage1 = std::async(std::launch::async, read_sensor);

    // 沒有 .then()：想在 stage1 完成後接著跑 stage2，
    // 唯一辦法是在這裡阻塞呼叫 get()，白白佔用目前這個執行緒空等。 [3]
    int raw = stage1.get();  // 一次性操作：這個 future 之後不能再 get()

    // 手動把結果餵給下一個非同步工作，形成「偽管線」。
    std::future<int> stage2 = std::async(std::launch::async, scale_and_check, raw);

    try {
        // 例外要到這裡才會浮現；若中途忘了呼叫 get()，
        // scale_and_check 丟出的例外將隨 future 解構被靜默吞掉。 [4]
        int result = stage2.get();
        std::cout << "result = " << result << '\\n';
    } catch (const std::exception& e) {
        // 若改用 senders/receivers，錯誤會沿著 pipeline 傳遞給
        // 對應的 error channel，而不必集中在單一同步點處理。 [5]
        std::cerr << "stage2 failed: " << e.what() << '\\n';
    }

    // 再次呼叫 stage1.get() 會丟出 std::future_error（no_state）。 [6]
    // int again = stage1.get();  // 未定義前提下的合法錯誤，勿嘗試。

    return 0;
}`,
    callouts: [
      { n: 1, text: '例外在生產端發生後，會被保存在共享狀態中，直到消費端呼叫 get() 才重新丟出。' },
      { n: 2, text: '顯式指定 std::launch::async，避免預設策略可能選擇 deferred 而在 get() 時才同步執行。' },
      { n: 3, text: 'future 沒有 .then()：串接下一步只能阻塞目前執行緒等待 get() 回傳，無法用回呼延續。' },
      { n: 4, text: '例外只在呼叫 get() 的那一刻才浮現；若從不呼叫 get()，例外會在 future 解構時被靜默吞掉。' },
      { n: 5, text: 'senders/receivers（P2300）把成功值與錯誤都視為 pipeline 的一部分，不必集中在同步點處理。' },
      { n: 6, text: 'future::get() 是一次性操作：共享狀態被消耗後，第二次呼叫會丟出 std::future_error。' },
    ],
  },
  pitfalls: [
    '依賴 std::async 的預設啟動策略（未指定 launch::async），實作可能選擇 launch::deferred，導致工作直到 get() 才同步執行，完全失去預期的平行度。',
    '對同一個 future 呼叫兩次 get()：共享狀態在第一次 get() 後即被消耗，第二次呼叫會丟出 std::future_error（錯誤碼 no_state）。',
    '忽略 std::async 回傳的 future（例如寫成 `std::async(...);` 不接回傳值）：暫存 future 的解構子會隱式阻塞等待工作完成，讓原本想要的「即發即忘」變成同步等待。',
    '需要多個執行緒或多次讀取同一結果卻仍用 std::future：應改用 future::share() 轉成 std::shared_future，否則第二次 get() 必定失敗。',
    '把非同步工作丟出去後從不呼叫 get() 或 wait()：若該工作內部丟出例外，例外會被靜默吞掉，難以察覺失敗。',
  ],
  bestPractices: [
    '呼叫 std::async 時一律顯式傳入 std::launch::async，除非你確實希望延後、可能同步執行的語意。',
    '把 std::async 的回傳值存到具名變數（或明確 std::move 進容器），避免暫存 future 解構造成的隱式阻塞。',
    '若同一結果需要被多個消費端讀取，改用 shared_future 而非重複呼叫 get()。',
    '用 packaged_task 包裝可呼叫物件並交給執行緒池，比手動管理 promise 的 set_value／set_exception 更不容易漏掉例外路徑。',
    '若程式邏輯需要串接多個非同步階段、取消能力或非阻塞的錯誤處理，評估改用 senders/receivers（P2300）而非堆疊多層 future::get()。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '呼叫 std::async(func) 且未指定 launch 策略時，以下敘述何者正確？',
      options: [
        { id: 'a', text: '保證會立即在新執行緒上開始執行' },
        { id: 'b', text: '保證 func 完全不會執行，直到程式結束' },
        { id: 'c', text: '實作可自行選擇 async 或 deferred，deferred 時 func 要到呼叫 get()／wait() 才會同步執行' },
        { id: 'd', text: '等同 std::launch::deferred，一定延後執行' },
      ],
      correctOptionId: 'c',
      explanation:
        '未指定策略時預設等同 launch::async | launch::deferred，由實作決定；若選擇 deferred，工作會延後到第一次 get()/wait() 才在呼叫端同步執行，因此平行度不可預測。',
    },
    {
      id: 'q2',
      stem: '為什麼說 std::future 「無法組合（no continuation）」是它的核心限制？',
      options: [
        { id: 'a', text: '因為 future 無法儲存 int 以外的型別' },
        { id: 'b', text: '因為 future 的介面只有阻塞式的 get()/wait()，沒有讓「完成後自動接著執行下一步」的機制，必須阻塞一個執行緒才能串接後續工作' },
        { id: 'c', text: '因為 future 只能在 main 函式中使用' },
        { id: 'd', text: '因為 std::async 不能傳遞參數給要執行的函式' },
      ],
      correctOptionId: 'b',
      explanation:
        'future 沒有 .then() 之類的延續機制；要在一個非同步工作完成後接著做下一步，唯一辦法是阻塞呼叫 get() 拿到結果後再手動發起下一個非同步工作，這正是 P2300 senders/receivers 想解決的問題。',
    },
    {
      id: 'q3',
      stem: '對同一個 std::future 物件呼叫兩次 get() 會發生什麼事？',
      options: [
        { id: 'a', text: '第二次呼叫會直接回傳與第一次相同的快取結果' },
        { id: 'b', text: '第二次呼叫會重新執行一次非同步工作' },
        { id: 'c', text: '第二次呼叫會丟出 std::future_error，因為共享狀態在第一次 get() 後已被消耗' },
        { id: 'd', text: '程式會直接當掉且無例外可捕捉' },
      ],
      correctOptionId: 'c',
      explanation:
        'future::get() 是一次性操作，取值後共享狀態即被消耗；若需要多次或多執行緒讀取同一結果，應改用 future::share() 產生的 std::shared_future。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['async', 'future', 'get()（阻塞）', '（無法 then）'],
    caption:
      'std::async 回傳 future，消費端必須以阻塞的 get() 取值；future 沒有延續機制，串接下一步只能再次阻塞等待，這正是 senders/receivers 想解決的問題。',
  },
  tryIt: {
    code: `#include <future>
#include <iostream>
#include <thread>

int main() {
    // launch::async：保證立即在新執行緒上執行。
    std::future<int> f1 = std::async(std::launch::async, [] {
        std::this_thread::sleep_for(std::chrono::milliseconds(30));
        return 10;
    });

    // 沒有 .then()：必須阻塞在這裡取值，才能把結果餵給下一步。
    int a = f1.get();

    std::future<int> f2 = std::async(std::launch::async, [a] { return a * 4; });

    std::cout << "final = " << f2.get() << '\\n';

    // 再次呼叫 f1.get() 會丟出 std::future_error（示範一次性語意，
    // 實際執行請勿真的呼叫，以下僅為註解）：
    // f1.get();

    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::async - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/thread/async',
      description: '啟動策略（launch::async／deferred／預設）與其語意細節。',
    },
    {
      title: 'std::future - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/thread/future',
      description: 'future 的一次性 get() 契約、shared_future 與例外傳遞規則。',
    },
    {
      title: 'std::packaged_task - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/thread/packaged_task',
      description: '把可呼叫物件包裝成自動產生 future 的執行單元。',
    },
    {
      title: 'P2300R10: std::execution',
      href: 'https://wg21.link/p2300',
      description: 'senders/receivers 提案，直接針對 future 不可組合、無法取消等痛點提出解法。',
    },
  ],
};

export default ind13AsyncFuturePromise;
