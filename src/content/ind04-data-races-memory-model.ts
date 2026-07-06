import type { ChapterContent } from '@/types/ChapterContent';

const ind04DataRacesMemoryModel: ChapterContent = {
  slug: 'ind04-data-races-memory-model',
  chapterLabel: '第 4 章',
  title: '資料競爭與 C++ 記憶體模型',
  group: 'I · 第一部：C++ 記憶體模型與原子操作',
  description:
    'happens-before、sequenced-before、synchronizes-with 三個關係，資料競爭即未定義行為，以及為何 volatile 不是同步原語。',
  concept: {
    standard: 'C++11',
    body:
      'C++ 記憶體模型（C++11 引入）以三個關係精確定義多執行緒程式的可見性：sequenced-before 描述單一執行緒內運算式求值的順序；synchronizes-with 描述跨執行緒的同步點，典型由一個 release 操作與讀到該值的 acquire 操作配對產生；happens-before 則是前兩者經遞移閉包組成的全域關係——若 A happens-before B，A 的效果保證對 B 可見。若兩個不同執行緒的操作同時存取同一記憶體位置、至少一個是寫入、且兩者之間沒有 happens-before 關係，就構成資料競爭（data race）。標準明確規定：含有資料競爭的程式其行為是未定義行為（undefined behavior），不是「結果不可預期」這麼溫和，而是編譯器可以假設資料競爭不存在，並據此做任意激進轉換。',
  },
  code: {
    lang: 'cpp',
    code: `#include <atomic>
#include <cstdio>
#include <thread>

// Anti-pattern: a "volatile" flag used for cross-thread signalling. This is
// a classic piece of legacy HPC code that looks synchronized but is not.
volatile bool legacy_ready = false;  // [1]
int legacy_payload = 0;              // plain, non-atomic, non-volatile data

void legacy_producer() {
    legacy_payload = 42;  // [2] ordinary write, no ordering guarantee
    legacy_ready = true;  // [3] volatile write: reordering across
                          //     threads is still permitted
}

void legacy_consumer() {
    while (!legacy_ready) {  // [4] volatile read is not atomic and is not
        // spin                //     an acquire: the compiler/CPU may still
    }  //     reorder or the read may tear on some
       //     targets
    std::printf("legacy_payload = %d\\n", legacy_payload);  // may print 0
}

// Correct fix: std::atomic with explicit release/acquire ordering.
std::atomic<bool> ready{false};  // [5]
int payload = 0;

void producer() {
    payload = 42;                                  // sequenced-before [6]
    ready.store(true, std::memory_order_release);  // [6] publishes payload
}

void consumer() {
    while (!ready.load(std::memory_order_acquire)) {  // [6] pairs with store
        // spin
    }
    std::printf("payload = %d\\n", payload);  // guaranteed to print 42
}

int main() {
    std::thread t1{producer};
    std::thread t2{consumer};
    t1.join();
    t2.join();
    return 0;
}`,
    callouts: [
      {
        n: 1,
        text: 'volatile 只告訴編譯器「不要優化掉這個變數的存取」，跟執行緒同步毫無關係。',
      },
      {
        n: 2,
        text: 'legacy_payload 是普通變數，寫入與 legacy_ready 之間沒有任何跨執行緒排序保證。',
      },
      {
        n: 3,
        text: 'volatile 寫入不是 release：其他執行緒看到 legacy_ready == true 時，不保證能看到 legacy_payload = 42 的效果。',
      },
      {
        n: 4,
        text: 'volatile 讀取不是 acquire，也不是原子操作；在弱順序硬體（如 ARM）上可能讀到過期值，某些型別上甚至可能撕裂讀取（tearing）。',
      },
      {
        n: 5,
        text: 'std::atomic<bool> 才是正確的同步原語：保證原子性，並可指定 memory_order。',
      },
      {
        n: 6,
        text: 'release 儲存與 acquire 載入配對後形成 synchronizes-with，加上各自執行緒內的 sequenced-before，遞移出 happens-before，因此 consumer 讀到的 payload 保證是 42。',
      },
    ],
  },
  deepDive: [
    {
      heading: 'sequenced-before、synchronizes-with、happens-before 的精確關係',
      body:
        '`sequenced-before` 是單一執行緒內的偏序關係：在同一個執行緒中，若運算式 A 的求值在運算式 B 之前完成（例如以逗號分隔的敘述、函式呼叫前的引數求值等），則 A sequenced-before B。它純粹描述「同一條指令流內的先後」，與其他執行緒無關。\n\n`synchronizes-with` 描述跨執行緒的同步：當一個執行緒對某個原子物件做 release 操作（`memory_order_release` 或更強），而另一個執行緒對同一物件做 acquire 操作（`memory_order_acquire` 或更強）並讀到該次 release 寫入（或其後的值），這兩個操作之間就建立 synchronizes-with 關係。互斥鎖的 unlock／lock、`std::thread` 的建構／join、`std::atomic` 的 release／acquire 配對都是產生 synchronizes-with 的來源。\n\n`happens-before` 是把 sequenced-before 與 synchronizes-with 做遞移閉包後得到的全域關係：若 A sequenced-before B，則 A happens-before B；若 A synchronizes-with B，則 A happens-before B；若 A happens-before B 且 B happens-before C，則 A happens-before C。這條鏈式關係就是判斷「執行緒 X 的寫入是否保證對執行緒 Y 可見」的唯一依據——沒有 happens-before，就沒有可見性保證，即使實際測試中「看起來正確」。',
    },
    {
      heading: '資料競爭為何是 UB，而不只是「跑出爛值」',
      body:
        '標準（[intro.races]）的定義是：兩個不同執行緒的操作衝突（存取同一記憶體位置且至少一者為寫入），且彼此之間沒有 happens-before 關係，就是資料競爭；程式含有資料競爭時，其行為未定義。這與「唯讀共享」或「單執行緒重排」完全不同層級——UB 意味著標準對程式之後的任何行為都不再做任何保證。\n\n實務後果遠比「讀到舊值」嚴重，因為最佳化器可以假設程式不含資料競爭來做激進轉換：\n\n1. 整個迴圈被消除——若編譯器證明某個非原子變數在迴圈內被寫入但（在假設無資料競爭的前提下）從未被其他執行緒讀取，可能把看似「自旋等待旗標」的迴圈直接優化成無窮迴圈或直接刪除，因為它假設該變數不會被其他執行緒改變。\n2. 時序被重排到違反直覺——沒有同步關係約束時，讀寫可以被搬移、合併、快取到暫存器，寫回時機與原始碼順序無關；兩個看似「先設值再設旗標」的敘述，實際機器碼可能顛倒。\n3. 「發明」讀寫（invented loads/stores）——最佳化器可能把條件式存取轉成無條件存取（store widening/narrowing 等），在資料競爭語意下這種存取的值可被視為任意，未定義值可能污染其他看似無關的變數，甚至讓另一個執行緒讀到的並非任何一次寫入曾經存在過的值。\n4. 「時光旅行」最佳化——由於 UB 之後一切皆有可能，編譯器甚至可以把 UB 發生前的程式碼也一併改變效果（因為整條路徑「反正不會發生」的邏輯只在無 UB 前提下成立），實務上曾出現資料競爭導致與競爭點無關的程式碼被裁剪或行為異常。\n\n這些都是真實編譯器在啟用最佳化時會做的轉換，不是理論上的恐嚇；這也是為什麼「我測試過，這段沒同步的程式碼在我的機器上一直正確」完全不能作為正確性論證。',
    },
    {
      heading: 'volatile 不是同步原語：它保證什麼、不保證什麼',
      body:
        '`volatile` 的語意只有一條：對 volatile 限定物件的每一次讀寫都必須被視為具有「可觀察的副作用」，編譯器不能將其優化掉、合併或重新排序到違反單一執行緒抽象機（abstract machine）可觀察行為的地步。它的設計目的是給記憶體映射 I/O（MMIO）、訊號處理常式（signal handler）內與 `sig_atomic_t` 搭配等場景使用，確保每次存取都真的落地。\n\n它完全沒有處理三件事：（一）原子性——`volatile` 讀寫在多數平台上對簡單型別可能是原子的，但標準沒有這項保證，對非對齊或超過機器字組大小的型別可能撕裂；（二）跨執行緒排序——`volatile` 不建立 synchronizes-with，因此不阻止編譯器把其他非 volatile 的讀寫重排到 volatile 存取的前後，CPU 的記憶體屏障也完全不受影響；（三）可見性——`volatile` 寫入沒有 release 語意，不保證這次寫入之前的其他變數寫入會先被其他執行緒看到。\n\n因此範例中的 `legacy_ready`／`legacy_payload` 是典型的「volatile 當作旗標」誤用：即使在 x86 這種強順序（TSO）硬體上，因為缺乏編譯器層級的排序保證，最佳化仍可能重排存取順序；換到 ARM／POWER 等弱順序硬體上，缺乏硬體屏障會讓問題更明顯地重現。',
    },
    {
      heading: 'HPC 老程式碼的實務啟示',
      body:
        '許多歷史悠久的高效能運算程式碼——尤其是移植自 C 或早期 C++（C++11 之前，當時語言根本沒有記憶體模型與 `std::thread` 概念）——習慣以 `volatile` 全域旗標、`volatile` 計數器實作「輕量級」執行緒間信號傳遞。在 C++11 之後，這些程式碼在語言層級是資料競爭、是未定義行為，只是因為早期編譯器最佳化較保守、目標硬體是強順序 x86，才「恰好」在特定環境下正常運作。\n\n升級編譯器版本、開啟更高最佳化等級（`-O2`／`-O3`）、換成 LTO、或移植到 ARM／RISC-V 等弱順序架構，都可能讓這類程式碼開始出現間歇性錯誤，而且往往難以重現與除錯，因為 UB 觸發的行為本身就不穩定。\n\n正確的現代寫法是：跨執行緒的旗標、計數器、發佈的指標一律使用 `std::atomic`，並依實際需求選擇 `memory_order`（預設 `seq_cst` 最安全，效能敏感處再視需要放寬到 `acquire`／`release` 或 `relaxed`）。C++20 額外提供 `std::atomic_ref`，可以在不改動既有資料結構型別的前提下，對一段記憶體施加原子語意，是移轉舊有 `volatile` 慣用法的實用橋樑；也應搭配 ThreadSanitizer（TSan）在 CI 中持續掃描資料競爭，因為資料競爭很多時候不會在單次測試中顯現。',
    },
  ],
  pitfalls: [
    '誤以為 `volatile` 能防止資料競爭或提供跨執行緒同步——它只保證單一執行緒內不被優化掉存取，不提供原子性、排序或可見性保證。',
    '把資料競爭的後果想成「頂多讀到舊值」，忽略編譯器可基於「假設無 UB」做出的迴圈刪除、重排、發明讀寫等真實轉換。',
    '在弱順序硬體（ARM／POWER）上直接搬用「在 x86 上測試沒問題」的無同步程式碼。',
    '混用非原子與原子存取存取同一份資料（例如只用 `std::atomic` 保護旗標，卻讓實際 payload 保持一般變數且缺乏 happens-before）。',
    '以為為變數加上 `volatile` 就能取代 mutex 或 `std::atomic`，用於保護共享狀態的讀寫。',
  ],
  bestPractices: [
    '跨執行緒共享並可能同時被寫入的資料一律使用 `std::atomic` 或以 mutex 保護，不使用 `volatile` 作為同步手段。',
    '明確建立 happens-before：以 release／acquire 配對，或以標準同步原語（mutex、`std::thread::join`、`std::condition_variable`）建立跨執行緒可見性。',
    '`volatile` 僅保留給真正需要「不可被優化掉的存取」的場景，如 MMIO 暫存器或訊號處理常式內的 `volatile sig_atomic_t`。',
    '以 ThreadSanitizer（`-fsanitize=thread`）在 CI 中持續檢測資料競爭，不要只依賴人工審查或單次測試通過。',
    '對移植中的舊 HPC 程式碼，系統性地審查所有 `volatile` 用途，逐一評估是否應改為 `std::atomic` 或 `std::atomic_ref`（C++20）。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '兩個執行緒的操作構成「資料競爭」的必要條件是什麼？',
      options: [
        { id: 'a', text: '兩者存取不同的記憶體位置' },
        { id: 'b', text: '兩者衝突存取同一位置（至少一者為寫入）且彼此間沒有 happens-before 關係' },
        { id: 'c', text: '兩者都在同一個執行緒中執行' },
        { id: 'd', text: '兩者都使用了 std::atomic' },
      ],
      correctOptionId: 'b',
      explanation:
        '資料競爭的標準定義是：不同執行緒衝突存取同一記憶體位置、至少一個是寫入、且兩個操作之間缺乏 happens-before 關係。滿足這三個條件即構成資料競爭。',
    },
    {
      id: 'q2',
      stem: '關於「資料競爭是未定義行為」的實際後果，下列敘述何者最準確？',
      options: [
        { id: 'a', text: '只是讀到的值可能是舊值或新值其中之一，其餘行為完全正常' },
        { id: 'b', text: '編譯器可以假設程式不含資料競爭並據此做激進最佳化，可能導致迴圈被整段刪除、存取被重排、甚至產生與競爭點無關的異常行為' },
        { id: 'c', text: '只會在除錯模式下出現問題，發佈版一定正常' },
        { id: 'd', text: '只影響該變數本身，不會波及其他程式邏輯' },
      ],
      correctOptionId: 'b',
      explanation:
        '未定義行為讓編譯器可以假設它不會發生，因此最佳化器可能基於「無資料競爭」的假設做出迴圈消除、重排序、發明讀寫等轉換，效果可能遠超出「值不對」的範圍，且與最佳化等級、硬體記憶體模型密切相關。',
    },
    {
      id: 'q3',
      stem: '在多執行緒程式中用 `volatile bool` 作為「工作完成旗標」讓另一個執行緒自旋等待，這種寫法的問題是什麼？',
      options: [
        { id: 'a', text: '完全沒有問題，這是標準建議的寫法' },
        { id: 'b', text: 'volatile 只保證不被優化掉存取本身，不提供原子性、跨執行緒排序或可見性保證，因此不構成有效同步' },
        { id: 'c', text: 'volatile 會讓程式編譯失敗' },
        { id: 'd', text: 'volatile 等同於 memory_order_seq_cst 的 std::atomic' },
      ],
      correctOptionId: 'b',
      explanation:
        'volatile 的語意僅限於單一執行緒抽象機層面的「不可優化掉的可觀察存取」，並未定義任何跨執行緒的 happens-before 關係，也不保證原子性；用它取代 std::atomic 或 mutex 做同步，本質上仍是資料競爭。',
    },
  ],
  diagram: {
    key: 'happens-before',
    caption:
      '同一張訊息傳遞範例也可以拆成三層來讀：執行緒內的 sequenced-before（垂直邊）先各自把「寫資料」與「寫旗標」、「讀旗標」與「讀資料」固定順序；release／acquire 配對產生的 synchronises-with（水平紅邊）把兩條時間線接起來；兩者遞移後才是 happens-before——若拿掉紅邊（例如把 release/acquire 換成 volatile 或 relaxed），左右兩條垂直線便不再相連，data == 42 的保證也隨之消失。',
  },
  tryIt: {
    code: `#include <atomic>
#include <cstdio>
#include <thread>

// Compare the two patterns below by toggling which one main() runs.
// The "legacy" volatile pattern has no happens-before edge between the
// threads; the atomic version does.

volatile bool legacy_ready = false;
int legacy_payload = 0;

std::atomic<bool> ready{false};
int payload = 0;

int main() {
    std::thread producer([]() {
        payload = 42;
        ready.store(true, std::memory_order_release);
    });
    std::thread consumer([]() {
        while (!ready.load(std::memory_order_acquire)) {
            // spin
        }
        std::printf("payload = %d\\n", payload);  // always 42
    });
    producer.join();
    consumer.join();

    // Try replacing the block above with the volatile-based version and
    // reason about why the compiler is free to break it:
    //
    // std::thread p2([]() {
    //     legacy_payload = 42;
    //     legacy_ready = true;
    // });
    // std::thread c2([]() {
    //     while (!legacy_ready) {
    //         // spin
    //     }
    //     std::printf("legacy_payload = %d\\n", legacy_payload);
    // });
    // p2.join();
    // c2.join();

    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::memory_order - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/atomic/memory_order',
      description: 'memory_order 列舉、release/acquire/seq_cst 語意與範例的權威參考。',
    },
    {
      title: 'std::atomic - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/atomic/atomic',
      description: '原子型別介面、各操作可用的記憶體順序參數。',
    },
    {
      title: 'volatile - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/cv',
      description: 'volatile 限定詞的精確語意，說明它與執行緒同步無關。',
    },
    {
      title: "What Every C Programmer Should Know About Undefined Behavior (LLVM Blog)",
      href: 'https://blog.llvm.org/2011/05/what-every-c-programmer-should-know.html',
      description: '解釋編譯器如何基於「假設無 UB」做激進最佳化，理解資料競爭後果的重要背景文章。',
    },
  ],
};

export default ind04DataRacesMemoryModel;
