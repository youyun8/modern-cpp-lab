import type { ChapterContent } from '@/types/ChapterContent';

const ch01Introduction: ChapterContent = {
  slug: 'ch01-introduction',
  chapterLabel: 'Ch.01',
  title: '導論',
  group: 'A · 基礎概念',
  description:
    'C++ 的歷史沿革、設計哲學與主要應用領域概觀，說明為何直到今天 C++ 仍是高效能與系統程式設計的首選語言之一。',
  concept: {
    standard: 'C++23',
    body:
      'C++ 由 Bjarne Stroustrup 於 1980 年代以「C with Classes」為起點發展而來，目標是在保留 C 的執行效率與底層控制的同時，加入抽象化能力。其核心設計哲學可概括為三點：零成本抽象（zero-overhead abstraction，你不使用的特性不需付出代價，你使用的特性也無法再手寫得更快）、直接對應硬體模型，以及以型別系統與 RAII 靜態保證資源正確性。自 C++11 起改為三年一次的標準週期（C++11／14／17／20／23），語言持續現代化。今日 C++ 廣泛用於遊戲引擎、瀏覽器、資料庫、高頻交易、嵌入式系統，以及機器學習與 HPC 的核心運算層。',
  },
  code: {
    lang: 'cpp',
    code: `#include <print>  // C++23：型別安全、格式化的輸出 [1]
#include <string>
#include <vector>

// 一支「現代」的 Hello World：善用標準函式庫的高階抽象，
// 而非手動管理記憶體或使用 C 風格 I/O。
int main() {
    std::vector<std::string> langs{"C", "C++98", "C++11", "現代 C++"};  // [2]

    for (const auto& lang : langs) {           // [3] range-based for + auto
        std::println("Hello from {}!", lang);  // [4] std::format 風格
    }
    return 0;  // [5] 回傳 0 代表成功
}`,
    callouts: [
      { n: 1, text: 'C++23 的 <print> 提供 std::print／std::println，取代 iostream 的冗長語法，同時保有型別安全。' },
      { n: 2, text: 'std::vector 是動態陣列，自動管理堆積記憶體，離開作用域時自動釋放，體現 RAII。' },
      { n: 3, text: 'range-based for 搭配 const auto& 走訪容器，避免不必要的複製，也不需手動處理迭代器。' },
      { n: 4, text: '{} 佔位語法源自 std::format，比 printf 的 %s 更安全，也比 << 串接更易讀。' },
      { n: 5, text: 'main 回傳 0 代表程式成功結束；這是 C 與 C++ 共通的慣例。' },
    ],
  },
  deepDive: [
    {
      heading: '標準演進與編譯器支援的實務追蹤',
      body:
        'ISO C++ 委員會（WG21）以三年為週期定版，特性透過提案（P 系列論文）逐步進入草案，最後在 feature freeze 後定稿。工業上真正的限制不是標準發布年份，而是工具鏈支援程度：GCC、Clang、MSVC 對各特性支援進度不一，部分需以 `-std=c++20`／`-std=c++23` 或 `-fexperimental-library` 啟用。\n\n團隊應以 cppreference 的 compiler support 表為準，並在 CI 以目標編譯器的最低版本驗證；不要因本機編譯器較新就使用尚未在部署環境落地的特性。可用 `__cpp_lib_*`／`__cpp_*` 功能測試巨集寫可攜的條件式程式。',
    },
    {
      heading: '零成本抽象在實務上的邊界',
      body:
        'C++ 採提前編譯（AOT）與確定性解構（RAII），沒有 GC 造成的暫停，這是低延遲系統的關鍵優勢。樣板以單型化（monomorphization）生成專屬程式碼，讓泛型與手寫等速，代價是編譯時間與二進位膨脹。\n\n零成本是指不比等價手寫慢，而非免費：例外在未拋出時近乎零成本、拋出時昂貴；`std::function`、虛擬呼叫、`shared_ptr` 的原子引用計數都有可量測成本。熱路徑應以剖析器確認，並偏好靜態多型與值語意。',
    },
    {
      heading: '選型與跨語言互通',
      body:
        'C++ 主導 HPC、遊戲引擎、資料庫核心、瀏覽器、金融低延遲與機器學習運算核心（如 PyTorch 的 C++ 後端）。需求偏向快速原型或高階安全邏輯時未必首選。\n\n實務常以 C++ 寫效能核心，再透過 `pybind11`、C ABI 或 gRPC 對外暴露。跨編譯器整合時 ABI 穩定性是核心議題：C++ 無標準 ABI，函式庫邊界常退回 `extern "C"` 包裝以避免 name mangling 與標準庫版本不一致。',
    },
  ],
  pitfalls: [
    '假設 `int` 一定是 32 位元、指標一定是 8 位元組——皆為實作定義，跨平台會出錯。',
    '仰賴編譯器特有擴充（如 GCC 的 `__int128`、VLA）而未加條件保護，移植即失敗。',
    '因本機編譯器較新就使用部署環境尚未支援的標準特性，導致線上建置失敗。',
    '把「UB 在我機器上看似正常」當成安全，最佳化等級或編譯器一改就崩潰。',
  ],
  bestPractices: [
    '在建置系統中明確固定 `-std=c++XX`，不要依賴編譯器預設值。',
    'CI 開啟 `-Wall -Wextra` 並考慮 `-Werror`，把警告視為錯誤及早攔截。',
    '採用新特性前先查 cppreference 編譯器支援表，並在目標最低版本驗證。',
    '優先使用標準庫與成熟元件；跨模組邊界考慮 C ABI 以穩定介面。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '下列何者最能描述 C++ 的「零成本抽象（zero-overhead abstraction）」原則？',
      options: [
        { id: 'a', text: '所有抽象在執行期都會被完全移除，程式因此不需要任何記憶體' },
        { id: 'b', text: '你不使用的特性不需付出代價；你使用的特性也無法再手寫得更快' },
        { id: 'c', text: '編譯器保證所有程式都以相同速度執行' },
        { id: 'd', text: '抽象一定比手寫低階程式慢，但較易維護' },
      ],
      correctOptionId: 'b',
      explanation:
        '零成本抽象的兩層意義：未使用的特性不產生額外開銷，且使用的特性其效率不輸等價的手寫低階程式。參見 Ch.01 PDF 第 12 頁。',
    },
    {
      id: 'q2',
      stem: '現行 C++ 標準大約以何種頻率發布新版本？',
      options: [
        { id: 'a', text: '每年一次' },
        { id: 'b', text: '每三年一次' },
        { id: 'c', text: '每十年一次' },
        { id: 'd', text: '沒有固定週期' },
      ],
      correctOptionId: 'b',
      explanation:
        '自 C++11 之後，ISO 委員會採三年一次的節奏：C++14、17、20、23，讓語言穩定而持續演進。參見 Ch.01 PDF 第 24 頁。',
    },
    {
      id: 'q3',
      stem: 'C++ 最初由誰設計，並以何種名稱起步？',
      options: [
        { id: 'a', text: 'Dennis Ritchie，名為 New C' },
        { id: 'b', text: 'Bjarne Stroustrup，名為「C with Classes」' },
        { id: 'c', text: 'James Gosling，名為 Oak' },
        { id: 'd', text: 'Guido van Rossum，名為 CPy' },
      ],
      correctOptionId: 'b',
      explanation:
        'C++ 由 Bjarne Stroustrup 於貝爾實驗室以「C with Classes」為原型發展，後於 1983 年更名為 C++。參見 Ch.01 PDF 第 6 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['C 語言', 'C++98', 'C++11', '現代 C++'],
    caption:
      'C++ 的演進脈絡：從 C 的效率基礎，經 C++98 的標準化，到 C++11 之後三年一版的現代化浪潮。',
  },
  tryIt: {
    code: `#include <iostream>
#include <string>
#include <vector>

// 若你的編譯器尚未支援 C++23 的 <print>，可退回 iostream 版本。
int main() {
    std::vector<std::string> langs{"C", "C++98", "C++11", "Modern C++"};
    for (const auto& lang : langs) std::cout << "Hello from " << lang << "!\\n";
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'A History of C++ (Stroustrup)',
      href: 'https://www.stroustrup.com/hopl2.pdf',
      description: 'Bjarne Stroustrup 親筆撰寫的 C++ 歷史與設計決策長文。',
    },
    {
      title: 'C++ language - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language',
      description: 'C++ 語言特性的權威索引，適合按主題查閱。',
    },
    {
      title: 'Modern C++ Programming — Introduction (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/01.Introduction.html',
      description: 'Busato 課程第 1 章的 HTML 投影片，涵蓋歷史與哲學原文。',
    },
  ],
};

export default ch01Introduction;
