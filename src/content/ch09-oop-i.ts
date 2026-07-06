import type { ChapterContent } from '@/types/ChapterContent';

const ch09OopI: ChapterContent = {
  slug: 'ch09-oop-i',
  chapterLabel: 'Ch.09',
  title: 'OOP I：RAII 與建構子',
  group: 'B · 物件導向與泛型程式設計',
  description:
    'RAII、建構子與解構子，以及 rule of five／rule of zero：如何以型別自動且例外安全地管理資源。',
  concept: {
    standard: 'C++23',
    body:
      'RAII（Resource Acquisition Is Initialization）是 C++ 資源管理的核心：在建構子取得資源、在解構子釋放，讓生命週期綁定物件作用域，即使發生例外也保證釋放。特殊成員函式包含建構子、解構子、複製建構／指定、移動建構／指定。「rule of five」指出：一旦你手動定義其中之一（通常因為管理原始資源），通常需一併定義其餘四個以保持一致；更好的是「rule of zero」——用 std::unique_ptr、std::vector 等 RAII 型別包裝資源，讓編譯器自動生成正確的特殊成員，自己一個都不必寫。=default 與 =delete 可明確要求或禁用某成員。',
  },
  code: {
    lang: 'cpp',
    code: `#include <print>
#include <utility>

// 示範 rule of five：手動管理一段原始緩衝區。 [1]
class Buffer {
    int* data_;
    std::size_t size_;

public:
    explicit Buffer(std::size_t n)  // [2] 建構子取得資源
        : data_(new int[n]{}), size_(n) {}
    ~Buffer() { delete[] data_; }  // [3] 解構子釋放資源

    Buffer(const Buffer& other)  // [4] 複製建構（深複製）
        : data_(new int[other.size_]), size_(other.size_) {
        std::copy(other.data_, other.data_ + size_, data_);
    }
    Buffer& operator=(const Buffer&) = delete;  // 簡化：禁用複製指定

    Buffer(Buffer&& other) noexcept  // [5] 移動建構：接管指標
        : data_(std::exchange(other.data_, nullptr)), size_(std::exchange(other.size_, 0)) {}

    std::size_t size() const { return size_; }
};

int main() {
    Buffer a(4);
    Buffer b = std::move(a);  // 呼叫移動建構，a 被清空
    std::println("b.size = {}", b.size());
    return 0;  // b 的解構子自動釋放記憶體
}`,
    callouts: [
      { n: 1, text: '此類別直接持有 new[] 出來的原始資源，因此必須遵守 rule of five；實務上應改用 std::vector。' },
      { n: 2, text: 'explicit 防止意外的隱式轉換；建構子在此取得（配置）資源。' },
      { n: 3, text: '解構子釋放資源，是 RAII 的關鍵；即使函式因例外提前結束也會被呼叫。' },
      { n: 4, text: '複製建構子做深複製，配置新緩衝區並複製內容，避免兩物件共享同一指標。' },
      { n: 5, text: '移動建構子以 std::exchange 接管來源指標並將來源置空，noexcept 讓容器能安全使用。' },
    ],
  },
  deepDive: [
    {
      heading: '特殊成員函式的生成與抑制規則',
      body:
        '編譯器自動生成的特殊成員遵循連鎖規則：一旦你宣告了解構子（或複製操作），移動操作就不會被自動生成，物件將退回昂貴的複製。這是效能回歸的常見隱因。\n\n因此若要手動管理資源，應完整而明確地以 `=default`／`=delete` 宣告全部五個成員（rule of five），或更好——遵循 rule of zero，完全不宣告。`=default` 的移動仍需你確認其正確性。',
    },
    {
      heading: '例外安全與 copy-and-swap',
      body:
        '強例外保證要求操作要麼成功、要麼保持原狀。copy-and-swap 慣用法透過「先建立副本、再以 `noexcept` 的 `swap` 交換」達成強保證，並自然處理自我指定。\n\n移動操作應標 `noexcept`，否則 `std::vector` 擴容時會為了維持強保證而退回複製，喪失移動的效能優勢。`std::vector::push_back` 對元素移動的選擇正取決於此。',
    },
    {
      heading: '資源管理元件的選擇與成本',
      body:
        '`std::unique_ptr` 零額外成本且可帶自訂刪除器（如 `fclose`、GPU 資源釋放），是預設選擇；`std::shared_ptr` 需要原子引用計數與控制區塊，成本較高且可能形成循環參考。\n\n非記憶體資源（鎖、檔案、交易）可用 scope guard（如 `std::lock_guard` 或自製 RAII 包裝）確保釋放。以 RAII 表達所有權讓例外路徑也安全。',
    },
  ],
  pitfalls: [
    '宣告解構子卻未宣告移動操作，導致移動被抑制、退回昂貴複製。',
    '解構子中拋出例外——在堆疊展開期間會呼叫 `std::terminate`。',
    '手寫複製指定卻未處理自我指定（self-assignment），造成釋放後使用。',
    '`std::shared_ptr` 互相持有形成循環參考，記憶體永不釋放。',
  ],
  bestPractices: [
    '優先 rule of zero：以容器與智慧指標包裝資源，讓編譯器生成正確特殊成員。',
    '手動管理資源時完整宣告 rule of five，並將移動操作標 `noexcept`。',
    '預設用 `std::unique_ptr`（可搭自訂刪除器），僅在需共享時用 `shared_ptr`。',
    '以 `weak_ptr` 打破循環參考；非記憶體資源用 scope guard 管理。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: 'RAII 的核心概念是什麼？',
      options: [
        { id: 'a', text: '所有資源都必須手動 delete' },
        { id: 'b', text: '在建構子取得資源、在解構子釋放，使資源生命週期綁定物件作用域' },
        { id: 'c', text: '禁止使用建構子' },
        { id: 'd', text: '所有物件都應配置在 heap' },
      ],
      correctOptionId: 'b',
      explanation:
        'RAII 讓資源獲取與釋放對應物件的建構與解構，即使發生例外也能保證正確釋放。參見 Ch.09 PDF 第 12 頁。',
    },
    {
      id: 'q2',
      stem: '「rule of zero」建議的做法是什麼？',
      options: [
        { id: 'a', text: '一律手動定義全部五個特殊成員函式' },
        { id: 'b', text: '用 RAII 型別（如智慧指標、容器）包裝資源，讓編譯器自動生成正確的特殊成員' },
        { id: 'c', text: '刪除所有建構子' },
        { id: 'd', text: '把所有成員設為 public' },
      ],
      correctOptionId: 'b',
      explanation:
        'rule of zero：不自行管理原始資源，改用 RAII 元件，特殊成員函式一個都不必手寫。參見 Ch.09 PDF 第 41 頁。',
    },
    {
      id: 'q3',
      stem: '為何移動建構子通常應標記為 noexcept？',
      options: [
        { id: 'a', text: '否則無法編譯' },
        { id: 'b', text: '讓 std::vector 等容器在重新配置時能選擇移動而非複製以保證強例外保證' },
        { id: 'c', text: 'noexcept 會讓移動變慢但比較安全' },
        { id: 'd', text: 'noexcept 沒有任何作用' },
      ],
      correctOptionId: 'b',
      explanation:
        '容器重新配置時，只有在移動為 noexcept 時才會採用移動，否則退回複製以維持強例外保證。參見 Ch.09 PDF 第 55 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['建構', '複製', '移動', '解構'],
    caption:
      '物件生命週期與特殊成員：建構取得資源，複製與移動決定資源如何轉移，解構負責釋放。',
  },
  tryIt: {
    code: `#include <iostream>
#include <utility>
#include <vector>

// rule of zero 版本：用 std::vector 管理資源，無需手寫特殊成員。
class Buffer {
    std::vector<int> data_;

public:
    explicit Buffer(std::size_t n) : data_(n, 0) {}
    std::size_t size() const { return data_.size(); }
};

int main() {
    Buffer a(4);
    Buffer b = std::move(a);  // 自動生成的移動建構
    std::cout << "b.size = " << b.size() << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'The rule of three/five/zero - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/rule_of_three',
      description: '特殊成員函式一致性規則的完整說明。',
    },
    {
      title: 'RAII - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/raii',
      description: 'RAII 慣用法與其在資源管理中的角色。',
    },
    {
      title: 'Modern C++ Programming — OOP I (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/09.Object_oriented_programming_I.html',
      description: 'Busato 課程第 9 章 HTML 投影片，涵蓋 RAII 與建構子原文。',
    },
  ],
};

export default ch09OopI;
