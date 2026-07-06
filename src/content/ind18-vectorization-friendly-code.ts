import type { ChapterContent } from '@/types/ChapterContent';

const ind18VectorizationFriendlyCode: ChapterContent = {
  slug: 'ind18-vectorization-friendly-code',
  chapterLabel: '第 47 章',
  title: '對編譯器與 CPU 友善的程式碼',
  group: '第 13 部：資料平行與向量化',
  description:
    '向量化障礙：別名、分支、非連續存取，restrict 語意、對齊、prefetch，以及判讀編譯器向量化報告。',
  concept: {
    standard: 'C++20',
    body: '自動向量化要求編譯器證明一個純量迴圈可以安全地改寫成一次處理多個元素的 SIMD 版本。這個證明最常在三個地方卡關：指標別名（compiler 不能確定兩個指標是否指向重疊記憶體）、迴圈內的分支（每個 lane 的控制流可能不同）、以及非連續（strided）記憶體存取（SIMD load/store 天生偏好連續記憶體）。本章不談明確的 `std::simd` 或 intrinsics，而是談如何寫「看起來平凡」的純量程式碼，卻能讓編譯器的自動向量化器（auto-vectorizer）安心接手：透過 `__restrict` 消除別名疑慮、透過對齊與 prefetch 降低記憶體延遲、透過迴圈變換（tiling／unrolling／fusion）改善資料重用與指令層級平行度，並學會讀懂編譯器吐出的向量化診斷報告，才能對症下藥而非盲目試錯。',
  },
  deepDive: [
    {
      heading: '別名（aliasing）：向量化的頭號障礙',
      body: '與 Fortran 不同，C／C++ 標準並未假設兩個指標必然指向不重疊的記憶體。給定 `void f(float* a, float* b, int n) { for (int i = 0; i < n; ++i) a[i] += b[i]; }`，編譯器必須考慮「若 `a` 與 `b` 部分重疊」的最壞情況——例如 `a == b + 1`——此時把迴圈拆成向量化版本可能讀到尚未寫入或已被覆寫的資料，結果與純量版本不同。只要存在這種可能性，多數編譯器會保守地放棄向量化，或退化為先檢查執行期重疊（runtime alias check）再選擇向量化或純量路徑，多出的分支與檢查本身也有成本。\n\n解法是明確承諾「這兩個指標不會重疊」，讓編譯器把最壞情況直接排除。GCC／Clang 提供 `__restrict`（C99 `restrict` 的非標準 C++ 擴充，尚未被 C++ 標準採納，但主流編譯器廣泛支援）：把函式簽名寫成 `void f(float* __restrict a, const float* __restrict b, int n)`，等於程式設計者向編譯器保證「在這個作用域內，只會透過 `a` 存取該記憶體，透過 `b` 存取另一塊記憶體，兩者不重疊」。這是一份契約：若違反（呼叫時傳入重疊的指標），行為未定義。因此 `__restrict` 不是「讓編譯器自己想辦法」，而是工程師承擔正確性責任以換取效能。搭配 `const` 修飾唯讀指標，也能進一步幫助別名分析。',
    },
    {
      heading: '分支與非連續存取：次要但常見的障礙',
      body: '迴圈內的資料相依分支（data-dependent branch）會讓向量化器必須為「條件為真」與「條件為假」兩種 lane 分別產生遮罩（mask）並合併結果，這在 AVX-512 等具備遮罩暫存器的架構上尚可行，但在較舊的 SSE／AVX2 上代價高昂，許多編譯器乾脆放棄。常見的補救是把分支改寫成無分支（branchless）運算：例如把 `if (x > 0) y = x; else y = 0;` 改寫成 `y = x > 0 ? x : 0;` 甚至用位元遮罩、`std::max(x, 0.0f)` 或查表法表達，讓每個 lane 執行相同指令、只是資料不同，這正是 SIMD 硬體最擅長的模式。\n\n非連續（strided）存取，例如 `for (int i = 0; i < n; ++i) sum += a[i * stride];`，即使沒有分支也可能無法有效向量化：SIMD 的 load/store 指令偏好連續記憶體，跨步存取需要 gather／scatter 指令（若硬體支援）才能一次載入多個不連續元素，而 gather／scatter 通常比連續 load 慢上數倍，甚至讓編譯器判定「向量化不划算」而放棄。實務上最有效的對策不是硬凹向量化器，而是重新設計資料佈局（例如把 AoS 改成 SoA），讓熱路徑存取本質上就是連續的。',
    },
    {
      heading: '對齊與 prefetch：降低記憶體延遲',
      body: '即使邏輯上可以向量化，若資料未對齊到 SIMD 寬度（例如 AVX2 的 32 位元組、AVX-512 的 64 位元組），編譯器可能得使用較慢的「未對齊 load／store」指令，或在迴圈前後插入處理未對齊邊界的純量「peel loop」。使用 `alignas(32)` 宣告陣列、或以對齊配置器／`std::aligned_alloc` 取得對齊記憶體，能讓編譯器直接產生對齊的 SIMD 指令，省去執行期的對齊檢查與邊界處理分支。\n\n`__builtin_prefetch`（GCC／Clang 內建函式）可以在存取某個位址之前提示硬體「請提前把它載入快取」，對於存取模式規律但硬體預取器猜不準的情況（例如跨步較大的走訪、鏈結串列般的間接存取）能有效隱藏記憶體延遲。但 prefetch 不是免費午餐：過早或過度的 prefetch 會污染快取、擠掉真正有用的資料，因此應該只在剖析證實記憶體延遲是瓶頸、且存取位址可預先算出的熱路徑上謹慎使用，並以基準測試驗證效果。',
    },
    {
      heading: '迴圈變換直覺：tiling、unrolling、fusion',
      body: '分塊（tiling／blocking）把大型迴圈依資料能放進快取的大小切成小區塊，讓區塊內的資料在被逐出快取前被重複使用；矩陣乘法等記憶體受限的核心，適當的分塊往往比單純向量化帶來更大的加速，因為它解決的是記憶體頻寬瓶頸而非指令吞吐瓶頸。可以把它想像成：與其把整本書從頭到尾翻一次找某些字（每次都要重新翻頁），不如把書拆成幾個章節、一次專心讀完一章的所有查詢再翻頁。\n\n展開（unrolling）把迴圈本體重複多次、減少迴圈計數與跳轉的額外負擔，同時讓多個獨立的運算同時「攤開」在指令流中，釋放指令層級平行度（ILP）並讓向量化器有更大的窗口可以打包成更寬的 SIMD 指令。但展開並非越多越好：展開過度會膨脹程式碼、增加指令快取（icache）壓力，也可能耗盡可用暫存器導致溢位（register spill），反而拖慢速度——這通常交給編譯器的 `-funroll-loops` 或 `#pragma unroll` 微調，並以量測決定展開因子。\n\n融合（fusion）把兩個各自走訪同一份資料的獨立迴圈合併成一個迴圈，讓資料只需從記憶體讀取一次、留在快取或暫存器中被兩個運算共用，減少記憶體流量；相對地，「迴圈分裂（fission）」則是反向操作，在向量化器因單一迴圈過於複雜而放棄時，把它拆開讓每個子迴圈都更容易被向量化。這三種變換沒有絕對優劣，需視瓶頸是「記憶體頻寬」還是「向量化難度」而定。',
    },
    {
      heading: '判讀編譯器向量化報告',
      body: '猜測「這個迴圈為什麼沒有向量化」效率很低，應該直接讓編譯器說明原因。GCC 提供 `-fopt-info-vec`（列出成功向量化的迴圈）與 `-fopt-info-vec-missed`（列出失敗的迴圈與原因），例如 `g++ -O3 -march=native -fopt-info-vec-missed=missed.txt file.cpp` 會產生類似「`not vectorized: unsupported data-ref` 」或「`versioning for alias required`」的訊息，前者常對應非連續存取，後者代表編譯器需要在執行期插入別名檢查（可用 `__restrict` 消除）。\n\nClang／LLVM 則用 `-Rpass=loop-vectorize` 回報成功向量化的迴圈、`-Rpass-missed=loop-vectorize` 回報失敗的迴圈，並用 `-Rpass-analysis=loop-vectorize` 給出更詳細的分析（例如「loop not vectorized: cannot prove it is safe to reorder memory operations」直接點名別名問題，或「the cost-model indicates that vectorization is not beneficial」代表向量化在成本模型下不划算，通常是因為迴圈太短或存取太不規律）。搭配 `-g` 編譯並開啟這些旗標，訊息會標註在原始碼的哪一行，讓你能精準定位並針對性地加上 `__restrict`、改變資料佈局或調整迴圈結構，而不是反覆嘗試整份檔案的各種寫法。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <cstddef>

// 未加 __restrict：編譯器必須假設 y 與 x 可能重疊，
// 因而無法安全地向量化這個迴圈（除非插入執行期別名檢查）。
void axpy_unsafe(float* y, const float* x, float a, int n) {
    for (int i = 0; i < n; ++i) y[i] = a * x[i] + y[i];
}

// 加上 __restrict：向編譯器承諾 y 與 x 指向不重疊的記憶體，
// 讓自動向量化器可以放心地一次處理多個元素。 [1]
void axpy(float* __restrict y, const float* __restrict x, float a, int n) {
    // [2] const 修飾唯讀指標，進一步協助別名分析。
    for (int i = 0; i < n; ++i) y[i] = a * x[i] + y[i];  // [3] 無分支、連續存取，SIMD 友善
}

// alignas 讓緩衝區對齊到常見 SIMD 寬度（32 位元組 = AVX2）， [4]
// 避免編譯器插入未對齊 load/store 或邊界處理的 peel loop。
alignas(32) float buffer_x[1024];
alignas(32) float buffer_y[1024];

// 分塊（tiling）示例：以固定大小的區塊走訪，讓每個區塊 [5]
// 的資料在被逐出快取前被重複使用，改善記憶體受限核心的效能。
void scale_tiled(float* __restrict data, std::size_t n, float factor) {
    constexpr std::size_t kTile = 256;  // 依實際快取大小調整
    for (std::size_t base = 0; base < n; base += kTile) {
        const std::size_t end = base + kTile < n ? base + kTile : n;
        // [6] 預取下一個區塊的起點，隱藏記憶體延遲
        __builtin_prefetch(&data[end], 0, 1);
        for (std::size_t i = base; i < end; ++i) data[i] *= factor;
    }
}`,
    callouts: [
      {
        n: 1,
        text: '__restrict 是 GCC/Clang 對 C99 restrict 的 C++ 擴充：承諾 y、x 不重疊，消除別名分析的最壞情況假設。',
      },
      { n: 2, text: 'const 讓編譯器知道 x 不會被此函式修改，進一步簡化別名與資料流分析。' },
      { n: 3, text: '迴圈本體無分支、逐一連續存取 y[i]/x[i]，是自動向量化器最容易處理的形態。' },
      {
        n: 4,
        text: 'alignas(32) 讓緩衝區對齊 AVX2 的 256 位元向量寬度，避免未對齊存取的額外開銷。',
      },
      {
        n: 5,
        text: 'kTile 大小的區塊讓資料重複使用發生在快取仍保有該資料時，是 tiling 改善記憶體頻寬瓶頸的核心手法。',
      },
      {
        n: 6,
        text: '__builtin_prefetch 提示硬體提前載入下一區塊，隱藏跨區塊邊界的記憶體延遲；濫用會污染快取，需以量測驗證。',
      },
    ],
  },
  pitfalls: [
    '誤以為 C++ 的一般指標像 Fortran 陣列一樣預設不重疊；事實上編譯器必須保守假設可能別名，除非以 `__restrict` 明確排除，或讓編譯器插入執行期別名檢查。',
    '在熱迴圈內留下資料相依的分支（例如條件式提前結束或分支式累加），即使邏輯簡單也可能讓向量化器直接放棄；應優先評估是否能改寫成無分支運算。',
    '對跨步很大或間接定址（如指標鏈）的存取抱有向量化幻想；沒有連續記憶體，向量化器多半只能退化為純量迴圈或使用昂貴的 gather 指令。',
    '不看向量化報告就盲目加 `-O3` 或手動展開迴圈；過度展開會膨脹程式碼、增加 icache 壓力甚至造成暫存器溢位，反而拖慢速度。',
    '對未對齊的緩衝區使用 `__restrict` 卻期待自動達到峰值頻寬；別名消除只解決「能否向量化」，對齊與存取規律性才決定向量化後的實際吞吐。',
  ],
  bestPractices: [
    '在效能關鍵的指標參數上加 `__restrict`（並輔以 `const`），前提是呼叫端確實不會傳入重疊記憶體——這是一份正確性契約而非萬靈丹。',
    '把迴圈內資料相依的分支改寫成無分支形式（三元運算子、`std::max/min`、位元遮罩），讓每個 SIMD lane 執行相同指令。',
    '設計熱路徑資料結構時優先考慮連續存取（如 SoA），必要時搭配 `alignas` 對齊到目標 SIMD 寬度。',
    '用 `-fopt-info-vec-missed`（GCC）或 `-Rpass-missed=loop-vectorize`（Clang）實際讀取編譯器診斷，針對回報的具體原因（別名、非連續、成本模型）對症調整，而非憑感覺重寫。',
    '對記憶體受限的大型迴圈先嘗試分塊（tiling）改善快取重用，再考慮向量化與展開；先解決頻寬瓶頸往往比先解決指令吞吐瓶頸更有效。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '為什麼在 C++ 中，即使兩個 `float*` 參數在邏輯上永遠不會重疊，編譯器仍可能拒絕向量化使用它們的迴圈？',
      options: [
        { id: 'a', text: '因為 C++ 標準規定所有指標必須先轉型成 void* 才能向量化' },
        {
          id: 'b',
          text: '因為 C++ 一般指標未被標準假設為不重疊，編譯器必須保守考慮最壞情況下的別名，除非有 __restrict 等額外資訊排除它',
        },
        { id: 'c', text: '因為 float 型別本身不支援 SIMD 指令' },
        { id: 'd', text: '因為向量化只對整數陣列有效' },
      ],
      correctOptionId: 'b',
      explanation:
        'C/C++ 標準不像 Fortran 那樣預設參數不重疊；編譯器必須假設最壞情況（別名存在），因此需要 __restrict 或執行期別名檢查才能安全向量化。',
    },
    {
      id: 'q2',
      stem: '一個迴圈對陣列做跨步存取（例如 `a[i * stride]`，stride 遠大於 1），即使迴圈內完全沒有分支，為什麼仍可能無法有效向量化？',
      options: [
        { id: 'a', text: '因為跨步存取違反 C++ 語法規則' },
        {
          id: 'b',
          text: '因為 SIMD load/store 指令偏好連續記憶體，跨步存取需要較慢的 gather/scatter 指令，編譯器的成本模型可能因此判定向量化不划算',
        },
        { id: 'c', text: '因為跨步存取一定會導致編譯錯誤' },
        { id: 'd', text: '因為只有分支才會阻止向量化，其餘情況必定成功' },
      ],
      correctOptionId: 'b',
      explanation:
        '向量化的收益取決於能否用高效的連續 load/store；跨步存取通常只能靠昂貴的 gather/scatter 完成，成本模型可能因此認定向量化不值得，即使邏輯上可行。',
    },
    {
      id: 'q3',
      stem: 'GCC 的 `-fopt-info-vec-missed` 與 Clang 的 `-Rpass-missed=loop-vectorize` 主要用途是什麼？',
      options: [
        { id: 'a', text: '自動把所有迴圈強制轉換成向量化版本' },
        {
          id: 'b',
          text: '回報哪些迴圈未能被向量化以及失敗的具體原因，讓工程師針對性地修改程式碼（如加 __restrict 或改善存取模式）',
        },
        { id: 'c', text: '關閉編譯器的最佳化以加快編譯速度' },
        { id: 'd', text: '產生組合語言輸出取代原始碼' },
      ],
      correctOptionId: 'b',
      explanation:
        '這兩個診斷旗標會列出未成功向量化的迴圈與原因（例如別名疑慮、非連續存取、成本模型判定不划算），是診斷與修正向量化障礙的關鍵工具，而非自動修復或關閉最佳化。',
    },
  ],
  diagram: {
    key: 'cache-line',
    caption:
      '快取行與存取模式視覺化：連續存取讓一次載入的快取行被完整利用，是 SIMD 向量化 load/store 的理想前提；跳躍或跨步存取則浪費已載入的快取行資料，也讓向量化器難以產生高效的記憶體指令。',
  },
  tryIt: {
    code: `#include <chrono>
#include <cstdlib>
#include <iostream>
#include <vector>

// 對照 __restrict 是否存在時，編譯器能否有效向量化 AXPY。
void axpy_unsafe(float* y, const float* x, float a, int n) {
    for (int i = 0; i < n; ++i) y[i] = a * x[i] + y[i];
}

void axpy_restrict(float* __restrict y, const float* __restrict x, float a, int n) {
    for (int i = 0; i < n; ++i) y[i] = a * x[i] + y[i];
}

int main() {
    constexpr int kN = 1 << 20;
    std::vector<float> x(kN, 1.5f), y1(kN, 2.0f), y2(kN, 2.0f);

    auto t0 = std::chrono::steady_clock::now();
    axpy_unsafe(y1.data(), x.data(), 2.0f, kN);
    auto t1 = std::chrono::steady_clock::now();
    axpy_restrict(y2.data(), x.data(), 2.0f, kN);
    auto t2 = std::chrono::steady_clock::now();

    std::cout << "unsafe:    " << std::chrono::duration<double, std::milli>(t1 - t0).count()
              << " ms\\n";
    std::cout << "restrict:  " << std::chrono::duration<double, std::milli>(t2 - t1).count()
              << " ms\\n";
    std::cout << "y2[0] = " << y2[0] << "\\n";
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'GCC: Options That Control Optimization (-fopt-info)',
      href: 'https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html',
      description: 'GCC 官方文件，說明 -fopt-info-vec 與 -fopt-info-vec-missed 等向量化診斷旗標。',
    },
    {
      title: 'Clang Compiler User’s Manual: -Rpass',
      href: 'https://clang.llvm.org/docs/UsersManual.html#options-to-emit-optimization-reports',
      description:
        'Clang 官方文件，說明 -Rpass / -Rpass-missed / -Rpass-analysis 最佳化報告旗標的用法。',
    },
    {
      title: 'LLVM Auto-Vectorization',
      href: 'https://llvm.org/docs/Vectorizers.html',
      description: 'LLVM 官方文件，介紹迴圈向量化器與 SLP 向量化器的運作原理與限制。',
    },
    {
      title: 'restrict-qualified pointers (cppreference)',
      href: 'https://en.cppreference.com/w/c/language/restrict',
      description: 'C 標準 restrict 語意說明，適用於理解 GCC/Clang 對 C++ 的 __restrict 擴充。',
    },
  ],
};

export default ind18VectorizationFriendlyCode;
