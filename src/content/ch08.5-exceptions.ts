import type { ChapterContent } from '@/types/ChapterContent';

const ch08Exceptions: ChapterContent = {
  slug: 'ch08.5-exceptions',
  chapterLabel: '第 8.5 章',
  title: '例外處理：try、catch、throw 與 noexcept',
  group: '第 1 部：基礎概念 Foundations',
  description:
    'C++ 例外機制的完整語意：throw、try、catch 配對、noexcept 契約、std::exception 階層，以及跨越執行緒與回呼邊界的例外傳遞。',
  concept: {
    standard: 'C++20',
    body: '例外是 C++ 報告與處理錯誤的主要機制：throw 建立異常物件並展開堆疊，catch 捕獲對應型別，整條傳遞路徑上的區域物件會依 RAII 自動解構。noexcept 是函式契約：宣告 noexcept(true) 的函式若丟出例外，會直接 std::terminate()，編譯器因此可優化堆疊展開的容錯路徑。std::exception 與 std::runtime_error、std::logic_error 等子類別構成標準階層；但核心價值不只在「捕捉」，而是「例外能安全地把錯誤從深度呼叫鏈傳回，同時沿途的資源被自動釋放」。',
  },
  code: {
    lang: 'cpp',
    code: `#include <exception>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

struct Logger {
    std::string name;
    explicit Logger(std::string n) : name(std::move(n)) {
        std::cout << "Logger(" << name << ") constructed\\n";
    }
    ~Logger() { std::cout << "Logger(" << name << ") destroyed\\n"; }
};

// Declare a function that never throws: the compiler can drop the unwinding path, and callers need no catch. [1]
void safeCleanup() noexcept { std::cout << "Safe cleanup\\n"; }

// May throw an exception because of invalid input. [2]
double divide(double a, double b) {
    if (b == 0.0) {
        throw std::runtime_error("division by zero");  // [3]
    }
    return a / b;
}

// Demonstrates RAII destruction during stack unwinding. [4]
void nestedWork() {
    Logger scope1{"inner"};       // [5]
    try {
        Logger scope2{"try-block"};
        divide(10.0, 0.0);       // Throws runtime_error, stack unwinding begins
    } catch (const std::runtime_error& e) {  // [6]
        std::cout << "Caught: " << e.what() << "\\n";
        // scope2 is destroyed at the end of the try block; scope1 is destroyed at the end of nestedWork
    }
}

// noexcept on move constructor/move assignment lets containers provide the strong exception-safety guarantee. [7]
struct Buffer {
    std::vector<int> data;
    Buffer(Buffer&& other) noexcept
        : data(std::move(other.data)) {}  // [8]
};

int main() {
    try {
        Logger outer{"main"};
        nestedWork();
        safeCleanup();
    } catch (const std::exception& e) {  // [9] Catches the base class of all standard exceptions
        std::cerr << "Unexpected exception: " << e.what() << "\\n";
        return 1;
    }
    return 0;
}`,
    callouts: [
      {
        n: 1,
        text: 'noexcept 函式若拋出例外，直接 std::terminate，不展開堆疊；編譯器可用此最佳化路徑。',
      },
      {
        n: 2,
        text: '當函式的前置條件被違反（如除零）時，丟出例外是正確的錯誤報告方式。',
      },
      {
        n: 3,
        text: 'throw 建立一份例外物件的副本，然後開始堆疊展開（unwinding），沿路解構區域物件。',
      },
      {
        n: 4,
        text: 'try 區塊中的物件在離開作用域時由 RAII 解構，即使是被例外打斷的路徑也一樣。',
      },
      {
        n: 5,
        text: 'Logger 是示範用 RAII 資源；堆疊展開時析構函式保證被呼叫，不會資源洩漏。',
      },
      {
        n: 6,
        text: 'catch 依型別配對，const reference 可避免不必要的例外物件複製，並保留多型正確性。',
      },
      {
        n: 7,
        text: '容器（如 std::vector）在重新配置時若移動建構子標記 noexcept，可免除複製備份，達成強異常安全。',
      },
      {
        n: 8,
        text: 'noexcept 移動建構子讓其他程式碼相信「此操作不會丟例外」，是移動語意的關鍵契約。',
      },
      {
        n: 9,
        text: 'const std::exception& 可捕捉標準階層中所有衍生型別，但對非 std::exception 衍生類無效。',
      },
    ],
  },
  deepDive: [
    {
      heading: 'std::exception_ptr 與跨執行緒例外傳遞',
      body: '例外只能沿堆疊向上傳遞，無法自然跨過執行緒邊界。std::exception_ptr 可把當下捕獲的例外打包成可複製、可儲存的控制代碼，透過共享變數傳到另一條執行緒，再呼叫 std::rethrow_exception 讓它在另一條呼叫鏈上重新丟出。std::async 與 std::promise 底層已內建這套機制——當工作執行緒拋出例外時，會自動存進對應的 exception_ptr，等呼叫 future.get() 時再於主執行緒還原。自己拼裝時，通常在工作執行緒入口包一層 try/catch，把 std::current_exception() 塞進 atomic_shared_ptr 或 lock-free queue，主執行緒定期輪詢並處理。',
    },
    {
      heading: 'noexcept 契約的最佳化價值',
      body: '編譯器對 noexcept 函式的呼叫者可省略堆疊展開所需的「登錄／解除登錄」簿記（unwind tables）。這在高頻呼叫路徑（如向量 push_back、交換、移動）可顯著降低二進位體積與執行期開銷。更重要的是，標準容器的強異常安全保證只在元素移動建構子「不拋例外」時才能用移動而非複製；若你的型別的移動可能拋出例外，容器重新配置時會退回复製路徑，效率大減。因此 C++ Core Guidelines（ES.12）建議：移動建構子與移動賦值運算子應標記 noexcept，且不要讓它們拋出例外。',
    },
    {
      heading: '例外安全等級：基本、強、不拋',
      body: 'Sutter 提出的三級安全模型是設計函式介面時的評估框架：（1）基本保證——若發生例外，程式仍處於有效狀態，不會資源洩漏，但物件的狀態可能改變；（2）強保證——若發生例外，物件狀態保持與呼叫前一致（commit-or-rollback），通常靠複製-交換慣用法達成；（3）不拋保證——呼叫絕對不丟例外，通常透過 noexcept 標記並確保內部無抛例外操作。標準庫容器操作通常提供強保證或基本保證；自定義型別應根據使用場景選擇合適的等級，並在文件與測試中驗證。',
    },
  ],
  pitfalls: [
    '捕捉例外時用值（catch by value）而非 const reference，觸發物件切片（slicing），遺失衍生類別的資訊。',
    '使用 catch (...) 但不記錄或重新拋出，把錯誤靜默吃掉，掩蓋真正的問題。',
    '忘記標記移動建構子為 noexcept，導致容器在重新配置時退回复製，效能大幅下降。',
    '在解構子中拋出例外，或 noexcept 函式拋出例外，直接 std::terminate，不留挽救機會。',
    '以例外處理正常控制流程；例外的展開成本遠高於 if-return，不適合高頻率執行路徑。',
    '在 catch 區塊中存取已經被展開解構的區域變數，使用懸置指標或參考。',
  ],
  bestPractices: [
    '捕捉例外一律用 const reference（catch (const SomeType& e)），避免切片與不必要的複製。',
    '移動建構子與移動賦值運算子標記 noexcept，並確保內部不會拋出例外。',
    '不要讓例外用於控制流程；它是錯誤報告機制，不是分支語法。',
    '需要跨執行緒傳遞例外時，用 std::exception_ptr 而非自行序列化錯誤碼。',
    '設計函式時明確標註例外安全等級（基本／強／不拋），並在文件與單元測試中驗證例外路徑。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '移動建構子標記 noexcept 的主要價值是什麼？',
      options: [
        { id: 'a', text: '移動變得更快，因為 noexcept 會啟用特殊的 CPU 指令' },
        {
          id: 'b',
          text: '編譯器與標準容器信任此操作不拋例外，可省略複製備份、直接移動元素，達成強異常安全',
        },
        { id: 'c', text: 'noexcept 讓移動建構子可以被虛擬函式覆寫' },
        { id: 'd', text: '標記 noexcept 後，建構子就不需要初始化成員變數' },
      ],
      correctOptionId: 'b',
      explanation:
        '標準容器（如 vector）只有在元素移動建構子 noexcept 時，重新配置才會用移動而非複製；否則必須退回复製以保全強異常安全承諾。',
    },
    {
      id: 'q2',
      stem: '下列哪個 catch 寫法能正確捕捉 std::runtime_error 及其所有衍生型別，且不觸發物件切片？',
      options: [
        { id: 'a', text: 'catch (std::exception e) { ... }' },
        { id: 'b', text: 'catch (const std::exception& e) { ... }' },
        { id: 'c', text: 'catch (std::exception* e) { ... }' },
        { id: 'd', text: 'catch (std::exception&& e) { ... }' },
      ],
      correctOptionId: 'b',
      explanation:
        'const reference 避免例外物件複製與切片，且容許多型 dispatch，讓 e.what() 正確呼叫到衍生類別版本。',
    },
    {
      id: 'q3',
      stem: '在 noexcept 函式內部拋出例外會發生什麼事？',
      options: [
        { id: 'a', text: '例外會正常往上傳遞到上一層 try/catch' },
        { id: 'b', text: '直接呼叫 std::terminate()，不展開堆疊' },
        { id: 'c', text: '編譯器會發出警告但程式繼續執行' },
        { id: 'd', text: '只有釋放 local 物件後才終止' },
      ],
      correctOptionId: 'b',
      explanation:
        'noexcept 是嚴格契約：函式內部若拋出例外，不會嘗試堆疊展開，而是立刻呼叫 std::terminate() 終止程式。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['throw', '堆疊展開', 'RAII 解構', 'catch', '恢復'],
    caption:
      '例外傳遞流程：throw 建立例外物件，堆疊沿路展開並解構區域資源，直到遇上匹配的 catch；正確使用 noexcept 可避免不必要的容錯路徑開銷。',
  },
  tryIt: {
    code: `#include <iostream>
#include <stdexcept>
#include <vector>

struct SafeBuffer {
    std::vector<int> data;
    SafeBuffer(SafeBuffer&& other) noexcept
        : data(std::move(other.data)) {}
};

void mayThrow(bool shouldThrow) {
    if (shouldThrow) {
        throw std::runtime_error("something went wrong!");
    }
}

int main() {
    try {
        mayThrow(true);
    } catch (const std::exception& e) {
        std::cout << "Caught: " << e.what() << "\\n";
    }
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Exceptions - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/exceptions',
      description: 'throw、try、catch 的完整語言規則與堆疊展開行為。',
    },
    {
      title: 'noexcept specifier - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/noexcept_spec',
      description: 'noexcept 契約語法、查詢與最佳化語意。',
    },
    {
      title: 'std::exception_ptr - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/error/exception_ptr',
      description: '跨執行緒/回呼邊界安全傳遞例外的標準機制。',
    },
  ],
};

export default ch08Exceptions;
