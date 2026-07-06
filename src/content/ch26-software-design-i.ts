import type { ChapterContent } from '@/types/ChapterContent';

const ch26SoftwareDesignI: ChapterContent = {
  slug: 'ch26-software-design-i',
  chapterLabel: 'Ch.26',
  title: '軟體設計 I：SOLID 與 GEMM',
  group: 'G · 軟體設計與工具',
  description:
    'SOLID 原則、BLAS GEMM 案例分析與值/參考語意的取捨：如何在效能敏感的 C++ 中兼顧良好設計。',
  concept: {
    standard: 'C++23',
    body:
      'SOLID 是物件導向設計的五項原則：單一職責（SRP）、開放封閉（OCP，對擴充開放、對修改封閉）、里氏替換（LSP，衍生型別可替換基底而不破壞正確性）、介面隔離（ISP，別強迫依賴用不到的介面）、依賴反轉（DIP，依賴抽象而非具體）。在高效能運算（如 BLAS 的 GEMM，矩陣乘法 C = αAB + βC）中，抽象與效能常需權衡：過度虛擬化會阻礙內聯與向量化，因此熱路徑常改用樣板／CRTP 的靜態多型、以資料佈局（列優先與分塊）和 SIMD 榨取效能，而在較外層才保留彈性的抽象邊界。值語意（複製、可推理、無別名）與參考語意（共享、可變、需注意生命週期）的選擇，直接影響正確性與效能：預設偏好值語意，只有在需要共享或多型時才用參考／指標。',
  },
  code: {
    lang: 'cpp',
    code: `#include <print>
#include <vector>

// 依賴反轉：高階演算法依賴抽象介面，而非特定實作。 [1]
struct Kernel {
  virtual ~Kernel() = default;
  virtual void gemm(int n, const float* A, const float* B, float* C) const = 0;
};

// 單一職責：這個實作只負責一種 GEMM 策略。 [2]
struct NaiveGemm : Kernel {
  void gemm(int n, const float* A, const float* B, float* C) const override {
    for (int i = 0; i < n; ++i)          // [3] 列優先、快取友善的迴圈順序
      for (int k = 0; k < n; ++k) {
        float a = A[i * n + k];
        for (int j = 0; j < n; ++j)
          C[i * n + j] += a * B[k * n + j]; // [4] 內層連續存取 B 與 C
      }
  }
};

// 開放封閉：新增策略只需新增型別，不必修改既有程式。 [5]
void run(const Kernel& k, int n,
         const std::vector<float>& A, const std::vector<float>& B,
         std::vector<float>& C) {
  k.gemm(n, A.data(), B.data(), C.data());
}`,
    callouts: [
      { n: 1, text: '依賴反轉（DIP）：run 依賴抽象的 Kernel 介面，可替換任何具體實作。' },
      { n: 2, text: '單一職責（SRP）：NaiveGemm 只封裝一種矩陣乘法策略，職責清楚。' },
      { n: 3, text: 'i-k-j 迴圈順序讓內層對 B、C 皆為連續存取，比 i-j-k 更快取友善。' },
      { n: 4, text: '把 A[i][k] 提到內層之外，內層只做連續的 fused multiply-add，利於向量化。' },
      { n: 5, text: '開放封閉（OCP）：要加入分塊或 SIMD 版本，只需新增 Kernel 子型別，無須改動 run。' },
    ],
  },
  deepDive: [
    {
      heading: '抽象的成本與擺放位置',
      body:
        '抽象應放在變化頻繁、非效能關鍵的邊界，而非緊迴圈內。執行期虛擬多型有間接呼叫成本；效能關鍵處可改用靜態多型（樣板／CRTP）或 policy-based design，在編譯期解析並保留內聯。\n\n關鍵原則：在外層保留彈性的抽象邊界，在內層熱路徑追求具體與零成本。過早或過度抽象會同時傷害效能與可讀性。',
    },
    {
      heading: 'GEMM 的最佳化階梯',
      body:
        '天真的三重迴圈 GEMM 遠低於硬體峰值。專業 BLAS 透過分塊／tiling（切成放得進快取的區塊）、資料打包（packing 成連續且對齊）、暫存器分塊、向量化與多執行緒逐層逼近峰值。\n\n這說明「相同的漸進複雜度，實作差異可達數十倍」。工業上除非有特殊需求，應直接採用廠商 BLAS（如 OpenBLAS、MKL、hipBLASLt），而非自行重寫。',
    },
    {
      heading: '值語意與 API 設計',
      body:
        '值語意（複製、無別名、易推理）應為預設，讓函式易於測試與並行；需要共享或多型時才引入參考／指標並釐清所有權。函式介面以 `std::span`／`std::string_view` 接受唯讀序列，避免不必要的樣板化與複製。\n\n清楚的所有權與最小化的可變共享狀態，是既正確又高效設計的基礎。',
    },
  ],
  pitfalls: [
    '為了「設計感」套用過多模式，增加複雜度卻無實質收益。',
    '在內層熱迴圈使用虛擬呼叫，阻礙內聯與向量化。',
    '過早抽象，鎖死了尚未穩定的介面。',
    '自行手寫 GEMM 等核心，效能遠不及成熟的廠商 BLAS。',
  ],
  bestPractices: [
    '預設值語意；抽象放在模組邊界而非熱路徑。',
    '效能關鍵處用靜態多型（樣板／CRTP／policy）取代虛擬呼叫。',
    '線性代數等核心直接採用廠商 BLAS，別重造輪子。',
    '以剖析驅動設計，釐清所有權並最小化可變共享狀態。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: 'SOLID 中的「O」代表哪一項原則？',
      options: [
        { id: 'a', text: 'Object 原則：一切皆物件' },
        { id: 'b', text: '開放封閉原則：對擴充開放、對修改封閉' },
        { id: 'c', text: 'Override 原則：所有函式都應可覆寫' },
        { id: 'd', text: 'Optimization 原則：永遠先最佳化' },
      ],
      correctOptionId: 'b',
      explanation:
        'OCP（Open-Closed Principle）主張以擴充（新增型別）而非修改既有程式碼來加入行為。參見 Ch.26 PDF 第 20 頁。',
    },
    {
      id: 'q2',
      stem: '在效能關鍵的 GEMM 熱路徑中，為何常避免執行期虛擬函式而改用樣板／CRTP？',
      options: [
        { id: 'a', text: '虛擬函式在 C++23 被移除' },
        { id: 'b', text: '虛擬呼叫的間接跳轉會阻礙內聯與向量化，靜態多型可保留這些最佳化' },
        { id: 'c', text: '樣板一定比較省記憶體' },
        { id: 'd', text: 'CRTP 會自動平行化' },
      ],
      correctOptionId: 'b',
      explanation:
        '熱路徑中的虛擬呼叫難以內聯、妨礙向量化；以樣板／CRTP 的靜態多型可在編譯期解析並保留最佳化。參見 Ch.26 PDF 第 44 頁。',
    },
    {
      id: 'q3',
      stem: '關於值語意與參考語意，通常建議的預設是什麼？',
      options: [
        { id: 'a', text: '一律使用原始指標' },
        { id: 'b', text: '預設偏好值語意（易推理、無別名），只有需要共享或多型時才用參考／指標' },
        { id: 'c', text: '一律使用全域變數' },
        { id: 'd', text: '永遠避免複製，全部用參考' },
      ],
      correctOptionId: 'b',
      explanation:
        '值語意易於推理且無別名問題，應為預設；共享狀態或多型需求才引入參考／指標並注意生命週期。參見 Ch.26 PDF 第 52 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['SRP', 'OCP', 'LSP', 'ISP/DIP'],
    caption:
      'SOLID 五原則：單一職責、開放封閉、里氏替換、介面隔離與依賴反轉，共同支撐可維護的設計。',
  },
  tryIt: {
    code: `#include <iostream>
#include <vector>

// 簡化的 GEMM：比較 i-j-k 與 i-k-j 的快取友善度差異。
void gemm_ikj(int n, const std::vector<float>& A,
              const std::vector<float>& B, std::vector<float>& C) {
  for (int i = 0; i < n; ++i)
    for (int k = 0; k < n; ++k) {
      float a = A[i*n+k];
      for (int j = 0; j < n; ++j)
        C[i*n+j] += a * B[k*n+j];
    }
}

int main() {
  int n = 64;
  std::vector<float> A(n*n, 1.0f), B(n*n, 1.0f), C(n*n, 0.0f);
  gemm_ikj(n, A, B, C);
  std::cout << "C[0] = " << C[0] << " (應為 " << n << ")\\n";
  return 0;
}`,
  },
  furtherReading: [
    {
      title: 'SOLID - Wikipedia',
      href: 'https://en.wikipedia.org/wiki/SOLID',
      description: 'SOLID 五原則的概念與範例概覽。',
    },
    {
      title: 'BLAS (Basic Linear Algebra Subprograms)',
      href: 'https://www.netlib.org/blas/',
      description: 'GEMM 等基礎線性代數常式的標準定義。',
    },
    {
      title: 'Modern C++ Programming — Software Design I (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/26.Design_I.html',
      description: 'Busato 課程第 26 章 HTML 投影片，涵蓋 SOLID 與 GEMM 原文。',
    },
  ],
};

export default ch26SoftwareDesignI;
