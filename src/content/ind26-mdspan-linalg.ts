import type { ChapterContent } from '@/types/ChapterContent';

const ind26MdspanLinalg: ChapterContent = {
  slug: 'ind26-mdspan-linalg',
  chapterLabel: '第 55 章',
  title: 'std::mdspan 與 std::linalg（C++23／C++26, P1673）',
  group: '第 16 部：數值核心與可重現性',
  description:
    'std::mdspan 的多維非擁有視圖與 layout/accessor，std::linalg 可攜 BLAS 抽象與退回廠商 BLAS 的時機。',
  concept: {
    standard: 'C++23',
    body: 'std::mdspan（C++23）把 std::span（第 19 章）的「非擁有連續視圖」概念推廣到多維：它是一個輕量的 (data_handle, mapping, accessor) 三元組，讓既有的一維緩衝區能以矩陣、張量的形式被索引，而不複製、不擁有記憶體。layout policy（layout_right 列優先、layout_left 行優先、layout_stride 任意步幅）把「邏輯索引」轉成「線性偏移」，accessor policy 則控制實際的記憶體存取方式（例如原子存取或型別轉換）。std::linalg（P1673，目標 C++26，部分實作已可用）建立在 mdspan 之上，提供可攜的 BLAS 風格演算法（matrix_product、dot、scaled 等），語意對齊業界 BLAS 但以 C++ 範本與 mdspan 表達，可在缺乏廠商函式庫時提供合理預設，效能關鍵路徑則應retarget 到 rocBLAS／cuBLAS／MKL 等已針對硬體調校多年的實作。',
  },
  code: {
    lang: 'cpp',
    code: `#include <mdspan>
#include <print>
#include <vector>

using Extents2D = std::dextents<size_t, 2>;
using MatrixView = std::mdspan<float, Extents2D>;  // [1] layout_right 為預設
using ConstMatrixView = std::mdspan<const float, Extents2D>;

// 以 mdspan 表達的天真 GEMM：C += A * B，維度由 extents 攜帶。 [2]
void gemm_naive(ConstMatrixView a, ConstMatrixView b, MatrixView c) {
    const size_t n = a.extent(0);
    const size_t k_dim = a.extent(1);
    const size_t m = b.extent(1);

    for (size_t i = 0; i < n; ++i) {
        for (size_t k = 0; k < k_dim; ++k) {
            const float a_ik = a(i, k);  // [3] operator() 取代手算 i * ld + k
            for (size_t j = 0; j < m; ++j) {
                c(i, j) += a_ik * b(k, j);  // [4] 內層對 b、c 皆連續存取（layout_right）
            }
        }
    }
}

// 1D stencil：以 mdspan 表達邊界安全的三點平均。 [5]
void stencil_1d(std::mdspan<const float, std::dextents<size_t, 1>> in,
                std::mdspan<float, std::dextents<size_t, 1>> out) {
    const size_t n = in.extent(0);
    for (size_t i = 1; i + 1 < n; ++i) {
        out(i) = 0.25f * in(i - 1) + 0.5f * in(i) + 0.25f * in(i + 1);  // [6]
    }
}

int main() {
    constexpr size_t n = 4;
    std::vector<float> a(n * n, 1.0f), b(n * n, 2.0f), c(n * n, 0.0f);

    // mdspan 不擁有記憶體：底層仍是 vector<float> 的連續儲存。
    gemm_naive(ConstMatrixView(a.data(), n, n), ConstMatrixView(b.data(), n, n),
               MatrixView(c.data(), n, n));

    std::println("c(0, 0) = {}", c[0]);
    return 0;
}`,
    callouts: [
      {
        n: 1,
        text: 'std::dextents<size_t, 2> 表示兩個維度皆為執行期動態長度；mdspan 預設 layout 為 layout_right（列優先，與 C 陣列一致）。',
      },
      {
        n: 2,
        text: '函式簽名以 mdspan 攜帶維度資訊，呼叫端不再需要另外傳 n、m、k 或手算 stride。',
      },
      {
        n: 3,
        text: 'a(i, k) 由 mapping（layout policy）轉成線性偏移，再交給 accessor 讀取，取代手寫的 a[i * lda + k]。',
      },
      {
        n: 4,
        text: 'i-k-j 迴圈順序讓內層對 b(k, j) 與 c(i, j) 皆為連續記憶體存取，對 layout_right 的資料快取友善。',
      },
      {
        n: 5,
        text: '一維 mdspan 讓 stencil 的邊界條件（i 從 1 到 n-2）清楚可見，不必記憶原始指標的偏移規則。',
      },
      {
        n: 6,
        text: '權重固定的三點平均；生產程式碼常再以 std::linalg 或向量化版本取代這種純量迴圈。',
      },
    ],
  },
  deepDive: [
    {
      heading: 'mdspan：從一維視圖到多維視圖',
      body: '`std::span`（第 19 章）只能表達一維、連續的「指標 + 長度」；一旦資料邏輯上是矩陣或張量，過去只能靠手算 `i * lda + j` 這類線性化索引，容易寫錯 stride 或搞混列/行主序。`std::mdspan` 把這個問題結構化：它由三個部分組成——`data_handle`（指向底層記憶體，通常是原始指標）、`mapping`（依 layout policy 把多維索引轉成線性偏移）、`accessor`（決定如何真正讀寫記憶體）。`mdspan` 本身仍是非擁有視圖，語意上是 span 的多維推廣，而非容器。',
    },
    {
      heading: 'layout policy：row-major、col-major、strided、tiled',
      body: '`layout_right` 是預設佈局，最後一個維度變化最快，對應 C／C++ 陣列的列優先（row-major）慣例。`layout_left` 則是行優先（column-major），對應 Fortran 與傳統 BLAS／LAPACK 的記憶體序，用來直接包裝呼叫 Fortran BLAS 的緩衝區而不必轉置。`layout_stride` 允許任意步幅，可表達子矩陣視圖（例如從大矩陣中切出一塊而不複製）或對齊填充（padding）後的列。\n\n更進階的自訂 layout（例如切成小塊、對 cache line 對齊的 tiled layout）可以把資料按快取區塊重新排列，讓 GEMM 這類演算法在存取時天然具有區域性；標準未內建 tiled layout，但 mapping policy 是一個可自訂的 customization point，函式庫或使用者可自行實作符合 `LayoutMapping` 概念的型別。',
    },
    {
      heading: 'accessor policy：存取的自訂點',
      body: '`accessor_policy` 決定「拿到線性偏移之後，如何真正讀寫該筆資料」，預設的 `default_accessor<T>` 就是普通的指標解參考。這個層次可以插入額外語意：例如把讀寫包成 `std::atomic_ref` 以支援多執行緒安全存取、在讀取時做型別轉換或量化解碼（把底層 `int8_t` 解讀成縮放後的 `float`），或加入邊界檢查版本供除錯建置使用。\n\nlayout 與 accessor 是正交的兩個 customization point：同一份 layout 可以搭配不同 accessor，反之亦然，這讓 mdspan 能同時服務「純索引運算」與「特殊記憶體語意」兩種需求，而不必為每種組合寫專門的容器型別。',
    },
    {
      heading: 'std::linalg（P1673）與退回廠商 BLAS 的時機',
      body: '`std::linalg`（P1673，鎖定 C++26，部分編譯器／函式庫已提供早期實作）在 mdspan 之上定義一組 BLAS 風格演算法：`dot`、`scale`、`matrix_product`（GEMM）、三角求解等，介面以 mdspan 表達運算元，語意可攜、型別安全，且不需要外部函式庫即可編譯連結。它適合作為「隨標準庫附帶的合理預設」，或用在可攜性優先於極致效能的場合。\n\n但 std::linalg 的參考實作通常不會達到硬體峰值：真正的效能來自針對特定 ISA、快取階層與 GPU 架構調校多年的廠商函式庫——AMD GPU 上的 rocBLAS、NVIDIA GPU 上的 cuBLAS、x86 CPU 上的 Intel MKL（或 OpenBLAS）。工業實務上常見的模式是：介面以 mdspan／std::linalg 的形式撰寫，讓程式碼可攜且可讀；效能關鍵的呼叫點則在建置時依目標硬體 dispatch 到對應的廠商 BLAS，必要時把 mdspan 的 data handle 直接傳給廠商 API（它們大多也接受裸指標 + leading dimension，與 mdspan 的 mapping 資訊一一對應）。',
    },
    {
      heading: '重寫 GEMM／stencil：索引清晰度而非新演算法',
      body: '把本書貫穿全書的 GEMM 範例（第 26 章軟體設計章節、第 19 章 span）改寫成 mdspan 版本，重點不在改變演算法本身（i-k-j 迴圈順序、分塊、向量化等最佳化仍然適用），而是讓函式簽名攜帶維度與佈局資訊：`gemm(mdspan<const float, dextents<size_t,2>> a, ...)` 取代 `gemm(int n, const float* a, ...)`，呼叫端不再需要另外傳長度與 stride，也不會把列優先與行優先搞混。同樣地，stencil 的邊界條件（例如 1D 三點平均只在 `[1, n-2]` 上有效）用 `extent(0)` 表達比裸指標加迴圈更不容易寫錯。這種「索引清晰度」的收益在多維、多層迴圈的數值核心中尤其明顯。',
    },
  ],
  pitfalls: [
    '誤以為 `mdspan` 擁有並管理記憶體——它和 `span` 一樣是非擁有視圖，底層緩衝區的生命週期需自行管理，`mdspan` 懸置時使用即為未定義行為。',
    '選錯 layout policy：把行優先（Fortran／傳統 BLAS）的資料當成預設 `layout_right` 存取，會得到錯誤結果或極差的快取行為（跨步幅存取）。',
    '為了「可攜」而在效能關鍵路徑手刻 GEMM／三角求解等 BLAS 級核心，卻不使用廠商函式庫，效能可能落後數十倍。',
    '把 `std::linalg` 參考實作當成生產級高效能函式庫直接上線，忽略了它與 rocBLAS／cuBLAS／MKL 之間仍存在顯著效能落差。',
    '自訂 accessor 或 layout 時破壞了 `LayoutMapping`／`Accessor` 概念要求的不變式（例如映射非單射），導致別名或越界存取。',
  ],
  bestPractices: [
    '用 `mdspan` 取代手算線性索引（`i * lda + j`），讓多維數值程式碼的維度與步幅資訊由型別攜帶。',
    '介接 Fortran／傳統 BLAS 記憶體時明確指定 `layout_left`，介接 C 慣例陣列時用預設的 `layout_right`，避免佈局誤判。',
    '效能關鍵的線性代數呼叫優先 dispatch 到廠商 BLAS（rocBLAS／cuBLAS／MKL），`std::linalg` 留給可攜性優先或無廠商函式庫可用的場合。',
    '需要子矩陣視圖或帶 padding 的資料時用 `layout_stride`，而不是複製資料或重新設計容器。',
    '自訂 accessor（原子存取、型別轉換）前先確認標準的 layout／accessor 概念要求，避免違反單射性等不變式。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '關於 std::mdspan 與 std::span 的關係，下列何者正確？',
      options: [
        { id: 'a', text: 'mdspan 擁有並複製底層資料，span 則不擁有' },
        {
          id: 'b',
          text: 'mdspan 是把 span 的非擁有連續視圖概念推廣到多維，兩者都不擁有底層記憶體',
        },
        { id: 'c', text: 'mdspan 只能用於 GPU 記憶體，span 只能用於 CPU 記憶體' },
        { id: 'd', text: 'mdspan 是 span 的子類別，繼承其邊界檢查行為' },
      ],
      correctOptionId: 'b',
      explanation:
        'mdspan 與 span 一樣是非擁有視圖，差別在於 mdspan 透過 layout policy 支援多維索引；兩者的生命週期都依附於底層緩衝區。',
    },
    {
      id: 'q2',
      stem: '在效能關鍵的矩陣乘法（GEMM）場合，為何通常建議退回廠商 BLAS（如 rocBLAS／cuBLAS／MKL）而非只用 std::linalg？',
      options: [
        { id: 'a', text: '因為 std::linalg 語法上不支援矩陣乘法' },
        {
          id: 'b',
          text: '因為廠商 BLAS 針對特定硬體的快取階層、SIMD／張量核心與多執行緒調校多年，效能通常遠優於可攜的參考實作',
        },
        { id: 'c', text: '因為 mdspan 無法傳遞給廠商 BLAS 的 API' },
        { id: 'd', text: '因為廠商 BLAS 不需要正確的 layout 資訊' },
      ],
      correctOptionId: 'b',
      explanation:
        'std::linalg 提供可攜且型別安全的預設實作，但真正逼近硬體峰值仍需依賴針對目標架構深度調校的廠商 BLAS；mdspan 的 data handle 與 stride 資訊通常可直接對應到這些 API 的參數。',
    },
    {
      id: 'q3',
      stem: '若某資料緩衝區依照 Fortran／傳統 BLAS 慣例以行優先（column-major）儲存，用 mdspan 檢視時應如何處理？',
      options: [
        { id: 'a', text: '直接用預設的 layout_right 檢視，結果不受影響' },
        { id: 'b', text: '明確指定 layout_left，讓索引到線性偏移的映射符合行優先儲存' },
        { id: 'c', text: '一律先複製一份轉成列優先才能使用 mdspan' },
        { id: 'd', text: 'mdspan 不支援行優先資料，必須改用 std::span' },
      ],
      correctOptionId: 'b',
      explanation:
        'layout_left 對應行優先（column-major）記憶體序；若誤用預設的 layout_right 檢視行優先資料，索引到偏移的映射會不正確，導致錯誤結果或跨步幅的低效存取。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['mdspan', 'layout', 'accessor', 'std::linalg'],
    caption:
      'mdspan 由 layout（索引到偏移的映射）與 accessor（實際讀寫）組成非擁有多維視圖，std::linalg 在其上提供可攜 BLAS 風格演算法，效能關鍵路徑再退回廠商 BLAS。',
  },
  tryIt: {
    code: `#include <iostream>
#include <mdspan>
#include <vector>

using MatrixView = std::mdspan<float, std::dextents<size_t, 2>>;
using ConstMatrixView = std::mdspan<const float, std::dextents<size_t, 2>>;

void gemm_naive(ConstMatrixView a, ConstMatrixView b, MatrixView c) {
    const size_t n = a.extent(0);
    const size_t k_dim = a.extent(1);
    const size_t m = b.extent(1);
    for (size_t i = 0; i < n; ++i) {
        for (size_t k = 0; k < k_dim; ++k) {
            const float a_ik = a(i, k);
            for (size_t j = 0; j < m; ++j) c(i, j) += a_ik * b(k, j);
        }
    }
}

int main() {
    constexpr size_t n = 3;
    std::vector<float> a(n * n, 1.0f), b(n * n, 2.0f), c(n * n, 0.0f);
    gemm_naive(ConstMatrixView(a.data(), n, n), ConstMatrixView(b.data(), n, n),
               MatrixView(c.data(), n, n));
    std::cout << "c(0, 0) = " << c[0] << " (應為 " << n * 2 << ")\\n";
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::mdspan - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/container/mdspan',
      description: 'mdspan 的類別介面、layout policy 與 accessor policy 詳細說明。',
    },
    {
      title: 'P1673: A free function linear algebra interface based on the BLAS',
      href: 'https://wg21.link/P1673',
      description: 'std::linalg 的原始提案，定義基於 mdspan 的可攜 BLAS 介面。',
    },
    {
      title: 'rocBLAS Documentation',
      href: 'https://rocm.docs.amd.com/projects/rocBLAS/en/latest/',
      description: 'AMD GPU 上的高效能 BLAS 實作，效能關鍵路徑的退回目標之一。',
    },
    {
      title: 'oneMKL (Intel Math Kernel Library)',
      href: 'https://www.intel.com/content/www/us/en/docs/onemkl/get-started-guide/current/overview.html',
      description: 'x86 CPU 上針對硬體深度調校的線性代數函式庫。',
    },
  ],
};

export default ind26MdspanLinalg;
