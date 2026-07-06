import type { ChapterContent } from '@/types/ChapterContent';

const ind05AtomicsMemoryOrder: ChapterContent = {
  slug: 'ind05-atomics-memory-order',
  chapterLabel: '第 5 章',
  title: 'std::atomic 與記憶體序',
  group: 'I · 第一部：C++ 記憶體模型與原子操作',
  description:
    'memory_order 全譜：relaxed／acquire／release／acq_rel／seq_cst，release-acquire 配對、std::atomic_ref 與 CAS。',
  concept: {
    standard: 'C++20',
    body:
      'std::atomic（C++11）提供不需鎖即可安全存取共享變數的操作，但「原子性」與「順序性」是兩件事：每個原子操作都會搭配一個 std::memory_order，決定它與其他記憶體存取之間的排序關係。relaxed 只保證該原子變數本身不會撕裂讀寫，不保證與其他記憶體操作的先後次序；acquire／release 建立「發佈-取用」式的單向柵欄，用於一個執行緒發佈資料、另一個執行緒取用資料的配對場景；acq_rel 同時具備兩者，用於既讀又寫的 RMW 操作；seq_cst 是預設值，額外提供全域一致的總次序，最直觀但成本最高。C++20 加入 std::atomic_ref，讓既有記憶體（例如一般陣列的元素）也能被當作原子物件操作，對數值核心（平行歸約、直方圖）極為重要。CAS（compare_exchange_weak／_strong）是建構無鎖演算法的核心原語，但需留意 ABA 問題。',
  },
  deepDive: [
    {
      heading: 'memory_order 全譜：從 relaxed 到 seq_cst',
      body:
        '`memory_order_relaxed` 只保證對「同一個原子變數」的操作具備原子性與 modification order（所有執行緒看到的修改順序一致），完全不限制它與其他變數讀寫的重排序。適用場景：純計數器、統計數字、參考計數的遞增遞減——你只在乎最終值正確，不在乎它與其他資料的先後關係。\n\n`memory_order_acquire` 用在 load：保證此 load 之後、在同一執行緒中的所有記憶體操作，都不會被重排到這個 load 之前。`memory_order_release` 用在 store：保證此 store 之前的所有記憶體操作，都不會被重排到這個 store 之後。兩者搭配使用時稱為 release-acquire pairing，用於「一個執行緒發佈（publish）資料指標或旗標，另一個執行緒讀到後取用（consume）該資料」的情境，例如透過 atomic 旗標交棒一塊已初始化好的緩衝區。\n\n`memory_order_acq_rel` 同時具備 acquire 與 release 語意，用在既讀又寫的 read-modify-write 操作（如 fetch_add、compare_exchange）——這類操作往往一邊消費先前執行緒發佈的狀態，一邊又要發佈自己造成的新狀態，因此需要雙向柵欄。\n\n`memory_order_seq_cst` 是所有原子操作的預設值，除了 acquire/release 語意外，還額外保證所有執行緒觀察到「全域唯一的一套操作總次序」，最符合直覺、最不容易出錯，但在多核心、尤其跨 NUMA 節點時成本最高（需要較重的記憶體柵欄指令）。實務準則：先以 seq_cst 寫出正確版本，再以效能剖析找出熱點，僅在確實理解語意、且能證明正確性的地方放寬到 acquire/release 或 relaxed。',
    },
    {
      heading: 'release-acquire 配對：建立 happens-before',
      body:
        '單獨一個 release 或一個 acquire 沒有意義，兩者必須「配對」在同一個原子變數上，才會在兩個執行緒之間建立 happens-before 關係。經典範例：生產者執行緒先把資料寫入一塊緩衝區（一般的、非原子的記憶體），再對一個 `std::atomic<bool> ready` 執行 `ready.store(true, std::memory_order_release)`；消費者執行緒在一個迴圈中 `while (!ready.load(std::memory_order_acquire)) { }`，讀到 true 之後才去讀取那塊緩衝區。\n\n這裡的保證是：release 之前的所有寫入（緩衝區內容），對於執行了配對 acquire 且讀到該值（或其後的值）的執行緒而言，一定是可見的、且不會被重排序到 acquire 之後才「看起來完成」。如果生產者用 relaxed store、消費者用 relaxed load，即使旗標本身的值正確傳遞，緩衝區內容仍可能對消費者不可見或被重排，造成資料競爭式的未定義行為。\n\n注意 release-acquire 只保證「配對雙方之間」的排序，不像 seq_cst 具備全域總次序；如果第三個執行緒同時觀察兩個獨立的 release-acquire 配對，它看到的相對順序可能不一致（IRIW 問題），這種情況才需要 seq_cst。',
    },
    {
      heading: 'std::atomic_ref：對既有陣列元素做原子操作',
      body:
        '在數值核心中，常見模式是多個執行緒平行歸約進同一塊共享陣列（例如直方圖分桶、稀疏矩陣累加、圖演算法中對鄰接頂點的度數累加）。若把整個陣列宣告成 `std::atomic<T>` 陣列，會破壞資料的連續記憶體佈局、無法與既有的、以一般 `T*` 撰寫的 BLAS／SIMD 程式碼相容，也會讓陣列失去可平凡複製（trivially copyable）等屬性。\n\nC++20 的 `std::atomic_ref<T>` 解決了這個問題：它是一個輕量的「原子視圖」，包裹一個既有物件的參照，讓你可以對它做原子讀寫、fetch_add、CAS 等操作，而底層記憶體仍然是一個普通的 `T`（例如 `double arr[N]`）。多個 `atomic_ref` 可以同時指向陣列中不同的元素，彼此互不影響；只要求同一個位址在其生命週期內，「只」透過 atomic_ref 存取（不可與非原子存取混用），且該位址需滿足對齊要求（`atomic_ref<T>::required_alignment`）。\n\n典型用法：平行迴圈把貢獻值以 `std::atomic_ref<double>(arr[bucket]).fetch_add(value, std::memory_order_relaxed)` 累加進共享陣列，相比每個元素各自加鎖，或整段陣列包成 `atomic<T>`，這是既保留記憶體佈局相容性、又能安全平行寫入的折衷做法。',
    },
    {
      heading: 'compare_exchange_weak 與 _strong：CAS 與 ABA 問題',
      body:
        'CAS（compare-and-swap）比較原子變數目前值與期望值（expected），相符則寫入新值並回傳 true；不符則把 expected 更新為目前值並回傳 false。`compare_exchange_weak` 在某些架構（如 ARM 的 LL/SC，load-linked/store-conditional）上允許「偽失敗」（spurious failure）：即使值真的相符，也可能因為快取線被其他事件打斷而回傳 false。因此 weak 版本必須放在重試迴圈中使用，換取比 strong 更低的平均成本；`compare_exchange_strong` 保證不偽失敗，只在值真的不符時才失敗，適合單次判斷（例如「只初始化一次」的雙重檢查場景）而非迴圈重試。\n\nABA 問題：CAS 只比較「值是否相等」，無法偵測「值在期間曾經改變過又變回來」。典型場景是無鎖堆疊的 pop：執行緒 T1 讀到 head 指向節點 A，正準備以 CAS 把 head 換成 A->next；此時被搶佔，執行緒 T2 把 A 彈出、釋放、又剛好配置了一塊記憶體重新用作節點（位址恰好等於 A）並 push 回堆疊。T1 恢復執行時，CAS 看到 head 仍等於 A（位址相同），誤判「期間沒有變化」而成功寫入，但 A->next 早已是無效或錯誤的指標，導致堆疊結構毀損。\n\n常見解法：為指標附加版本號（tagged pointer / 128-bit 雙字 CAS），使 CAS 同時比較「位址與版本」；或改用 hazard pointers、epoch-based reclamation 等安全記憶體回收機制，確保節點在仍被引用時不會被釋放、更不會被重新配置成相同位址。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <atomic>
#include <thread>
#include <vector>

// 平行直方圖：多執行緒對共享陣列的桶（bucket）做原子累加。 [1]
constexpr int kNumBuckets = 16;

void accumulateHistogram(const int* data, int begin, int end,
                         long long* histogram) {  // [2]
    for (int i = begin; i < end; ++i) {
        int bucket = data[i] % kNumBuckets;
        // 用 atomic_ref 包裹既有的 long long 元素，陣列本身仍是普通記憶體。 [3]
        std::atomic_ref<long long> slot(histogram[bucket]);
        slot.fetch_add(1, std::memory_order_relaxed);  // [4] 純計數，不需跨變數排序
    }
}

int main() {
    constexpr int kN = 1'000'000;
    std::vector<int> data(kN);
    for (int i = 0; i < kN; ++i) data[i] = i * 7 + 3;

    long long histogram[kNumBuckets] = {};  // [5] 一般陣列，非 atomic<long long>[]

    constexpr int kThreads = 4;
    std::vector<std::thread> pool;
    for (int t = 0; t < kThreads; ++t) {
        int begin = t * (kN / kThreads);
        int end = (t + 1) * (kN / kThreads);
        pool.emplace_back(accumulateHistogram, data.data(), begin, end, histogram);
    }
    for (auto& th : pool) th.join();  // [6] join 之後才能安全讀取 histogram

    long long total = 0;
    for (int b = 0; b < kNumBuckets; ++b) total += histogram[b];
    return total == kN ? 0 : 1;
}`,
    callouts: [
      { n: 1, text: '多執行緒對同一塊共享陣列做歸約累加，是數值核心中常見的平行模式。' },
      { n: 2, text: 'histogram 以普通 long long* 傳遞，保持與既有數值程式碼相容的記憶體佈局。' },
      { n: 3, text: 'std::atomic_ref 是包裹既有記憶體的「原子視圖」，不需把整個陣列宣告成 atomic 型別。' },
      { n: 4, text: 'fetch_add 用 memory_order_relaxed：每個 bucket 只是獨立計數，不需要與其他資料排序。' },
      { n: 5, text: '陣列本身仍是普通、可平凡複製的記憶體，可與 SIMD／既有函式庫互通。' },
      { n: 6, text: 'join 建立了執行緒之間的同步點，之後主執行緒讀取 histogram 保證看到所有累加結果。' },
    ],
  },
  pitfalls: [
    '所有原子操作一律用預設的 seq_cst，在高頻路徑上白白付出不必要的記憶體柵欄成本。',
    '誤以為 memory_order_relaxed 「不安全」而完全不用；relaxed 只是不排序其他變數，該原子變數本身仍是原子且無資料競爭。',
    '只在一邊用 release、另一邊仍用 relaxed 甚至一般讀取，導致 release-acquire 配對沒有真正建立，資料仍可能不可見或被重排。',
    '用 std::atomic_ref 時忽略對齊要求（required_alignment），或讓一般存取與 atomic_ref 存取混用同一塊記憶體。',
    '自行以 CAS 實作無鎖結構卻忽略 ABA 問題，未加版本標記或安全回收機制。',
  ],
  bestPractices: [
    '先以 seq_cst 寫出正確版本，再以效能剖析找出瓶頸，才有依據地放寬到 acquire/release 或 relaxed。',
    'release 與 acquire 必須成對出現在同一個原子變數上，且雙方都要用對稱的順序，才具備 happens-before 保證。',
    '平行歸約進共享陣列時優先用 std::atomic_ref，保留原始記憶體佈局與既有程式碼相容性。',
    '重試迴圈用 compare_exchange_weak；一次性判斷（如雙重檢查鎖定）用 compare_exchange_strong。',
    '涉及節點回收的無鎖結構務必處理 ABA（版本標記或 hazard pointers），並以 ThreadSanitizer 驗證。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '生產者以 release store 發佈一個旗標，消費者要正確讀到旗標之前寫入的資料，消費者的 load 應該用哪種 memory_order？',
      options: [
        { id: 'a', text: 'memory_order_relaxed，因為旗標本身已經是 atomic' },
        { id: 'b', text: 'memory_order_acquire，與生產者的 release 配對建立 happens-before' },
        { id: 'c', text: '任何順序都可以，因為 atomic 一定看得到最新值' },
        { id: 'd', text: 'memory_order_consume，這是唯一正確的選擇' },
      ],
      correctOptionId: 'b',
      explanation:
        'release 與 acquire 必須成對出現在同一個原子變數上才會建立 happens-before；若消費者用 relaxed，即使讀到旗標為 true，release 之前寫入的資料仍可能對它不可見。',
    },
    {
      id: 'q2',
      stem: '為什麼在平行歸約進共享陣列時，通常偏好 std::atomic_ref 而非把整個陣列宣告成 std::atomic<T>[]？',
      options: [
        { id: 'a', text: 'std::atomic_ref 完全不需要任何同步保證' },
        { id: 'b', text: 'std::atomic<T> 陣列無法編譯，語法不合法' },
        { id: 'c', text: 'atomic_ref 讓陣列保持一般記憶體佈局，與既有非原子程式碼（如 SIMD、BLAS）相容，只在需要時對個別元素做原子存取' },
        { id: 'd', text: 'atomic_ref 比 atomic<T> 陣列消耗更多記憶體' },
      ],
      correctOptionId: 'c',
      explanation:
        '把整個陣列包成 atomic<T> 會破壞其可平凡複製、與既有以 T* 撰寫程式碼相容的性質；atomic_ref 只是包裹既有記憶體的原子視圖，底層仍是普通陣列。',
    },
    {
      id: 'q3',
      stem: '在無鎖堆疊的 CAS pop 操作中，ABA 問題具體是指什麼情況？',
      options: [
        { id: 'a', text: 'CAS 因為偽失敗而重試了兩次' },
        { id: 'b', text: '節點 A 被彈出並釋放後，另一次配置又剛好在相同位址建立新節點，使 CAS 誤判「值沒變」而寫入已失效的內部狀態' },
        { id: 'c', text: '兩個執行緒同時呼叫 push，造成節點遺失' },
        { id: 'd', text: 'compare_exchange_strong 回傳了錯誤的布林值' },
      ],
      correctOptionId: 'b',
      explanation:
        'CAS 只比較目前值是否等於期望值；若值經歷 A→B→A 的變化，CAS 會誤以為期間沒有任何變動而成功寫入，但實際上底層結構可能已改變，需以版本標記或安全記憶體回收（hazard pointers 等）避免。',
    },
  ],
  diagram: {
    key: 'happens-before',
    caption:
      '本章聚焦 release-acquire 配對：生產者的 release store 與消費者的 acquire load 在同一個原子變數上配對，才會在兩條時間軸之間畫出一條 happens-before 箭頭，使 release 之前的所有寫入對 acquire 之後的讀取可見。',
  },
  tryIt: {
    code: `#include <atomic>
#include <iostream>
#include <thread>

int shared_data = 0;
std::atomic<bool> ready{false};

void producer() {
    shared_data = 42;                              // 一般（非原子）寫入
    ready.store(true, std::memory_order_release);  // 發佈
}

void consumer() {
    while (!ready.load(std::memory_order_acquire)) {
        // 忙等直到旗標被設定
    }
    // release-acquire 配對保證這裡一定看得到 shared_data == 42
    std::cout << "shared_data = " << shared_data << '\\n';
}

int main() {
    std::thread p(producer);
    std::thread c(consumer);
    p.join();
    c.join();
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::memory_order - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/atomic/memory_order',
      description: 'relaxed／acquire／release／acq_rel／seq_cst 各順序的完整定義與範例。',
    },
    {
      title: 'std::atomic_ref - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/atomic/atomic_ref',
      description: 'C++20 atomic_ref 的建構條件、對齊要求與可用操作。',
    },
    {
      title: 'std::atomic<T>::compare_exchange - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/atomic/atomic/compare_exchange',
      description: 'compare_exchange_weak 與 _strong 的語意差異、偽失敗與記憶體順序參數。',
    },
    {
      title: 'The C++ Memory Model (Rainer Grimm)',
      href: 'https://www.modernescpp.com/index.php/c-memory-model/',
      description: '對 happens-before、release-acquire 與各種記憶體順序的系列深入解說。',
    },
  ],
};

export default ind05AtomicsMemoryOrder;
