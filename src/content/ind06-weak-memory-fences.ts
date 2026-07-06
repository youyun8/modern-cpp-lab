import type { ChapterContent } from '@/types/ChapterContent';

const ind06WeakMemoryFences: ChapterContent = {
  slug: 'ind06-weak-memory-fences',
  chapterLabel: '第 35 章',
  title: '進階記憶體序與弱記憶體',
  group: '第 9 部：C++ 記憶體模型與原子操作',
  description:
    'seq_cst 的全域總序成本、atomic_thread_fence、consume 的歷史，以及 litmus tests 建立的弱記憶體直覺。',
  concept: {
    standard: 'C++11',
    body: 'C++ 記憶體模型允許編譯器與硬體在不違反單執行緒語意（as-if 規則）的前提下重排記憶體存取。多核硬體本身也有各自的重排規則：x86/x64 是「強序」（TSO，total store order），大部分重排已由硬體限制；ARM、POWER 則是「弱序」，允許 store-store、load-load 等更大幅度的重排，只有明確的同步指令才能建立跨執行緒可見的順序。memory_order_seq_cst 是最強、也是預設的順序，它保證所有 seq_cst 操作存在一個所有執行緒都同意的「全域總序」，直覺但代價高——在弱序硬體上編譯器必須插入額外的完整記憶體屏障才能模擬這個總序。理解 seq_cst 的成本、fence 與 per-operation 順序的差異、以及 litmus test 呈現的弱記憶體現象，是寫出跨平台正確 lock-free 程式碼的必要基礎。',
  },
  deepDive: [
    {
      heading: 'seq_cst 的全域總序與其成本',
      body: 'memory_order_seq_cst 承諾兩件事：第一，它具備 acquire（讀）與 release（寫）的所有保證；第二，所有標記為 seq_cst 的操作，在所有執行緒眼中會呈現「同一個」全域總序（single total order），任何執行緒都不會觀察到與這個總序矛盾的結果。這比單純的 release-acquire 配對更強——release-acquire 只保證「配對的兩個執行緒」之間的順序，seq_cst 則保證「所有參與的執行緒」對順序達成共識。\n\n在 x86 上，由於硬體本身已是 TSO（除了 store 之後緊接 load 會被重排，其餘都保序），實作 seq_cst store 只需在 store 後加一個 `mfence`（或用 `lock xchg` 取代 store），load 幾乎零成本。但在 ARM64 或 POWER 這類弱序架構上，seq_cst store 與 load 都可能需要插入 `dmb`（data memory barrier）等完整屏障指令，成本明顯高於 acquire/release。這也是為什麼效能敏感的 lock-free 程式碼會刻意把 seq_cst 降級為 acquire/release 或 relaxed——但降級必須有 litmus test 等級的推理保證正確性，不能只憑直覺。',
    },
    {
      heading: 'atomic_thread_fence：獨立的記憶體屏障',
      body: '`std::atomic_thread_fence(order)` 是一個不依附任何特定原子變數的獨立同步點，語意上對「fence 之前」與「fence 之後」的記憶體存取施加順序限制，但這個順序限制只在與另一個執行緒的 fence 或 atomic 操作「配對」時才產生跨執行緒可見的效果。相對地，`atomic<T>::load(order)` / `store(order)` 的 memory_order 是綁在那一次原子存取上的——release store 只保護「這次 store 之前」的寫入，acquire load 只保護「這次 load 之後」的讀取。\n\n獨立 fence 的用途：當你要用同一個 release fence 保護一整批對「非原子變數」的寫入，卻只想在最後用一次輕量的 relaxed atomic store 來發布旗標，就可以寫成 `atomic_thread_fence(release); flag.store(1, relaxed)`，效果等同於把 release 直接放在 store 上，但當有多個 store 需要同一個屏障保護時可以減少重複標記。實務上，除非你在寫底層的無鎖資料結構或需要跟不支援 atomic 型別的舊介面（如 mmap 出的裝置記憶體）互動，一般建議優先用 per-operation 的 memory_order，因為它把同步意圖直接標在資料上，較不容易被後續重構破壞。',
    },
    {
      heading: 'memory_order_consume 的歷史與為何被勸退',
      body: 'memory_order_consume 原本設計來表達「dependency-ordering」：只有語意上依賴被讀取值的後續運算（透過指標解參考或算術運算鏈接）才需要同步，比 acquire 更精確、理論上在某些架構（如 DEC Alpha 之外的多數 CPU 本就不重排有資料依賴的存取）幾乎零額外成本。這對 RCU（read-copy-update）這類「發布指標、讀者追蹤依賴鏈」的模式極具吸引力。\n\n然而，「carries-a-dependency-to」這個依賴鏈在編譯器最佳化下極難正確追蹤——常數傳播、共同子表達式消除等最佳化都可能截斷依賴鏈，導致依賴鏈提前中斷卻沒有任何警告。結果是所有主流編譯器（GCC、Clang、MSVC）從未真正實作論文設計的依賴追蹤語意，而是直接把 memory_order_consume 當成 memory_order_acquire 處理——犧牲了理論上的效能優勢，換取正確性。C++17 的委員會文件（P0371）正式建議在標準修訂完成前避免使用 consume；實務建議是一律用 acquire 取代 consume，除非你正在追蹤標準委員會後續是否提出可行的替代方案（如 `[[carries_dependency]]` 屬性或全新提案）。',
    },
    {
      heading: 'Litmus tests：用最小案例建立弱記憶體直覺',
      body: 'Litmus test 是並行語意研究中最小化的程式片段，專門用來檢驗某個記憶體模型允許哪些結果，常搭配 CppMem（劍橋大學的線上 C/C++ 記憶體模型模擬器）逐一列舉所有允許的執行結果。三個經典案例：\n\nStore Buffering（SB）：兩個執行緒各自先寫自己的旗標，再讀對方的旗標——`T1: x.store(1, relaxed); r1 = y.load(relaxed);`、`T2: y.store(1, relaxed); r2 = x.load(relaxed);`。直覺上 r1 與 r2 不可能同時為 0，但在 relaxed 順序下，弱序硬體允許每個執行緒把自己的 store 暫存在 store buffer 裡尚未對外可見，因此兩個 load 都可能讀到舊值 0——`r1 == 0 && r2 == 0` 是合法結果。若把兩邊的操作都改成 seq_cst，全域總序保證會排除這個結果。\n\nMessage Passing（MP）：T1 寫入資料後以 release store 設定旗標，T2 以 acquire load 讀旗標、成立後讀資料——這是最常見的「資料 + 旗標」發布模式，release-acquire 配對足以保證正確性，不需要 seq_cst。但若旗標的 store/load 只用 relaxed，T2 就可能看到旗標已設定、資料卻還是舊值，這在 x86 上幾乎「測不出來」（因為硬體本身不太會重排 store-store），卻在 ARM 上是常見的真實錯誤。\n\nLoad Buffering（LB）：兩個執行緒互相讀取對方稍後才寫入的變數——`T1: r1 = y.load(relaxed); x.store(1, relaxed);`、`T2: r2 = x.load(relaxed); y.store(1, relaxed);`。弱序硬體與激進的編譯器重排都可能讓 `r1 == 1 && r2 == 1` 成立（兩個 load 都讀到「未來」才寫入的值），這在循序一致的直覺裡完全不可能，卻是被標準明確允許的合法弱記憶體結果，凸顯了 relaxed 原子操作幾乎不提供跨執行緒的順序保證，只保證單一變數自身的修改順序（modification order）。',
    },
    {
      heading: '跨平台移植：x86 上的僥倖與 ARM/POWER 上的崩潰',
      body: 'x86/x64 的 TSO 模型天生就「掩蓋」了許多 memory_order 標註不足的錯誤：漏寫 acquire/release、甚至整個用 relaxed 取代 release-acquire，在 x86 上經常因為硬體本身不太重排而「剛好能動」，通過所有測試、上線運行數月都沒問題。但同一份程式碼移植到 ARM 伺服器（如 AWS Graviton、Ampere Altra）或 POWER 架構時，弱序硬體會真的把重排的自由度用出來，於是同步失敗、資料損毀等問題才第一次顯現——而且往往是低機率、間歇性、難以重現的 heisenbug，因為重排是否發生取決於快取狀態、指令排程、負載等非決定性因素。\n\n這類移植問題的根源幾乎都一樣：程式碼隱含假設了「x86 式的強序」，卻沒有用正確的 memory_order 明確表達同步意圖。防禦手段是在設計階段就以 litmus test 等級的嚴謹度推理每一個 relaxed 用法，並在 CI 中同時對 x86 與 ARM（或至少用 QEMU 模擬、ThreadSanitizer、CppMem 等工具）跑測試，而不是只在單一架構上驗證過就視為正確。',
    },
    {
      heading: '概念性實驗：同一段 lock-free 程式碼在 x86 與 ARM 上的行為差異',
      body: '設想一個常見但錯誤的「雙旗標」同步：兩個執行緒各自用 relaxed store 設定自己的 ready 旗標，再用 relaxed load 檢查對方的旗標是否已設定，藉此判斷「雙方都準備好了」再繼續執行共享資料的存取。這正是前述的 Store Buffering litmus test。\n\n在 x86 上重複執行這段程式數百萬次，幾乎永遠得到「至少一方看到對方旗標已設定」的直覺結果，因為 x86 的 store buffer 通常很快就把值刷新到快取一致性網路，重排視窗極短、在單機測試中幾乎觀察不到異常。但在 ARM64（例如 Graviton3、Apple Silicon 的多核心配置）上重複同樣的測試，會有非零機率觀察到兩個執行緒同時判定「對方尚未準備好」（都讀到 0），因為 ARM 允許 store 停留在 store buffer 更久、且沒有硬體保證會在 load 之前刷新。修法很直接：把 relaxed 改成 seq_cst，或者用 release store + acquire load 搭配正確的資料相依方向重新設計協定；重點是，「在 x86 上測試通過」從來不是弱記憶體正確性的證明，只有 memory_order 的正式推理（或 litmus test／CppMem 等工具的窮舉驗證）才是。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <atomic>
#include <thread>

std::atomic<int> x{0};
std::atomic<int> y{0};
int r1 = 0, r2 = 0;

// Store Buffering litmus test: two threads each read the other's flag. [1]
void thread1() {
    x.store(1, std::memory_order_relaxed);                // [2]
    std::atomic_thread_fence(std::memory_order_seq_cst);  // [3]
    r1 = y.load(std::memory_order_relaxed);
}

void thread2() {
    y.store(1, std::memory_order_relaxed);                // [4]
    std::atomic_thread_fence(std::memory_order_seq_cst);  // [3]
    r2 = x.load(std::memory_order_relaxed);
}

int main() {
    std::thread t1(thread1);
    std::thread t2(thread2);
    t1.join();
    t2.join();

    // If the two fences at [3] are removed, on weakly ordered hardware
    // (ARM/POWER) r1 == 0 && r2 == 0 is a legal outcome -- both stores
    // may still be sitting in their store buffers, not yet visible
    // to the other thread. [5]
    // With the paired seq_cst fences, the global total order excludes
    // this outcome, making the program's behavior consistent across
    // all architectures. [6]
    return (r1 == 0 && r2 == 0) ? 1 : 0;
}`,
    callouts: [
      {
        n: 1,
        text: '這是經典的 Store Buffering（SB）litmus test：兩執行緒各自寫自己的旗標、讀對方的旗標。',
      },
      {
        n: 2,
        text: 'relaxed store 只保證這個變數自身的修改順序，不對其他變數的可見性做任何保證。',
      },
      {
        n: 3,
        text: '獨立的 atomic_thread_fence(seq_cst) 在 store 與 load 之間建立屏障，阻止兩者被重排到彼此之前，並讓所有執行緒對這個順序達成共識。',
      },
      { n: 4, text: 'thread2 對稱地寫自己的旗標，順序與 thread1 相同但變數互換。' },
      {
        n: 5,
        text: '若沒有 fence，弱序硬體允許兩個 store 都停留在各自的 store buffer 中，導致兩個 load 都讀到舊值 0——這在 x86 上罕見，在 ARM 上並不罕見。',
      },
      {
        n: 6,
        text: '加上成對的 seq_cst fence 後排除了 r1==0 && r2==0 這個結果，程式行為在 x86 與 ARM 上一致，代價是屏障帶來的效能開銷。',
      },
    ],
  },
  pitfalls: [
    '假設在 x86 上測試通過的 lock-free 程式碼可以直接搬到 ARM/POWER——弱序硬體會暴露 x86 掩蓋掉的重排問題。',
    '把 `atomic_thread_fence` 誤解為對「所有」原子變數都生效，實際上它只有在與其他執行緒的 fence 或 atomic 操作配對時才產生跨執行緒可見效果。',
    '為了追求理論效能而使用 `memory_order_consume`——所有主流編譯器都把它退化為 `acquire` 實作，得不到承諾的優勢，卻承擔了語意上的認知負擔。',
    '把 relaxed 原子操作當成「輕量版」的同步原語使用，卻沒有意識到 relaxed 對跨變數的可見順序完全不提供保證（見 Store Buffering、Load Buffering litmus test）。',
    '全面套用 `seq_cst` 而不評估成本，在弱序架構上為每個原子操作都付出額外屏障開銷，卻未必需要那麼強的順序保證。',
  ],
  bestPractices: [
    '對效能關鍵的同步協定，先用 litmus test 或 CppMem 窮舉驗證正確性，再決定能否把 seq_cst 降級為 acquire/release 或 relaxed。',
    '一律用 acquire 取代 memory_order_consume，除非有明確理由並清楚了解目前編譯器的實作限制。',
    '需要跨多個非原子寫入共用同一個同步邊界時，才使用獨立的 `atomic_thread_fence`；否則優先用綁在單一原子操作上的 memory_order，同步意圖更貼近資料本身。',
    '在 CI 中對 ARM（或用 QEMU／模擬器）與 x86 都跑相同的並行測試，並搭配 ThreadSanitizer，不要只信任單一架構的測試結果。',
    '記錄每一處使用非 seq_cst 順序的原因與對應的 litmus test 推理，方便未來重構者驗證假設仍然成立。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '為什麼在 x86 上「看似正確」的 relaxed 同步程式碼，搬到 ARM 上可能會出錯？',
      options: [
        { id: 'a', text: 'ARM 不支援 std::atomic' },
        {
          id: 'b',
          text: 'x86 是強序（TSO）架構，硬體本身限制了重排；ARM 是弱序架構，允許更大幅度的 store/load 重排',
        },
        { id: 'c', text: 'ARM 的原子操作預設就是 relaxed，無法改成其他順序' },
        { id: 'd', text: 'x86 的編譯器會自動修正記憶體序錯誤' },
      ],
      correctOptionId: 'b',
      explanation:
        'x86 的 TSO 模型讓多數重排在硬體層級就不會發生，掩蓋了 memory_order 標註不足的問題；ARM/POWER 等弱序架構會真的利用重排空間，讓潛在錯誤浮現。',
    },
    {
      id: 'q2',
      stem: 'Store Buffering litmus test（兩執行緒各自寫自己的旗標、relaxed 讀對方旗標）允許哪個結果？',
      options: [
        { id: 'a', text: '兩個 load 永遠不可能同時讀到 0' },
        {
          id: 'b',
          text: '在 relaxed 順序下，兩個 load 可以同時讀到 0（各自的 store 仍停留在 store buffer 中）',
        },
        { id: 'c', text: '程式一定會死鎖' },
        { id: 'd', text: '這與記憶體順序無關，只取決於執行緒排程' },
      ],
      correctOptionId: 'b',
      explanation:
        '在 relaxed 記憶體序下，每個執行緒的 store 可能暫存在 store buffer 中尚未對其他執行緒可見，因此兩個 load 都讀到舊值 0 是合法結果；改用 seq_cst 或加上成對 fence 可以排除這個結果。',
    },
    {
      id: 'q3',
      stem: '為什麼主流編譯器建議避免使用 memory_order_consume？',
      options: [
        { id: 'a', text: '因為它比 seq_cst 慢很多' },
        {
          id: 'b',
          text: '因為依賴鏈（carries-a-dependency-to）在最佳化過程中極難正確追蹤，所有主流編譯器都直接把它實作成 acquire，得不到理論上的效能優勢',
        },
        { id: 'c', text: '因為 consume 只能用在 32 位元系統' },
        { id: 'd', text: '因為 consume 已經從 C++ 標準中移除' },
      ],
      correctOptionId: 'b',
      explanation:
        'consume 的依賴追蹤語意在常數傳播、共同子表達式消除等最佳化下難以保持正確，因此 GCC/Clang/MSVC 都把它退化為 acquire；標準委員會在 P0371 中建議在有更好方案前避免使用。',
    },
  ],
  diagram: {
    key: 'happens-before',
    caption:
      'Store Buffering litmus test：沒有 fence 時兩個 relaxed store 可能都留在各自的 store buffer 裡，讓兩個 load 都讀到舊值；加上成對的 seq_cst fence 後，全域總序排除了這個弱記憶體結果。',
  },
  tryIt: {
    code: `#include <atomic>
#include <cstdio>
#include <thread>

std::atomic<int> x{0};
std::atomic<int> y{0};
int r1 = 0, r2 = 0;

void thread1() {
    x.store(1, std::memory_order_relaxed);
    r1 = y.load(std::memory_order_relaxed);
}

void thread2() {
    y.store(1, std::memory_order_relaxed);
    r2 = x.load(std::memory_order_relaxed);
}

int main() {
    std::thread t1(thread1);
    std::thread t2(thread2);
    t1.join();
    t2.join();

    // On strongly ordered x86, you'll almost always see at least one
    // of r1 or r2 equal to 1; on weakly ordered hardware, running this
    // enough times can legally produce r1 == 0 && r2 == 0.
    std::printf("r1=%d r2=%d\\n", r1, r2);
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::atomic_thread_fence - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/atomic/atomic_thread_fence',
      description: '獨立記憶體屏障的正式語意與 fence-fence、fence-atomic 同步規則。',
    },
    {
      title: 'std::memory_order - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/atomic/memory_order',
      description:
        '完整列出 relaxed／consume／acquire／release／acq_rel／seq_cst 的正式定義，含 consume 目前實作狀態的說明。',
    },
    {
      title: 'CppMem: Interactive C/C++ Memory Model',
      href: 'https://www.cl.cam.ac.uk/~pes20/cppmem/',
      description:
        '劍橋大學開發的線上工具，可窮舉列出 litmus test 在 C++ 記憶體模型下所有允許的執行結果。',
    },
    {
      title: 'Mathematizing C++ Concurrency (Batty et al., POPL 2011)',
      href: 'https://www.cl.cam.ac.uk/~pes20/cpp/popl085ap-sewell.pdf',
      description: 'C++11 記憶體模型形式化的原始論文，CppMem 工具即以此模型為基礎。',
    },
    {
      title: 'Arm Architecture Reference Manual — Memory model',
      href: 'https://developer.arm.com/documentation/ddi0487/latest/',
      description: 'ARM 官方架構手冊中關於弱記憶體排序與屏障指令（dmb/dsb/isb）的完整規範。',
    },
  ],
};

export default ind06WeakMemoryFences;
