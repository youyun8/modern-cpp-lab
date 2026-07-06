import type { ChapterContent } from '@/types/ChapterContent';

const ch17DebuggingTesting: ChapterContent = {
  slug: 'ch17-debugging-testing',
  chapterLabel: 'Ch.17',
  title: '除錯與測試',
  group: 'C · 建置系統與慣例',
  description:
    'Sanitizers、valgrind、單元測試與測試驅動開發（TDD）：如何以工具與紀律及早發現記憶體錯誤與邏輯缺陷。',
  concept: {
    standard: 'C++23',
    body: '除錯與測試是可靠 C++ 的支柱。編譯期防線包含 -Wall -Wextra 警告與 static_assert；執行期則有 sanitizers：AddressSanitizer（ASan）偵測越界與釋放後使用、UndefinedBehaviorSanitizer（UBSan）偵測有號溢位與無效轉換、ThreadSanitizer（TSan）偵測資料競爭。它們以插樁換取執行速度，適合在測試與 CI 開啟。Valgrind（memcheck）不需重編譯即可偵測記憶體問題，但更慢。測試方面，單元測試框架（GoogleTest、Catch2、doctest）以 assert 式檢查行為；TDD 主張「先寫失敗測試 → 實作到通過 → 重構」的循環，讓設計與回歸防護同時成形。搭配 gdb／lldb 互動除錯可定位崩潰點。',
  },
  code: {
    lang: 'bash',
    code: `# 以 AddressSanitizer + UBSan 編譯，及早抓出記憶體與 UB 問題
g++ -std=c++23 -g -fsanitize=address,undefined app.cpp -o app  # [1]
./app                                                           # [2]

# 偵測資料競爭（不可與 ASan 同時使用）
g++ -std=c++23 -g -fsanitize=thread race.cpp -o race           # [3]

# 不需重編譯的替代方案：valgrind memcheck（較慢）
valgrind --leak-check=full ./app                               # [4]

# 執行單元測試（以 CTest 驅動，通常整合於 CMake）
ctest --output-on-failure                                       # [5]`,
    callouts: [
      {
        n: 1,
        text: 'ASan 偵測越界存取、釋放後使用；UBSan 偵測有號溢位等未定義行為，兩者可同時開啟。',
      },
      { n: 2, text: '直接執行插樁後的程式，錯誤發生時會印出精確的位置與呼叫堆疊。' },
      { n: 3, text: 'ThreadSanitizer 偵測資料競爭；因插樁方式不同，不能與 ASan 同時編譯。' },
      { n: 4, text: 'valgrind 不需重新編譯即可分析記憶體，但執行速度顯著較慢，適合離線深入分析。' },
      { n: 5, text: 'ctest 統一執行測試套件，--output-on-failure 只在失敗時顯示輸出，方便 CI。' },
    ],
  },
  deepDive: [
    {
      heading: 'Sanitizers 的分工與限制',
      body: 'ASan 抓記憶體越界／釋放後使用／洩漏；UBSan 抓有號溢位、無效轉換等 UB；TSan 抓資料競爭；MSan 抓未初始化讀取。ASan 與 TSan 因插樁方式衝突不可同時使用，且各有 2–10 倍的執行負擔。\n\n實務上在 CI 分別跑 ASan+UBSan 與 TSan 兩種組態。Sanitizer 是動態工具，只能發現實際執行到的路徑上的錯誤，故需搭配良好的測試覆蓋。',
    },
    {
      heading: '測試策略與覆蓋率',
      body: '分層測試：單元測試隔離邏輯、整合測試驗證元件互動。善用 fixtures、參數化測試與 property-based testing 擴大輸入空間；以 mock／fake 隔離外部相依。以 `gcov`／`llvm-cov` 量測覆蓋率，但覆蓋率高不等於測得好。\n\n測試必須具決定性：固定亂數種子、避免相依於時間或執行緒排程，否則會產生難以重現的偶發失敗。',
    },
    {
      heading: '進階除錯技術',
      body: '`gdb`／`lldb` 提供斷點、watchpoint 與事後分析 core dump 的能力。對難以重現的 bug，`rr`（record-and-replay）可錄製一次執行並反覆回放、甚至反向執行。\n\n斷言（`assert`）在 `NDEBUG` 下會被移除，因此不可把有副作用的檢查放進 `assert`；關鍵不變量可用永遠啟用的檢查或日誌輔助定位。',
    },
  ],
  pitfalls: [
    '把有副作用的運算放進 `assert`——Release 建置（`NDEBUG`）會整個移除它。',
    '嘗試同時啟用 ASan 與 TSan——兩者插樁衝突不可並用。',
    '資料競爭造成的 heisenbug 僅靠 print 難以重現，需要 TSan。',
    '測試相依於未固定的亂數種子、時間或執行緒排程，導致偶發失敗。',
  ],
  bestPractices: [
    'CI 分別執行 ASan+UBSan 與 TSan 兩種 sanitizer 組態。',
    '分層撰寫單元／整合測試，並量測覆蓋率作為參考。',
    '確保測試具決定性：固定種子、隔離外部相依。',
    '難解 bug 善用 `rr` 錄製回放與 core dump 事後分析。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: 'AddressSanitizer（ASan）主要用來偵測哪類問題？',
      options: [
        { id: 'a', text: '編譯速度過慢' },
        { id: 'b', text: '記憶體越界存取、釋放後使用與記憶體洩漏等' },
        { id: 'c', text: '程式碼風格不一致' },
        { id: 'd', text: '網路延遲' },
      ],
      correctOptionId: 'b',
      explanation:
        'ASan 以插樁偵測堆疊／堆積越界、釋放後使用（use-after-free）與洩漏等記憶體錯誤。參見 Ch.17 PDF 第 26 頁。',
    },
    {
      id: 'q2',
      stem: '要偵測多執行緒程式中的資料競爭，最適合的工具是？',
      options: [
        { id: 'a', text: 'AddressSanitizer' },
        { id: 'b', text: 'ThreadSanitizer（TSan）' },
        { id: 'c', text: '編譯器的 -O3 旗標' },
        { id: 'd', text: 'std::cout 除錯輸出' },
      ],
      correctOptionId: 'b',
      explanation:
        'ThreadSanitizer 專門偵測資料競爭與部分同步錯誤；注意它不能與 ASan 同時啟用。參見 Ch.17 PDF 第 33 頁。',
    },
    {
      id: 'q3',
      stem: '測試驅動開發（TDD）的基本循環為何？',
      options: [
        { id: 'a', text: '先實作 → 再刪除測試 → 上線' },
        { id: 'b', text: '先寫一個失敗的測試 → 實作到測試通過 → 重構' },
        { id: 'c', text: '只在專案結束時寫測試' },
        { id: 'd', text: '完全不寫測試，仰賴手動驗證' },
      ],
      correctOptionId: 'b',
      explanation:
        'TDD 的紅-綠-重構循環：先寫失敗測試界定需求，實作到通過，再在測試保護下重構。參見 Ch.17 PDF 第 44 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['撰寫測試', '執行', 'sanitizer', '修正'],
    caption:
      '除錯與測試的循環：撰寫測試、執行並以 sanitizer 插樁揪出隱藏錯誤，定位後修正再回到測試。',
  },
  tryIt: {
    code: `#include <cassert>
#include <iostream>

int add(int a, int b) { return a + b; }

// 迷你單元測試：以 assert 驗證行為。以 -fsanitize=undefined 編譯更佳。
int main() {
  assert(add(2, 3) == 5);
  assert(add(-1, 1) == 0);
  std::cout << "all tests passed\\n";
  return 0;
}`,
  },
  furtherReading: [
    {
      title: 'AddressSanitizer (LLVM docs)',
      href: 'https://clang.llvm.org/docs/AddressSanitizer.html',
      description: 'ASan 的原理、旗標與可偵測的錯誤類型。',
    },
    {
      title: 'GoogleTest User Guide',
      href: 'https://google.github.io/googletest/',
      description: '廣泛使用的 C++ 單元測試框架文件。',
    },
    {
      title: 'Modern C++ Programming — Debugging and Testing (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/17.Debugging_and_testing.html',
      description: 'Busato 課程第 17 章 HTML 投影片，涵蓋除錯與測試原文。',
    },
  ],
};

export default ch17DebuggingTesting;
