import type { ChapterContent } from '@/types/ChapterContent';

const labLockFree: ChapterContent = {
  slug: 'lab-lock-free',
  title: '平行化實驗室：無鎖資料結構',
  group: '平行化實驗室',
  description:
    '無鎖資料結構：ABA 問題、hazard pointers、compare_exchange_weak 與 _strong 的差異，以及標註的 MPSC 佇列。',
  concept: {
    standard: 'C++20',
    body:
      '無鎖（lock-free）資料結構以原子操作而非互斥鎖來協調並行，避免鎖競爭、優先反轉與死鎖，並保證至少有一個執行緒能持續前進。核心原語是 compare-and-swap（CAS）：std::atomic 的 compare_exchange，它比較目前值與期望值，相符才寫入。compare_exchange_weak 允許偽失敗（spurious failure），在迴圈重試中通常較快；compare_exchange_strong 保證不偽失敗，適合單次判斷。無鎖設計的兩大陷阱是 ABA 問題（值由 A 變 B 又變回 A，使 CAS 誤判無變化）與安全記憶體回收（別的執行緒可能仍在存取即將釋放的節點）；常見解法是加上版本標記（tagged pointer）或 hazard pointers。設計無鎖結構極易出錯，務必以 TSan 驗證並偏好經同儕審查的既有實作。',
  },
  code: {
    lang: 'cpp',
    code: `#include <atomic>

// 無鎖堆疊的 push：以 CAS 迴圈把新節點接到頭部。 [1]
template <typename T>
class LockFreeStack {
    struct Node {
        T value;
        Node* next;
    };
    std::atomic<Node*> head_{nullptr};

public:
    void push(T value) {
        Node* node = new Node{value, head_.load(std::memory_order_relaxed)};  // [2]
        while (!head_.compare_exchange_weak(                                  // [3]
            node->next, node,
            std::memory_order_release,     // [4] 成功：release 發佈
            std::memory_order_relaxed)) {  // 失敗：relaxed 重讀
            // node->next 已被更新為最新 head_，直接重試即可。 [5]
        }
    }
};`,
    callouts: [
      { n: 1, text: 'push 不用鎖，而是反覆嘗試以 CAS 把新節點的 next 指向目前頭部並更新頭部。' },
      { n: 2, text: '先讀取目前 head_ 作為新節點的 next；relaxed 即可，因為真正的同步發生在成功的 CAS。' },
      { n: 3, text: 'compare_exchange_weak 允許偽失敗，在重試迴圈中通常比 strong 版本更有效率。' },
      { n: 4, text: '成功時以 memory_order_release 發佈，確保節點的初始化對後續 acquire 的取用者可見。' },
      { n: 5, text: 'CAS 失敗時會把 node->next 自動更新為最新的 head_，因此迴圈可直接重試，無需手動重讀。' },
    ],
  },
  deepDive: [
    {
      heading: '前進保證：wait-free、lock-free、obstruction-free',
      body:
        '這是一個強度光譜：wait-free 保證每個執行緒在有限步驟內完成；lock-free 保證系統整體持續前進（至少一個執行緒推進）；obstruction-free 只在無競爭時保證前進。多數實用的無鎖結構是 lock-free。\n\n無鎖的價值在於避免鎖競爭、優先反轉與死鎖，並在高競爭或即時場景提供更可預測的延遲——但它不必然比良好的鎖更快。',
    },
    {
      heading: '安全記憶體回收',
      body:
        '無鎖結構最難的部分不是 CAS，而是回收：當你把節點從結構移除時，別的執行緒可能仍持有指向它的指標。直接 `delete` 會造成釋放後使用。\n\n解法包括 hazard pointers（執行緒標記正在存取的節點，回收端據此延後釋放）、epoch-based reclamation／RCU，以及 `std::atomic<std::shared_ptr>`（C++20）。每種都在複雜度與效能間取捨。',
    },
    {
      heading: 'CAS 迴圈、ABA 與競爭',
      body:
        '`compare_exchange_weak` 允許偽失敗，在重試迴圈中通常較快；`_strong` 用於單次判斷。高競爭下 CAS 反覆失敗會浪費 CPU，可加入指數退避（backoff）。\n\nABA 問題（值 A→B→A 使 CAS 誤判）可用帶版本的標記指標（tagged pointer）或前述回收機制解決。這些細節極易出錯，是自行實作無鎖結構風險高的原因。',
    },
  ],
  pitfalls: [
    'ABA 問題：CAS 只看值相等，忽略了期間的結構變化。',
    '直接釋放被移除的節點，別的執行緒仍在存取而釋放後使用。',
    '高競爭下 CAS 迴圈反覆失敗形成 livelock 或空轉浪費。',
    '假設無鎖一定比互斥鎖快——在低競爭下未必成立。',
  ],
  bestPractices: [
    '優先採用經同儕審查的函式庫（folly、boost.lockfree），少自行實作。',
    '搭配 hazard pointers 或 epoch-based reclamation 安全回收記憶體。',
    '以 ThreadSanitizer 驗證，並與互斥鎖版本做基準比較。',
    '重試迴圈用 `compare_exchange_weak` 並在高競爭時加入退避。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: 'compare_exchange_weak 與 compare_exchange_strong 的關鍵差異是什麼？',
      options: [
        { id: 'a', text: 'weak 版本比較快但只能用於整數' },
        { id: 'b', text: 'weak 允許偽失敗（spurious failure），適合放在重試迴圈；strong 保證不偽失敗' },
        { id: 'c', text: 'strong 版本不是原子操作' },
        { id: 'd', text: '兩者完全相同，只是名稱不同' },
      ],
      correctOptionId: 'b',
      explanation:
        'weak 在某些平台可能即使值相符也失敗（偽失敗），因此適合本來就會重試的迴圈；單次判斷用 strong。參見無鎖資料結構單元。',
    },
    {
      id: 'q2',
      stem: 'ABA 問題指的是什麼？',
      options: [
        { id: 'a', text: '兩個執行緒同時讀取同一變數' },
        { id: 'b', text: '值由 A 變成 B 再變回 A，使 CAS 誤以為期間沒有任何變化' },
        { id: 'c', text: '原子操作失敗兩次' },
        { id: 'd', text: '鎖被取得兩次' },
      ],
      correctOptionId: 'b',
      explanation:
        'CAS 只比較「值是否相等」，若值變回原樣便會成功，卻可能忽略了期間的結構變化；常以版本標記或 hazard pointers 解決。參見無鎖資料結構單元。',
    },
    {
      id: 'q3',
      stem: 'hazard pointers 主要解決無鎖程式的哪個問題？',
      options: [
        { id: 'a', text: '減少 CPU 快取失效' },
        { id: 'b', text: '安全記憶體回收：確保沒有其他執行緒仍在存取即將釋放的節點' },
        { id: 'c', text: '讓 CAS 執行更快' },
        { id: 'd', text: '自動排序所有原子操作' },
      ],
      correctOptionId: 'b',
      explanation:
        'hazard pointers 讓執行緒標記正在存取的節點，回收端據此延後釋放，避免釋放後仍被使用。參見無鎖資料結構單元。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['load', 'CAS', 'retry', 'commit'],
    caption:
      '無鎖更新的重試循環：讀取目前值、嘗試 CAS，失敗則重試，成功則提交——不需任何互斥鎖。',
  },
  tryIt: {
    code: `#include <atomic>
#include <iostream>
#include <thread>
#include <vector>

// 無鎖計數器：多執行緒以 CAS 迴圈安全累加。
std::atomic<long long> counter{0};

void worker(int iters) {
    for (int i = 0; i < iters; ++i) {
        long long cur = counter.load(std::memory_order_relaxed);
        while (!counter.compare_exchange_weak(cur, cur + 1, std::memory_order_relaxed)) {
            // cur 已更新為最新值，重試
        }
    }
}

int main() {
    std::vector<std::thread> ts;
    for (int t = 0; t < 4; ++t) ts.emplace_back(worker, 100000);
    for (auto& t : ts) t.join();
    std::cout << "counter = " << counter.load() << " (應為 400000)\\n";
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::atomic::compare_exchange - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/atomic/atomic/compare_exchange',
      description: 'CAS 的 weak／strong 版本與記憶體順序參數。',
    },
    {
      title: 'Hazard Pointers (Michael, 2004)',
      href: 'https://erdani.org/publications/cuj-2004-12.pdf',
      description: '安全記憶體回收的經典 hazard pointers 論文。',
    },
    {
      title: 'Modern C++ Programming — Advanced Topics II (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/22.Advanced_topics_II.html',
      description: 'Busato 課程並行章節，涵蓋 atomic 與無鎖概念原文。',
    },
  ],
};

export default labLockFree;
