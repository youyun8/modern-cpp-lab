import type { ChapterContent } from '@/types/ChapterContent';

const ch19AllocatorsPmr: ChapterContent = {
  slug: 'ch19-allocators-pmr',
  chapterLabel: '第 19.4 章',
  title: 'Allocators 與 std::pmr',
  group: '第 4 部：STL 與工具庫',
  description:
    'allocator-aware containers、allocator_traits、std::pmr::memory_resource、monotonic/pool resources 與 arena 設計。',
  concept: {
    standard: 'C++17',
    body: 'STL 容器把「元素如何配置記憶體」抽象成 allocator；傳統 allocator 是型別參數，會影響容器型別。C++17 的 `std::pmr` 提供 runtime polymorphic allocator：`std::pmr::vector<T>` 使用 `std::pmr::polymorphic_allocator<T>`，而實際記憶體來源由 `std::pmr::memory_resource` 決定。`monotonic_buffer_resource` 適合「整批配置、整批釋放」的短生命週期工作區；`unsynchronized_pool_resource`／`synchronized_pool_resource` 適合大量小物件重複配置釋放。PMR 的價值在於不用改變容器使用方式，就能把配置策略集中到 arena、pool 或 NUMA-aware resource；風險則是生命週期：容器不可比其 memory_resource 活得更久。',
  },
  code: {
    lang: 'cpp',
    code: `#include <array>
#include <cstddef>
#include <iostream>
#include <memory_resource>
#include <string>
#include <vector>

struct Row {
    std::pmr::string key;
    int value{};
};

int main() {
    std::array<std::byte, 4096> buffer{};  // [1]
    std::pmr::monotonic_buffer_resource arena(buffer.data(), buffer.size());

    std::pmr::vector<Row> rows{&arena};    // [2]
    rows.reserve(3);

    rows.push_back(Row{std::pmr::string{"alpha", &arena}, 1});  // [3]
    rows.push_back(Row{std::pmr::string{"beta", &arena}, 2});
    rows.push_back(Row{std::pmr::string{"gamma", &arena}, 3});

    for (const Row& row : rows) {
        std::cout << row.key << '=' << row.value << "\\n";
    }
}  // [4]
`,
    callouts: [
      { n: 1, text: '先準備一段 stack buffer，arena 會優先從這段記憶體切分配置。' },
      {
        n: 2,
        text: '`pmr::vector` 保存指向 `memory_resource` 的 allocator，容器型別不再綁死特定 arena 類型。',
      },
      { n: 3, text: '巢狀的 `pmr::string` 也要使用同一個 arena，否則字串內容仍可能走預設配置器。' },
      {
        n: 4,
        text: '容器與其中的 pmr 字串必須在 arena 銷毀前銷毀；PMR 不會延長 resource 生命週期。',
      },
    ],
  },
  deepDive: [
    {
      heading: 'allocator-aware containers 與 propagation',
      body: '標準容器透過 `allocator_traits` 與 allocator 互動；allocator 不只負責 `allocate`／`deallocate`，也影響容器複製、移動、swap 時 allocator 是否傳播。傳統自訂 allocator 會變成容器型別的一部分，例如 `std::vector<T, MyAlloc<T>>` 與 `std::vector<T>` 是不同型別。\n\n這也是 PMR 受歡迎的原因：`std::pmr::vector<T>` 的 allocator 型別固定，實際配置策略由 runtime 的 `memory_resource*` 決定。',
    },
    {
      heading: 'monotonic 與 pool resources',
      body: '`monotonic_buffer_resource` 只向前配置，個別 `deallocate` 通常不回收，整個 resource 銷毀時一次釋放，因此非常適合 request scope、compiler pass、解析暫存資料等批次生命週期。若物件需要頻繁個別釋放，monotonic 會持續成長，不適合長壽命服務。\n\npool resource 會依大小分類重用區塊；`unsynchronized_pool_resource` 較快但不可跨執行緒無同步共享，`synchronized_pool_resource` 有內部同步但成本較高。',
    },
    {
      heading: 'resource 生命週期與巢狀配置',
      body: 'PMR 容器只保存 `memory_resource*`，不擁有 resource。若把指向區域 arena 的 `pmr::vector` 回傳出去，容器下一次配置或解構就可能使用懸置 resource。巢狀容器也要傳遞 allocator；否則外層走 arena，內層字串或 vector 仍走 `new_delete_resource()`。\n\n當 PMR 穿過 API 邊界時，需明確指定誰擁有 resource，以及結果是否可在 resource 銷毀後保存。',
    },
  ],
  pitfalls: [
    '讓 `pmr` 容器比其 `memory_resource` 活得更久，造成懸置 allocator。',
    '使用 `monotonic_buffer_resource` 管理長壽命、頻繁刪除的資料，記憶體只增不減。',
    '忘記讓巢狀 `pmr::string`／`pmr::vector` 使用同一 resource，配置仍流向預設 heap。',
    '跨執行緒共享 `unsynchronized_pool_resource`，造成資料競爭。',
  ],
  bestPractices: [
    'request/task scope 的暫存資料可用 `monotonic_buffer_resource` 一次回收。',
    '大量小物件且需釋放重用時考慮 pool resource。',
    '把 `memory_resource` 的所有權與生命週期放在容器之外明確管理。',
    'PMR 只在配置成本已被量測為瓶頸時引入，避免為小程式增加複雜度。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '`std::pmr::vector<T>` 與一般 `std::vector<T>` 的主要差異是什麼？',
      options: [
        { id: 'a', text: 'pmr::vector 不能存放物件' },
        {
          id: 'b',
          text: 'pmr::vector 使用 polymorphic_allocator，實際配置來源由 memory_resource 決定',
        },
        { id: 'c', text: 'pmr::vector 一定配置在 stack' },
        { id: 'd', text: 'pmr::vector 會自動平行化' },
      ],
      correctOptionId: 'b',
      explanation:
        'PMR 容器的 allocator 型別固定，但可在執行期指定不同 memory_resource，例如 arena 或 pool。',
    },
    {
      id: 'q2',
      stem: '`monotonic_buffer_resource` 最適合哪種生命週期？',
      options: [
        { id: 'a', text: '大量配置後整批一起釋放的短生命週期工作區' },
        { id: 'b', text: '需要頻繁個別釋放且長期運行的 cache' },
        { id: 'c', text: '跨處理程序共享記憶體' },
        { id: 'd', text: '永遠不配置記憶體的容器' },
      ],
      correctOptionId: 'a',
      explanation:
        'monotonic resource 通常不回收個別釋放，只在整個 resource 銷毀時釋放，非常適合 arena-style 暫存資料。',
    },
    {
      id: 'q3',
      stem: 'PMR 最常見的生命週期陷阱是什麼？',
      options: [
        { id: 'a', text: 'memory_resource 會複製所有容器元素' },
        { id: 'b', text: '容器保存的是 resource 指標，若 resource 先銷毀，容器 allocator 會懸置' },
        { id: 'c', text: 'PMR 容器不能 move' },
        { id: 'd', text: 'PMR 只能用於 int' },
      ],
      correctOptionId: 'b',
      explanation:
        'PMR 容器不擁有 memory_resource；resource 必須活得比所有使用它的容器與巢狀配置物件更久。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['pmr 容器', 'polymorphic_allocator', 'memory_resource', 'arena/pool'],
    caption:
      'PMR 配置鏈：容器透過 polymorphic_allocator 呼叫 memory_resource，實際策略可換成 arena、pool 或預設 heap。',
  },
  tryIt: {
    code: `#include <array>
#include <cstddef>
#include <iostream>
#include <memory_resource>
#include <vector>

int main() {
    std::array<std::byte, 1024> storage{};
    std::pmr::monotonic_buffer_resource arena(storage.data(), storage.size());
    std::pmr::vector<int> values{&arena};
    for (int i = 0; i < 10; ++i) {
        values.push_back(i);
    }
    std::cout << values.size() << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::pmr::memory_resource - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/memory/memory_resource',
      description: 'PMR 的抽象基底與標準資源型別。',
    },
    {
      title: 'std::pmr::monotonic_buffer_resource - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/memory/monotonic_buffer_resource',
      description: '單調配置 arena 的行為與建構方式。',
    },
    {
      title: 'Allocator named requirements - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/named_req/Allocator',
      description: '傳統 allocator 與 allocator-aware 容器需求。',
    },
  ],
};

export default ch19AllocatorsPmr;
