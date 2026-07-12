import type { ChapterContent } from '@/types/ChapterContent';

const ind24ExceptionSafetyResourceMgmt: ChapterContent = {
  slug: 'ind24-exception-safety-resource-mgmt',
  chapterLabel: '第 53 章',
  title: '例外安全與資源管理',
  group: '第 15 部：正確性、測試與除錯',
  description:
    '並行下的 RAII 與取消時的清理、std::expected（C++23）在錯誤傳遞中的角色，以及部分失敗的處理策略。',
  concept: {
    standard: 'C++23',
    body: '例外安全保證分三級：基本保證（操作失敗後物件仍處於有效但未定義的狀態，無資源洩漏）、強保證（操作要麼完全成功，要麼狀態完全不變，如同從未呼叫過）、不丟出保證（`noexcept`，操作永不失敗）。在並行程式中，這些保證必須延伸到「取消」這個額外的失敗路徑：`std::jthread` 的 `stop_token` 觸發時，正在執行中的工作可能需要提前結束，RAII guard 必須確保無論是例外堆疊展開還是協作式取消導致的提前返回，共享狀態都留在一致的地方。另一方面，`std::expected<T, E>`（C++23）提供了不依賴堆疊展開的錯誤傳遞管道，對於「預期會偶爾失敗」的路徑（例如逾時、資源不足）成本更低、更適合延遲敏感的 HPC 熱路徑；而多個平行任務各自可能失敗時，正確做法是聚合所有失敗結果而非只回報第一個。',
  },
  deepDive: [
    {
      heading: '例外安全三級保證在並行 RAII 清理中的落地',
      body: '基本保證、強保證、不丟出保證這三個分級最初是為單執行緒物件操作設計的，但在並行程式中它們同樣適用，只是「失敗」的來源除了例外，還多了協作式取消。當一個工作執行緒持有 `std::lock_guard`、`std::unique_lock` 或自製的 scope guard 時，若 `stop_token.stop_requested()` 在關鍵區段中途變為 true，正確設計應是讓工作函式自行檢查旗標並提前 `return`，而不是嘗試從外部強制中斷——這時候 RAII guard 的解構子會像例外堆疊展開一樣自動執行，釋放鎖、關閉檔案、歸還緩衝區。\n\n危險之處在於：如果清理邏輯本身依賴「操作已完成到某個中繼狀態」的假設（例如兩階段寫入的第一階段已完成但第二階段被取消略過），RAII guard 若只知道呼叫解構子而不知道語意上的中繼狀態，就可能把資料留在基本保證都不滿足的狀態。因此設計並行資料結構時，應該讓每一個可被取消中斷的階段本身具備強保證（例如先在暫存區完成整份運算，再以單一 `noexcept` 的移動或指標交換發佈結果），使得無論是提前返回、例外或正常完成，共用狀態要麼是舊值、要麼是新值，沒有第三種半成品狀態。',
    },
    {
      heading: 'std::expected：不靠堆疊展開的錯誤傳遞',
      body: '`std::expected<T, E>`（C++23）把「值或錯誤」直接編碼進回傳型別：成功時像 `T` 一樣使用，失敗時攜帶一個 `E` 錯誤值，呼叫端用 `has_value()`／`operator bool()` 檢查，或用 `and_then`／`or_else`／`transform` 做函式式串接。相較例外，它的關鍵差異在於失敗路徑「不需要堆疊展開」：例外機制即使在不丟出的情況下也可能因為表格式展開（table-based unwinding）帶來程式碼膨脹與分支預測負擔，而真正丟出時的成本更是遠高於一次函式回傳——這在延遲敏感的 HPC 熱路徑（例如逐元素運算迴圈中偶發的數值溢位檢查）中是不可忽視的差異。\n\n`std::expected` 特別適合「預期中、可回復」的失敗：逾時、資源暫時不足、輸入驗證失敗，這些都是呼叫端本來就該準備好處理的正常分支，而非真正意外的程式錯誤。但它並非萬用解：跨 ABI 邊界（例如 C 介面、某些 GPU/offload runtime 的回呼函式簽名）通常無法直接傳遞一個模板化的 `std::expected`，仍需要轉換成純錯誤碼或狀態旗標；此外，若把 `std::expected` 一路往上層層轉送而每層都要手動檢查與轉發，程式碼會比例外的自動傳播更囉唆，這時可以用 `and_then` 鏈式呼叫或在邊界處集中轉換為例外，兩者混合使用而非互斥。',
    },
    {
      heading: '部分失敗的聚合策略：別讓第一個例外吞掉其他失敗',
      body: '當一個平行演算法把工作拆成 N 個任務（無論是 `std::async`、執行緒池，還是 `std::for_each` 加執行策略）分頭執行，每個任務都可能獨立失敗。天真的做法是讓任何一個任務丟出例外就直接讓整個呼叫失敗（例如透過第一個 `future::get()` 拋出的例外），但這樣其餘 N-1 個任務中「也失敗了、且失敗原因可能完全不同」的資訊就永遠遺失了——除錯時只看到一則錯誤訊息，卻不知道背後其實有三個任務因為不同原因同時失敗。\n\n更好的策略是讓每個任務回傳 `std::expected<T, std::string>`（或攜帶更豐富資訊的錯誤型別，如 `std::exception_ptr` 搭配任務索引），統一收集進一個結果容器後再一次性分析：全部成功、部分成功、還是全部失敗，並把所有失敗原因彙整進一個聚合報告或聚合例外（許多語言稱之為 aggregate exception／multi-error）。這也呼應第 36 章討論過的「例外無法跨執行緒自動傳播」問題：`std::exception_ptr` 是安全攜帶例外跨執行緒邊界的機制，但把它跟 `std::expected` 這種顯式錯誤值兩者結合，能同時保留「延後拋出以維持原例外型別」與「不因單一失敗而中斷聚合流程」兩個優點。',
    },
    {
      heading: '決策框架：例外、std::expected、錯誤碼三選一',
      body: '在效能敏感的並行程式中，選擇錯誤傳遞機制可依循幾個問題：這個失敗有多常見？多常見的失敗應該用 `std::expected` 或錯誤碼——把它當成正常控制流的一部分，讓分支預測器與呼叫慣例保持穩定；真正意外、代表程式不變量被破壞的情況（邏輯錯誤、不可回復的系統性故障）才適合用例外，因為例外的設計初衷就是「罕見路徑可以慢，但常見路徑必須快」。\n\n第二個問題是失敗需不需要跨越 ABI 或非 C++ 邊界：跨 C 介面、GPU kernel launch、動態載入的外部函式庫，通常只能用整數錯誤碼或 `errno` 風格機制，`std::expected` 與例外都不適用，需要在邊界處做轉換層。第三個問題是失敗是否需要聚合（多個獨立任務、多個獨立驗證規則）：只要答案是「是」，就該優先考慮把結果收斂為顯式值（`std::expected` 或自訂 `Result` 型別）而非依賴例外的『第一個丟出者贏』語意，因為聚合本質上需要「先收集、再決策」，這與例外的「立即中斷控制流」語意天生衝突。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <expected>
#include <future>
#include <print>
#include <string>
#include <vector>

// A parallel task: may succeed and return an int, or fail carrying an explanatory string. [1]
std::expected<int, std::string> risky_task(int id) {
    if (id % 3 == 0) {
        return std::unexpected("task " + std::to_string(id) + ": simulated failure");
    }
    return id * id;
}

struct AggregateReport {
    std::vector<int> succeeded;
    std::vector<std::string> failures;  // [2] Collect ALL failure reasons, not just the first one
};

// Launch N tasks and aggregate every std::expected result. [3]
AggregateReport run_all_and_aggregate(int taskCount) {
    std::vector<std::future<std::expected<int, std::string>>> futures;
    futures.reserve(static_cast<std::size_t>(taskCount));

    for (int i = 0; i < taskCount; ++i) {
        futures.push_back(std::async(std::launch::async, risky_task, i));  // [4] Each task runs independently
    }

    AggregateReport report;
    for (auto& fut : futures) {
        std::expected<int, std::string> result = fut.get();  // [5] get() only throws for async's own failures
        if (result.has_value()) {
            report.succeeded.push_back(*result);
        } else {
            report.failures.push_back(result.error());  // [6] A failure doesn't stop the loop; keep collecting the rest
        }
    }
    return report;
}

int main() {
    AggregateReport report = run_all_and_aggregate(9);

    std::println("Succeeded tasks: {}", report.succeeded.size());
    std::println("Failed tasks: {}", report.failures.size());
    for (const std::string& msg : report.failures) {
        std::println("  - {}", msg);
    }
    return 0;
}`,
    callouts: [
      {
        n: 1,
        text: 'std::expected<T, E> 讓「預期中會失敗」的路徑成為回傳型別的一部分，不需要丟出例外。',
      },
      { n: 2, text: 'AggregateReport 同時保留成功與所有失敗的資訊，而非只保留第一個失敗。' },
      { n: 3, text: '啟動固定數量的平行任務，模擬多執行緒各自獨立可能失敗的情境。' },
      {
        n: 4,
        text: 'std::launch::async 強制每個任務在獨立執行緒上執行，而非延遲到 get() 才同步執行。',
      },
      {
        n: 5,
        text: 'future::get() 在此只回傳 std::expected 值本身；真正的例外情境改用 exception_ptr 另行處理。',
      },
      {
        n: 6,
        text: '關鍵：任何一個任務失敗都不會中斷聚合迴圈，其餘任務的成功或失敗依然會被完整記錄。',
      },
    ],
  },
  pitfalls: [
    '讓平行任務集合中第一個例外直接透過 `future::get()` 拋出並中止整個聚合流程，其餘任務即使也失敗，其原因也永遠遺失。',
    'RAII guard 只處理「解構子一定會被呼叫」，卻沒有確保 `stop_token` 觸發時的中繼狀態本身滿足強保證，導致取消後留下半成品資料。',
    '在高頻呼叫的熱路徑中對「預期中會發生」的失敗（如逾時、驗證失敗）使用例外，讓非例外路徑也承擔堆疊展開機制帶來的程式碼膨脹與分支成本。',
    '把 `std::expected<T, E>` 直接暴露在 C ABI 或 GPU kernel 邊界上，忽略了模板型別無法跨越這些邊界，導致連結或介面錯誤。',
    '對 `std::expected` 的錯誤值使用 `.value()` 而未檢查 `has_value()`，在失敗時觸發 `std::bad_expected_access` 例外，等於繞了一圈又回到例外機制。',
  ],
  bestPractices: [
    '把每個可被取消中斷的階段設計成整體具強保證：先在私有暫存區完成運算，再用單一 `noexcept` 操作發佈結果，讓取消或例外都不會留下半成品狀態。',
    '平行任務回傳 `std::expected<T, E>`（或攜帶索引的 `exception_ptr`），統一收集進聚合容器後再一次分析全部成功／部分失敗／全部失敗。',
    '對「預期中會偶爾失敗」的路徑優先用 `std::expected` 或錯誤碼；只對真正意外、代表不變量被破壞的情況使用例外。',
    '跨 C ABI、GPU/offload 邊界時，在邊界處集中把 `std::expected` 或例外轉換為整數錯誤碼，內部仍可使用慣用的 C++ 錯誤傳遞機制。',
    '善用 `and_then`／`or_else`／`transform` 鏈式組合 `std::expected`，避免每一層呼叫都手動 `if (!result)` 檢查與轉發。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '在一個啟動 N 個平行任務的聚合流程中，最容易造成資訊遺失的做法是什麼？',
      options: [
        { id: 'a', text: '讓每個任務回傳 std::expected，最後統一收集成功與失敗' },
        { id: 'b', text: '讓第一個丟出例外的任務直接中止整個流程，其餘任務結果不再被記錄' },
        { id: 'c', text: '用 std::exception_ptr 搭配索引記錄每個任務各自的例外' },
        { id: 'd', text: '把所有任務的錯誤訊息彙整進一份聚合報告' },
      ],
      correctOptionId: 'b',
      explanation:
        '若第一個例外就中止整個聚合流程並直接向外拋出，其餘任務即使也失敗（甚至原因不同），這些資訊都無法被記錄下來，除錯時會誤以為只有單一原因。',
    },
    {
      id: 'q2',
      stem: '為什麼 std::expected<T, E> 常被視為比例外更適合高頻的「預期中會失敗」路徑？',
      options: [
        { id: 'a', text: '因為 std::expected 永遠比例外語意更豐富' },
        {
          id: 'b',
          text: '因為它把失敗編碼進回傳型別，不需要堆疊展開，避免了例外機制在熱路徑上的額外成本',
        },
        { id: 'c', text: '因為例外在 C++23 已被棄用' },
        { id: 'd', text: '因為 std::expected 可以跨越任何 ABI 邊界而例外不行' },
      ],
      correctOptionId: 'b',
      explanation:
        '例外的堆疊展開機制即使不觸發也可能帶來程式碼膨脹與分支預測負擔，真正丟出時成本更高；std::expected 讓「常見的失敗」走一般函式回傳路徑，成本更可預期，適合延遲敏感的熱路徑。',
    },
    {
      id: 'q3',
      stem: '當 std::jthread 的 stop_token 在關鍵區段中途被觸發時，最能維持狀態一致性的設計是？',
      options: [
        { id: 'a', text: '從外部強制中斷該執行緒，讓作業系統立即回收其資源' },
        {
          id: 'b',
          text: '讓工作函式定期檢查旗標並提前返回，且中繼狀態本身具強保證（先算完再以單一操作發佈結果）',
        },
        { id: 'c', text: '完全忽略 stop_token，讓任務一定要跑到完成才能返回' },
        { id: 'd', text: '在收到取消請求時直接呼叫 std::terminate() 避免不一致' },
      ],
      correctOptionId: 'b',
      explanation:
        '協作式取消要求工作函式自行檢查旗標並安全提前返回；若每個階段本身具備強保證（先在暫存區完成、再以單一 noexcept 操作發佈），無論正常完成、例外或取消都不會留下半成品狀態。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['RAII 清理', '取消（stop_token）', 'std::expected 錯誤傳遞', '部分失敗聚合報告'],
    caption:
      '並行例外安全的清理路徑：RAII guard 面對正常完成、例外與取消三種出口都要保持一致；可回復失敗改用 std::expected 傳遞，多任務的個別失敗最終匯整為聚合報告。',
  },
  tryIt: {
    code: `#include <expected>
#include <future>
#include <iostream>
#include <string>
#include <vector>

std::expected<int, std::string> risky_task(int id) {
    if (id % 3 == 0) {
        return std::unexpected("task " + std::to_string(id) + " failed");
    }
    return id * id;
}

int main() {
    std::vector<std::future<std::expected<int, std::string>>> futures;
    for (int i = 0; i < 6; ++i) {
        futures.push_back(std::async(std::launch::async, risky_task, i));
    }

    int successCount = 0;
    std::vector<std::string> failures;
    for (auto& fut : futures) {
        auto result = fut.get();
        if (result.has_value()) {
            ++successCount;
        } else {
            failures.push_back(result.error());
        }
    }

    std::cout << "success = " << successCount << ", failures = " << failures.size() << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::expected - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/utility/expected',
      description: 'C++23 std::expected<T, E> 的介面、and_then／or_else／transform 等組合子說明。',
    },
    {
      title: 'Exception safety - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/exceptions',
      description: '例外機制與基本／強／不丟出三級保證的標準說明。',
    },
    {
      title: 'std::exception_ptr - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/error/exception_ptr',
      description: '安全攜帶例外跨執行緒邊界、延後重新拋出的機制。',
    },
    {
      title: 'Herb Sutter, "Zero-overhead deterministic exceptions" (P0709)',
      href: 'https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2018/p0709r0.pdf',
      description: '探討例外機制成本與以值傳遞錯誤（如 std::expected 前身提案）的設計動機。',
    },
  ],
};

export default ind24ExceptionSafetyResourceMgmt;
