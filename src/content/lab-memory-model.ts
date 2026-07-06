import type { ChapterContent } from '@/types/ChapterContent';

const labMemoryModel: ChapterContent = {
  slug: 'lab-memory-model',
  title: '實驗室：C++ 記憶體模型',
  group: '實驗室',
  description:
    'C++ 記憶體模型深入解析：happens-before 關係、acquire／release 與 seq_cst 語意、訊息傳遞與 store-buffer 範例，以及 memory_order 列舉對照表。',
  concept: {
    standard: 'C++11',
    body: 'C++ 記憶體模型定義了多執行緒下記憶體操作的可見性與排序。核心是 happens-before 關係：若操作 A happens-before B，則 A 的寫入對 B 可見。單一執行緒內以 sequenced-before 建立次序；跨執行緒則靠 atomic 的 release 與 acquire 配對產生 synchronises-with。memory_order_seq_cst 提供單一全域總次序，最直觀但成本最高；acquire／release 只保證配對點前後的排序；relaxed 僅保證原子性。理解這些語意才能寫出正確又高效的無鎖程式。',
  },
  code: {
    lang: 'cpp',
    code: `#include <atomic>
#include <cassert>
#include <thread>

std::atomic<bool> ready{false};  // [1]
int payload = 0;                 // plain, non-atomic data

void producer() {
    payload = 42;                                  // [2]
    ready.store(true, std::memory_order_release);  // [3]
}

void consumer() {
    while (!ready.load(std::memory_order_acquire))  // [4]
        ;                                           // spin until published
    assert(payload == 42);                          // [5] guaranteed to hold
}

int main() {
    std::thread t1{producer};
    std::thread t2{consumer};
    t1.join();
    t2.join();
    return 0;
}`,
    callouts: [
      { n: 1, text: 'ready 是原子旗標，作為資料是否「已發佈」的同步點。' },
      { n: 2, text: 'payload 是一般變數，其寫入必須在 release 之前完成（sequenced-before）。' },
      { n: 3, text: 'release 儲存確保先前所有寫入不會被重排到它之後。' },
      {
        n: 4,
        text: 'acquire 載入確保後續讀取不會被重排到它之前，與 release 配對形成 synchronises-with。',
      },
      { n: 5, text: '由於 release／acquire 建立 happens-before，consumer 讀到 payload 必為 42。' },
    ],
  },
  deepDive: [
    {
      heading: 'happens-before 是如何被建立的',
      body: '單一執行緒內以 sequenced-before 排序；跨執行緒則靠一個 `release` 寫入與讀到該值的 `acquire` 讀取形成 synchronizes-with，兩者再經遞移性組成 happens-before。若 A happens-before B，A 的所有寫入對 B 可見。\n\n沒有這條鏈，非原子資料的讀寫就是資料競爭（UB）。因此無鎖程式的正確性，本質是「用 atomic 建立足夠的 happens-before 邊」。',
    },
    {
      heading: '記憶體順序光譜',
      body: '`seq_cst` 提供單一全域總次序，最直觀；`release`／`acquire` 只約束配對點前後；`relaxed` 僅保證原子性與修改順序（modification order），適合純計數。`std::atomic_thread_fence` 可在不綁定特定變數下建立柵欄。\n\n典型範式：以 `release` 發佈資料指標、以 `acquire` 讀取後安全解參考（message passing）。`consume` 語意難以正確實作，實務上已不建議使用。',
    },
    {
      heading: '硬體模型與驗證',
      body: 'x86 屬強順序（TSO），許多缺少同步的程式碼「碰巧」正確；ARM／POWER 為弱順序，同樣程式碼會出錯。因此「在我的 x86 上沒問題」不代表可攜正確。\n\n應以 ThreadSanitizer 驗證，並盡量在弱順序硬體上測試。`std::atomic_ref`（C++20）可對非原子物件施加原子操作，方便對既有資料結構加上同步。',
    },
  ],
  pitfalls: [
    '以直覺推理 `relaxed`，卻忽略缺乏 happens-before 導致的可見性問題。',
    '假設全平台都是 x86 的強順序，程式在 ARM／POWER 上出錯。',
    '混用非原子讀寫與原子操作於同一資料，構成資料競爭（UB）。',
    '使用已不建議的 `memory_order_consume`，難以正確實作。',
  ],
  bestPractices: [
    '從 `seq_cst` 起步，僅在有量測依據時放寬順序。',
    '以 `release`／`acquire` 正確配對建立 happens-before。',
    '以 TSan 驗證，並盡量在弱順序硬體上測試。',
    '為同步意圖撰寫註解，說明每個記憶體順序的理由。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '在 release／acquire 配對中，release 儲存提供什麼保證？',
      options: [
        { id: 'a', text: '先前的所有寫入不會被重排到 release 之後' },
        { id: 'b', text: '後續的所有讀取不會被重排到它之前' },
        { id: 'c', text: '建立單一全域總次序' },
        { id: 'd', text: '完全不提供任何排序保證' },
      ],
      correctOptionId: 'a',
      explanation:
        'release 是「發佈」語意：它之前的寫入都對配對的 acquire 可見；acquire 才負責防止後續讀取上移。參見 Ch.22 PDF 第 66 頁。',
    },
    {
      id: 'q2',
      stem: 'memory_order_seq_cst 相較於 acquire／release 的主要差異是？',
      options: [
        { id: 'a', text: '它比較快但比較不安全' },
        { id: 'b', text: '它為所有 seq_cst 操作建立單一全域總次序' },
        { id: 'c', text: '它只保證原子性、不保證排序' },
        { id: 'd', text: '它只能用於載入、不能用於儲存' },
      ],
      correctOptionId: 'b',
      explanation:
        'seq_cst 讓所有以此順序執行的操作有一致的全域總次序，最直觀但同步成本最高。參見 Ch.22 PDF 第 70 頁。',
    },
    {
      id: 'q3',
      stem: '若把範例中的 release／acquire 全部改為 memory_order_relaxed，會發生什麼？',
      options: [
        { id: 'a', text: '行為完全相同' },
        { id: 'b', text: 'consumer 可能讀到尚未更新的 payload（斷言可能失敗）' },
        { id: 'c', text: '程式無法編譯' },
        { id: 'd', text: '會自動升級為 seq_cst' },
      ],
      correctOptionId: 'b',
      explanation:
        'relaxed 只保證原子性、不建立跨變數的 happens-before，因此 payload 的可見性不再受保證。參見 Ch.22 PDF 第 63 頁。',
    },
  ],
  diagram: {
    key: 'happens-before',
    caption:
      'happens-before 圖：執行緒內的 sequenced-before 邊（藍）與跨執行緒的 synchronises-with 邊（紅），共同保證 Reader 觀察到 data == 42。',
  },
  tryIt: {
    code: `#include <atomic>
#include <cassert>
#include <thread>

// Message-passing pattern with acquire/release. Try changing both orders to
// std::memory_order_relaxed and reason about why the assertion may break.
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
        assert(payload == 42);
    });
    producer.join();
    consumer.join();
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Memory order - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/atomic/memory_order',
      description: 'memory_order 列舉與各語意的完整對照與範例。',
    },
    {
      title: 'std::atomic - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/atomic/atomic',
      description: '原子型別的操作介面與記憶體順序參數說明。',
    },
    {
      title: 'P0668R5: Revising the C++ memory model',
      href: 'https://wg21.link/P0668',
      description: '修訂 C++ 記憶體模型（特別是 seq_cst 語意）的 ISO 提案。',
    },
    {
      title: 'atomic Weapons (Herb Sutter)',
      href: 'https://herbsutter.com/2013/02/11/atomic-weapons-the-c-memory-model-and-modern-hardware/',
      description: 'Herb Sutter 對記憶體模型與硬體的經典兩集演講整理。',
    },
    {
      title: 'Modern C++ Programming — Advanced Topics II (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/22.Advanced_topics_II.html',
      description: 'Busato 第 22 章投影片中的 atomic 與記憶體順序章節。',
    },
  ],
};

export default labMemoryModel;
