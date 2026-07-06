import type { ChapterContent } from '@/types/ChapterContent';

const ch21ObjectLifetime: ChapterContent = {
  slug: 'ch21-object-lifetime',
  chapterLabel: '第 21.1 章',
  title: '物件生命週期與低階記憶體',
  group: '第 5 部：進階 C++',
  description:
    'placement new、std::construct_at、std::destroy_at、aligned storage、strict aliasing、std::launder、bit_cast 與自訂 operator new/delete。',
  concept: {
    standard: 'C++20',
    body: 'C++ 中「有一段位元組」不代表「那裡已經有某型別物件」。物件生命週期從建構開始，到解構或儲存空間被重用結束；allocator、arena、variant、小型緩衝最佳化與序列化都必須正確開始與結束物件生命週期。C++20 提供 `std::construct_at` 與 `std::destroy_at` 包裝 placement new 與顯式解構；`alignas` 與 `std::aligned_alloc`／allocator 負責對齊。型別雙關不能靠任意 `reinterpret_cast`；違反 strict aliasing 或讀取未開始生命週期的物件都是 UB。可複製位元表示的轉換用 `std::bit_cast`，在重用同一儲存空間且指標可能被最佳化器快取時，才需要理解 `std::launder` 的語意。',
  },
  code: {
    lang: 'cpp',
    code: `#include <cstddef>
#include <iostream>
#include <memory>
#include <new>
#include <string>
#include <utility>

template <typename T>
class InlineBox {
    alignas(T) std::byte storage_[sizeof(T)];  // [1]
    bool engaged_ = false;

    T* raw_ptr() {
        return reinterpret_cast<T*>(storage_);
    }

    T* ptr() {
        return std::launder(reinterpret_cast<T*>(storage_));  // [2]
    }

   public:
    template <typename... Args>
    void emplace(Args&&... args) {
        reset();
        std::construct_at(raw_ptr(), std::forward<Args>(args)...);  // [3]
        engaged_ = true;
    }

    void reset() noexcept {
        if (engaged_) {
            std::destroy_at(ptr());  // [4]
            engaged_ = false;
        }
    }

    T& value() { return *ptr(); }
    ~InlineBox() { reset(); }        // [5]
};

int main() {
    InlineBox<std::string> box;
    box.emplace("hello lifetime");
    std::cout << box.value() << "\\n";
    box.reset();
}`,
    callouts: [
      { n: 1, text: 'raw storage 只是對齊且大小足夠的位元組，尚未開始 `T` 的生命週期。' },
      {
        n: 2,
        text: '`std::launder` 用於取得重用儲存空間後的新物件指標，避免最佳化器假設舊物件仍存在。',
      },
      { n: 3, text: '`std::construct_at` 在指定地址建構物件，是 placement new 的標準包裝。' },
      { n: 4, text: '`std::destroy_at` 顯式結束物件生命週期；對非 trivial 類型必不可少。' },
      { n: 5, text: 'RAII 仍是核心：低階儲存管理也應由解構子保證清理。' },
    ],
  },
  deepDive: [
    {
      heading: '儲存空間、物件與生命週期',
      body: 'C++ 把 storage 與 object 分開：`std::byte buffer[sizeof(T)]` 只是 storage，只有 placement new、`construct_at`、某些隱式生命週期規則或 allocator construct 才會開始 `T` 的生命週期。對尚未開始生命週期的 storage 以 `T*` 讀寫是 UB。\n\n這也是 `std::optional`、`std::variant`、小型緩衝最佳化與 arena allocator 的核心：它們先持有 raw storage，再按需建構與解構真正物件。',
    },
    {
      heading: '對齊與配置函式',
      body: '每個型別都有 alignment requirement。`alignas(T)` 可讓內嵌 storage 滿足 `T` 的對齊；動態配置則需使用能處理 over-aligned type 的 `operator new` 或標準 allocator。錯誤對齊即使在某些 CPU 上看似可運作，也可能變慢或直接觸發硬體例外。\n\n自訂 `operator new/delete` 適合記錄、池化或嵌入式控制，但必須成對提供、處理對齊與 exception path；一般程式優先使用 allocator/PMR 而非全域替換 new。',
    },
    {
      heading: 'strict aliasing、bit_cast 與 launder',
      body: 'strict aliasing 允許編譯器假設不同不相容型別的指標不會指向同一物件；任意 `reinterpret_cast` 後讀寫常是 UB。若只是要複製位元表示，C++20 的 `std::bit_cast` 在 trivially copyable 型別間提供安全語意。\n\n`std::launder` 是罕見但重要的工具：當同一地址上建立了新物件，而既有指標／參考可能仍被最佳化器視為舊物件時，用 launder 取得指向新生命週期的指標。',
    },
  ],
  pitfalls: [
    '把 raw bytes 直接 `reinterpret_cast<T*>` 後讀寫，卻沒有建構 `T` 物件。',
    '忘記對 raw storage 加 `alignas(T)`，導致物件地址不符合對齊需求。',
    '對非 trivial 物件重用 storage 前未呼叫解構，造成資源洩漏。',
    '用 `reinterpret_cast` 做型別雙關，違反 strict aliasing；應改用 `std::bit_cast` 或序列化。',
  ],
  bestPractices: [
    '手動生命週期管理用 `std::construct_at`／`std::destroy_at`，並以 RAII 包起來。',
    'raw storage 必須同時滿足大小與對齊需求。',
    '位元表示轉換優先用 `std::bit_cast`，跨平台格式明確序列化。',
    '只有 allocator、variant、SBO 等底層元件才應手寫生命週期控制；業務程式避免碰它。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '為什麼 `std::byte storage[sizeof(T)]` 不等於已經有一個 `T` 物件？',
      options: [
        { id: 'a', text: '因為物件生命週期尚未開始，必須透過建構開始生命週期' },
        { id: 'b', text: '因為 `std::byte` 不能配置在 stack' },
        { id: 'c', text: '因為 `sizeof(T)` 永遠是 0' },
        { id: 'd', text: '因為所有物件都必須用 shared_ptr' },
      ],
      correctOptionId: 'a',
      explanation:
        'storage 只是位元組與地址；C++ 物件需要建構才開始生命週期，之後才能以該型別安全存取。',
    },
    {
      id: 'q2',
      stem: '`std::construct_at(p, args...)` 的用途是什麼？',
      options: [
        { id: 'a', text: '在指定地址建構物件，開始其生命週期' },
        { id: 'b', text: '釋放整個 heap' },
        { id: 'c', text: '把物件轉成字串' },
        { id: 'd', text: '檢查檔案是否存在' },
      ],
      correctOptionId: 'a',
      explanation:
        '`construct_at` 是 placement construction 的標準工具；對應的清理通常是 `destroy_at`。',
    },
    {
      id: 'q3',
      stem: '在 trivially copyable 型別間複製位元表示，現代 C++ 優先使用什麼？',
      options: [
        { id: 'a', text: '`std::bit_cast`' },
        { id: 'b', text: '任意 `reinterpret_cast` 後讀取' },
        { id: 'c', text: '`dynamic_cast`' },
        { id: 'd', text: '`std::move`' },
      ],
      correctOptionId: 'a',
      explanation: '`std::bit_cast` 表達「複製位元表示」而非別名讀取，避免 strict aliasing 問題。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['raw storage', 'construct_at', 'T object', 'destroy_at'],
    caption:
      '手動生命週期：先取得對齊 storage，再建構物件開始生命週期，使用完以 destroy_at 結束生命週期。',
  },
  tryIt: {
    code: `#include <cstddef>
#include <iostream>
#include <memory>
#include <new>

int main() {
    alignas(int) std::byte storage[sizeof(int)];
    int* p = std::construct_at(reinterpret_cast<int*>(storage), 42);
    std::cout << *p << '\\n';
    std::destroy_at(p);
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Object lifetime - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/lifetime',
      description: '物件生命週期、storage reuse 與懸置規則。',
    },
    {
      title: 'std::construct_at - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/memory/construct_at',
      description: '在指定地址建構物件的標準工具。',
    },
    {
      title: 'std::bit_cast - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/numeric/bit_cast',
      description: 'trivially copyable 型別間的安全位元表示轉換。',
    },
  ],
};

export default ch21ObjectLifetime;
