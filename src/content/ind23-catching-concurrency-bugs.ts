import type { ChapterContent } from '@/types/ChapterContent';

const ind23CatchingConcurrencyBugs: ChapterContent = {
  slug: 'ind23-catching-concurrency-bugs',
  chapterLabel: '第 52 章',
  title: '並行 bug 的捕捉',
  group: '第 15 部：正確性、測試與除錯',
  description:
    'ThreadSanitizer／AddressSanitizer 的原理與盲點，壓力測試、fuzzing 與確定性重播，以及 std::atomic 的形式化直覺。',
  concept: {
    standard: 'C++20',
    body: '並行錯誤最棘手之處在於它們是「機率性」的：一次乾淨的執行不代表程式正確，只代表這次排程剛好沒有觸發競爭。ThreadSanitizer（TSan）與 AddressSanitizer（ASan）是兩種動態插樁工具，分別鎖定資料競爭與記憶體錯誤，但兩者都只能回報「實際執行到的路徑」上發生的問題——沒被排程器選中的交錯（interleaving）就算存在競爭也不會被看見。因此工業實務把 sanitizer 當成「提高偵測機率」的手段，再疊加壓力測試、fuzzing 去主動擴大交錯空間，並用確定性重播（record-and-replay）把一次偶然觀察到的競爭固定下來，讓除錯不必重新賭運氣。這些經驗性工具與 ind06 談的 litmus test／CppMem 形式化推理互補：前者告訴你「這次真的炸了」，後者告訴你「在這個記憶體模型下，哪些結果本來就是合法的」。',
  },
  deepDive: [
    {
      heading: 'TSan 的 happens-before 追蹤與根本盲點',
      body: 'ThreadSanitizer 在編譯期對每個記憶體存取與同步操作插入插樁碼，執行期為每個執行緒維護一份向量時鐘（vector clock）風格的中繼資料，近似地追蹤「哪些寫入 happens-before 哪些讀取」。當兩個對同一位置的存取（至少一個是寫入）之間，TSan 找不到任何 happens-before 邊把它們排序——也就是說根據目前觀察到的同步事件（鎖、`std::atomic` 的 acquire/release、執行緒建立與 join 等），這兩個存取彼此並行——就回報一筆資料競爭，通常會印出類似「兩個執行緒的存取堆疊」搭配「發生於哪個記憶體位置」的診斷。\n\n這個演算法的根本盲點在於它是**動態**分析：happens-before 關係是從這一次實際發生的執行事件重建出來的，TSan 完全不知道「這次沒發生」的交錯裡藏著什麼。如果一段程式碼有競爭，但測試案例、排程器的選擇、CPU 負載恰好讓兩個執行緒的存取序列化，TSan 就不會回報任何東西——這不是工具失靈，而是它本質上只能看見「被執行到」的那一份歷史。因此 TSan 能大幅降低 false negative（漏報），但永遠無法保證消除它；一份「TSan 跑過都是綠燈」的測試報告，只能解讀成「在目前測過的路徑上沒有競爭」，不能解讀成「這支程式沒有資料競爭」。',
    },
    {
      heading: 'ASan 的 shadow memory 與和 TSan 的實務互斥',
      body: 'AddressSanitizer 的核心機制是 shadow memory：它為程式的每一段記憶體額外配置一塊「影子」區域（通常是真實位址右移 3 位、外加一個固定偏移），用一個位元組記錄對應 8 個位元組的可定址狀態——正常、紅色警戒區（redzone，標記堆疊／堆積物件周圍的越界緩衝）、或已釋放（poisoned）。每次記憶體存取前，插樁碼先查詢 shadow memory：如果狀態顯示該位址不可存取，立即中止並印出精確的堆疊、物件配置／釋放的歷史。這讓 ASan 能捕捉堆疊與堆積的越界讀寫、釋放後使用（use-after-free）、雙重釋放，以及部分記憶體洩漏。\n\nASan 與 TSan 在實務上通常不會編譯進同一個執行檔：兩者都要在每次記憶體存取前插入額外檢查，但 shadow memory 的配置策略與 TSan 的 happens-before 中繼資料在位址空間配置、插樁時機上有衝突，且同時疊加兩者的效能開銷（各自已是數倍到十餘倍）在多數建置系統上不可接受。因此標準做法是分別建置兩種 sanitizer 版本（例如 CI 裡的 `asan-build` 與 `tsan-build` 兩條管線），各自跑一輪測試，而不是奢望一次建置就抓齊所有問題類別。',
    },
    {
      heading: '壓力測試與 fuzzing：主動擴大交錯空間',
      body: '既然 sanitizer 只能看見被執行到的交錯，工業做法就反過來想：想辦法讓「危險的交錯」更容易被排程器選中。壓力測試（stress testing）最直接的手法是提高並發程度與重複次數——用遠多於核心數的執行緒數量製造激烈的排程競爭、在迴圈中重跑同一個測試數千到數萬次、把測試綁在高負載的 CI runner 上跑（核心數多、系統忙碌時排程更不規律，反而更容易暴露原本罕見的交錯）。有些團隊會在編譯或執行期注入隨機的短暫延遲（如在可疑的臨界區前後插入 `std::this_thread::yield()` 或微秒級 `sleep`），刻意放大競爭視窗，讓本來窄到幾乎不可能命中的交錯變得容易出現；ThreadSanitizer 本身在偵測到候選競爭時也會做類似的「延遲注入」以確認競爭是可重現的，而非誤報。\n\nFuzzing 傳統上用於單執行緒的輸入驗證（如 libFuzzer、AFL 對解析器灌入隨機或變異過的位元組流），但也可以延伸到並行系統：把「執行緒數量」「操作發起的相對時機」「鎖的持有時間」等排程相關參數也當成 fuzzer 可以變異的輸入維度，讓 fuzzer 自動搜尋容易觸發競爭或死鎖的排程組合，而不是仰賴人工猜測「哪裡可能有問題」。這類做法通常需要搭配確定性的排程模擬層（例如可控制執行緒切換點的協作式排程器）才能讓 fuzzer 的搜尋可重現、可回放。',
    },
    {
      heading: '確定性重播：把一次偶然的競爭固定下來',
      body: '並行 bug 最消耗心力的地方不是「發現」而是「重現」——一個只在特定排程下出現的 heisenbug，可能改一行無關的 log 敘述、換一台機器、甚至只是重跑一次就再也不出現。確定性重播（record-and-replay）工具的思路是：第一次執行時盡量低開銷地記錄「所有會影響非決定性結果的輸入」——包含執行緒排程順序、系統呼叫的回傳值、訊號時序、隨機數等；之後可以用記錄下來的日誌，強制讓程式在完全相同的排程下重新執行任意多次，得到位元級相同的結果。\n\n以 Mozilla 開發的 `rr` 為例，它用 ptrace 攔截並記錄目標程式的系統呼叫與非決定性事件，記錄開銷通常只有原生執行的一到兩倍（遠低於 TSan 的插樁開銷），因此可以直接在正常測試或生產環境的邊緣情境錄製，一旦真的觀察到一次崩潰或競爭，就用 `rr replay` 反覆回放、搭配 `gdb` 做逆向除錯（reverse debugging，可以「往回」單步執行，直接跳到某個變數上次被寫入的那一刻）。這把「除錯並行 bug」從「祈禱它再發生一次」變成「拿著已經發生過的那一次錄影反覆檢查」，是壓力測試與 sanitizer 之外，處理罕見交錯問題不可或缺的第三隻腳。',
    },
    {
      heading: '回顾：std::atomic 的形式化直覺與經驗工具的分工',
      body: 'Sanitizer、壓力測試、確定性重播都是**經驗性**（empirical）手段：它們告訴你「在觀察到的執行中發生了什麼」，本質上是抽樣。要對 `std::atomic` 的同步協定建立**形式化**的信心，需要回到 ind06 介紹的 litmus test 與 CppMem 這類工具——用最小化的程式片段窮舉某個記憶體序組合在 C++ 記憶體模型下「所有」允許的結果，而不是依賴某一次執行剛好觀察到什麼。\n\n兩者是互補而非替代的關係：litmus test 級的推理適合在設計階段驗證「這個 relaxed／acquire-release 協定在理論上是否可能出錯」，回答的是「可能發生什麼」；TSan、壓力測試、`rr` 則適合在實作與維運階段回答「這次部署的程式碼實際上發生了什麼」，並在出問題時提供可重現的第一手證據。一個成熟的並行程式碼審查流程，通常要求關鍵的無鎖資料結構同時具備兩者：文件裡寫明對應的 litmus test 推理，CI 裡則跑 TSan 與足量的壓力測試作為第二道防線。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <atomic>
#include <cstdio>
#include <thread>

int shared_counter = 0;  // [1]

void worker(int iterations) {
    for (int i = 0; i < iterations; ++i) {
        ++shared_counter;  // [2]
    }
}

int main() {
    constexpr int kIterations = 100000;

    std::jthread t1(worker, kIterations);
    std::jthread t2(worker, kIterations);
    // jthread joins automatically on destruction; no explicit call needed. [3]

    // If compiled and run with g++ -std=c++20 -g -fsanitize=thread race.cpp,
    // TSan will roughly report a message of this form (illustrative, not actual output):
    //   WARNING: ThreadSanitizer: data race
    //     Write of size 4 at 0x0001 by thread T2:
    //       #0 worker(int) race.cpp:8
    //     Previous write of size 4 at 0x0001 by thread T1:
    //       #0 worker(int) race.cpp:8
    // This report only appears when the schedule happens to trigger the race this run;
    // if the schedule happens to serialize both threads' accesses, the same binary may pass silently. [4]
    std::printf("counter = %d (expected %d)\\n", shared_counter,
                2 * kIterations);  // [5]
    return 0;
}

// Fix: switch to std::atomic<int> and use fetch_add so every increment is an
// indivisible read-modify-write, eliminating the race without an extra lock.
//
//   std::atomic<int> shared_counter{0};
//   ...
//   shared_counter.fetch_add(1, std::memory_order_relaxed);  // [6]`,
    callouts: [
      { n: 1, text: '一般 int，沒有任何同步保護——兩個執行緒都會對它做讀-改-寫的遞增操作。' },
      {
        n: 2,
        text: '`++shared_counter` 展開後是讀取、加一、寫回三個步驟，兩個執行緒交錯執行時可能互相蓋掉對方的結果，是典型的資料競爭。',
      },
      {
        n: 3,
        text: 'std::jthread 解構時自動 join，避免忘記 join 造成的 std::terminate，但不會消除執行緒間的資料競爭。',
      },
      {
        n: 4,
        text: 'TSan 的偵測是動態的：它只能回報這次執行中實際交錯到的競爭，排程序列化時同一份程式可能不會觸發任何警告。',
      },
      {
        n: 5,
        text: '在有競爭的情況下，最終印出的 counter 值通常小於 200000，且每次執行結果可能不同——這正是並行 bug 難以用單次觀察判斷正確性的原因。',
      },
      {
        n: 6,
        text: '改用 std::atomic 的 fetch_add 讓遞增成為一個不可分割的原子操作，消除了讀-改-寫之間被其他執行緒插入的可能，relaxed 已足夠因為這裡沒有其他資料需要被這次遞增排序。',
      },
    ],
  },
  pitfalls: [
    '把「TSan/ASan 這次跑起來乾淨」誤解為「程式沒有資料競爭／記憶體錯誤」——sanitizer 只能回報實際執行到的路徑上發生的問題，未被觸發的交錯依然可能藏著競爭。',
    '嘗試在同一個執行檔裡同時啟用 `-fsanitize=address` 與 `-fsanitize=thread`——兩者插樁機制衝突，實務上必須分開建置、分開跑。',
    '編譯 sanitizer 版本時忘記加 `-g`（除錯符號）或用了過高的最佳化等級——缺少除錯資訊會讓 TSan/ASan 的堆疊回溯失去行號，難以定位問題；一般建議 `-g -O1`，在保留足夠除錯資訊與避免 `-O0` 過慢之間取捨。',
    '把偶發的並行測試失敗當成「環境不穩定」直接重跑掉，而不是用壓力測試放大復現機率、或用 `rr` 之類工具錄製下來——很多真正的資料競爭就是這樣被長期忽視的。',
    '只在單一交錯模式（例如本地開發機、低核心數）下跑測試，就認定並行程式碼正確——高核心數、高負載的 CI 環境往往才會暴露罕見的排程交錯。',
  ],
  bestPractices: [
    'CI 中把 ASan+UBSan 與 TSan 拆成兩條獨立管線分別執行，不要嘗試合併進同一個建置。',
    '編譯 sanitizer 版本時使用 `-g -O1`，兼顧可讀的堆疊回溯與尚可接受的執行速度。',
    '對並行程式碼做壓力測試：提高執行緒數、迴圈重跑次數，並在高核心數、高負載的機器上跑，以提高交錯覆蓋率。',
    '用 `rr` 等 record-and-replay 工具錄製難以重現的並行失敗，將其轉成可反覆回放、可用 `gdb` 逆向除錯的固定案例。',
    '對關鍵的無鎖資料結構，在設計階段先用 litmus test／CppMem 做形式化推理（參見 ind06），再把 TSan 與壓力測試當作實作正確性的第二道防線，兩者缺一不可。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '為什麼「用 ThreadSanitizer 跑過所有測試都沒有警告」不能當成「程式沒有資料競爭」的證明？',
      options: [
        { id: 'a', text: 'TSan 只能偵測記憶體洩漏，不偵測資料競爭' },
        {
          id: 'b',
          text: 'TSan 是動態分析工具，只能回報這次執行實際交錯到的競爭；沒被排程器選中的交錯即使有競爭也不會被觀察到',
        },
        { id: 'c', text: 'TSan 一定會誤報，所以結果不可信' },
        { id: 'd', text: 'TSan 只支援單執行緒程式' },
      ],
      correctOptionId: 'b',
      explanation:
        'TSan 從實際發生的同步事件重建 happens-before 關係，只能對「這次執行中真的交錯到」的存取回報競爭；未被觸發的交錯完全在它的觀察範圍之外，因此乾淨的報告只代表「這些路徑上沒測到競爭」。',
    },
    {
      id: 'q2',
      stem: '關於 AddressSanitizer 與 ThreadSanitizer 的實務限制，下列敘述何者正確？',
      options: [
        { id: 'a', text: '兩者可以在同一個執行檔裡自由同時啟用，沒有任何限制' },
        {
          id: 'b',
          text: '兩者通常不會編譯進同一個二進位，因插樁機制衝突與效能開銷疊加，實務上分開建置、分開執行',
        },
        { id: 'c', text: 'ASan 只能在 Windows 上使用' },
        { id: 'd', text: 'TSan 可以取代 ASan 偵測所有記憶體越界問題' },
      ],
      correctOptionId: 'b',
      explanation:
        'ASan 的 shadow memory 機制與 TSan 的 happens-before 中繼資料在插樁與位址空間配置上互相衝突，且同時開啟的效能開銷難以接受，因此工業實務會分成 asan-build 與 tsan-build 兩條 CI 管線各自執行。',
    },
    {
      id: 'q3',
      stem: '確定性重播（如 `rr`）工具在並行除錯中解決的核心問題是什麼？',
      options: [
        { id: 'a', text: '自動修正程式中的資料競爭' },
        {
          id: 'b',
          text: '讓一次偶然觀察到的競爭或崩潰可以被完整記錄並精確重播，不必依賴重新執行時排程恰好再次命中同一個交錯',
        },
        { id: 'c', text: '取代 std::atomic，讓程式不需要任何同步原語' },
        { id: 'd', text: '提高程式的編譯速度' },
      ],
      correctOptionId: 'b',
      explanation:
        '並行 bug 常見的困難是重現：排程是非決定性的，同一份程式重跑不一定再現同一個問題。record-and-replay 工具記錄下影響排程與系統呼叫結果的非決定性事件，之後可以強制重播出位元級相同的執行，讓除錯者能反覆檢視同一次已發生的失敗，而不是重新賭一次排程。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['寫測試', 'TSan/ASan', '壓力測試', '確定性重播'],
    caption:
      '捕捉並行 bug 的流程：測試先過一輪 TSan/ASan 插樁（只能抓到被執行到的路徑），再以壓力測試放大交錯覆蓋率，一旦命中就用確定性重播把那一次觀察固定下來反覆除錯。',
  },
  tryIt: {
    code: `#include <atomic>
#include <cstdio>
#include <thread>

std::atomic<int> shared_counter{0};

void worker(int iterations) {
    for (int i = 0; i < iterations; ++i) {
        shared_counter.fetch_add(1, std::memory_order_relaxed);
    }
}

int main() {
    constexpr int kIterations = 100000;

    std::jthread t1(worker, kIterations);
    std::jthread t2(worker, kIterations);

    // jthread joins automatically on destruction; after replacing the bare ++ with fetch_add,
    // this is always exactly 2 * kIterations, and TSan won't report any race.
    std::printf("counter = %d (expected %d)\\n", shared_counter.load(), 2 * kIterations);
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'ThreadSanitizer (Clang/LLVM docs)',
      href: 'https://clang.llvm.org/docs/ThreadSanitizer.html',
      description: 'TSan 的插樁原理、使用方式與已知限制的官方文件。',
    },
    {
      title: 'AddressSanitizer (Clang/LLVM docs)',
      href: 'https://clang.llvm.org/docs/AddressSanitizer.html',
      description: 'ASan 的 shadow memory 機制、旗標與可偵測錯誤類型。',
    },
    {
      title: 'rr: lightweight recording & deterministic debugging',
      href: 'https://rr-project.org/',
      description: 'Mozilla 開發的 record-and-replay 除錯工具，支援逆向執行與確定性重播。',
    },
    {
      title: 'CppMem: Interactive C/C++ Memory Model',
      href: 'https://www.cl.cam.ac.uk/~pes20/cppmem/',
      description:
        '線上 litmus test 模擬器，可窮舉列出記憶體序組合在 C++ 記憶體模型下所有允許的結果，與本章經驗性工具互補。',
    },
  ],
};

export default ind23CatchingConcurrencyBugs;
