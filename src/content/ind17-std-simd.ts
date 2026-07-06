import type { ChapterContent } from '@/types/ChapterContent';

const ind17StdSimd: ChapterContent = {
  slug: 'ind17-std-simd',
  chapterLabel: '第 46 章',
  title: 'std::simd（C++26, P1928）',
  group: '第 13 部：資料平行與向量化',
  description: '資料平行型別、垂直運算與 mask，SoA vs AoS 資料佈局對向量化的決定性影響。',
  concept: {
    standard: 'C++26',
    body: 'std::simd（P1928，目標納入 C++26）是一個資料平行型別：`simd<T, N>` 把 N 個 T 打包成一個值，對它做加減乘除等運算會「垂直」地同時作用在所有 N 個 lane 上，直接對應到硬體的 SIMD 暫存器與指令（SSE／AVX／AVX-512／NEON／SVE）。比較運算不回傳 bool，而回傳 `simd_mask<T, N>`，用來做無分支的條件式選擇（masked load/store、`select`）。這條路早在 Parallelism TS2 就以 `std::experimental::simd`（Vc 函式庫的標準化版本）的形式存在，多數主流編譯器（GCC libstdc++、部分 clang 搭配第三方實作）已可用；P1928 是把它從實驗性命名空間扶正為標準 `std::simd`，語意大致延續，但作為工程師今天能寫、能編的程式碼，實務上仍是以 `std::experimental::simd` 起步。std::simd 與「執行策略」（`std::execution::par_unseq`／`unseq`）是互補而非取代關係：執行策略是交給編譯器與函式庫自動向量化／平行化演算法呼叫的「宣告式」介面；std::simd 則是讓工程師顯式、可移植地寫出向量化程式碼的「命令式」介面，兩者常搭配使用——用 std::simd 手寫熱點內核，其餘程式碼交給自動向量化或執行策略。',
  },
  deepDive: [
    {
      heading: 'simd<T, N> 資料平行型別：垂直運算與 mask',
      body: '`std::simd<T, Abi>`（或固定寬度版本 `std::fixed_size_simd<T, N>`）是一個值型別，內部持有 N 個 T 的 lane。對兩個 simd 物件做 `a + b`、`a * b` 等運算，語意是「lane-wise」（垂直）：第 i 個 lane 的結果只由兩個運算元的第 i 個 lane 決定，彼此互不干擾——這正是硬體向量指令（如 `vaddps`）的行為，沒有任何跨 lane 的隱藏成本。\n\n比較運算子（`==`、`<` 等）作用在 simd 上不回傳單一 bool，而回傳 `simd_mask<T, N>`：每個 lane 各自是真或假。mask 本身也是資料平行值，可以做邏輯運算（`&&`、`||`、`!`）組合多個條件。這個型別模型的關鍵好處是：向量寬度 N（例如 AVX2 上 float 的 N=8）與資料型別 T 是模板參數的一部分，編譯期就決定了記憶體佈局與可用的硬體指令，不需要仰賴編譯器猜測「這段程式碼能不能向量化」。',
    },
    {
      heading: '用 mask 取代分支：where／select 風格的條件賦值',
      body: '純量程式碼裡的 `if (x[i] > 0) y[i] = f(x[i]); else y[i] = g(x[i]);` 在向量化世界是個難題：一個 SIMD 暫存器裡的 8 個 lane 可能有些滿足條件、有些不滿足，硬體無法對「同一暫存器內的不同 lane」分別跳轉。std::simd 的答案是 mask 導向的條件賦值：先算出 `mask = (x > simd(0))`，把 `f(x)` 與 `g(x)` 都算好（兩條路徑都執行，但這通常遠比分支預測失誤便宜），再用 mask 做選擇性寫回——概念上等同於 `y = mask ? fResult : gResult` 的 lane-wise 版本（標準委員會提案中以 `where(mask, y) = fResult` 或 `simd_select` 之類的介面表達）。\n\n這種「兩條路都算、用 mask 挑」的模式用計算換取分支——在資料相依分支難以預測、或分支機率接近五五波的內核（例如影像處理裡的 clamp、數值方法裡的 branchless min/max）中，通常比純量分支快得多；但如果其中一條路徑很昂貴（例如很少走到的例外處理），無條件計算兩條路徑反而浪費，這時該重新評估是否值得向量化這段邏輯。',
    },
    {
      heading: '為什麼不能只靠自動向量化',
      body: '編譯器自動向量化（auto-vectorization）把純量迴圈轉成 SIMD 指令，理論上很誘人：不改程式碼就拿到向量化效能。但它依賴一整串脆弱的前提：迴圈邊界要在編譯期已知或至少可證明沒有相依性、記憶體存取模式要規律且可證明不重疊（別名分析，這也是 `restrict`／`__restrict` 存在的原因）、對齊要滿足向量指令的要求、迴圈內不能有難以向量化的控制流或函式呼叫。只要一個指標可能別名、一個邊界條件無法在編譯期證明安全，編譯器就會保守地放棄向量化——而且往往不會明確告訴你為什麼（需要 `-fopt-info-vec-missed` 之類的診斷才看得到），這讓「自動向量化有沒有生效」變成一個脆弱、隨編譯器版本與最佳化旗標波動的黑盒子。\n\nstd::simd 把這個決定權交還給工程師：型別本身就宣告了向量寬度與資料型別，運算子直接對應硬體指令，不需要編譯器做別名分析或迴圈相依性證明才能生效。代價是程式碼更顯式、需要工程師自己處理對齊與邊界（尾端不足一個向量寬度的元素），但換來的是可移植、可預測、不隨編譯器啟發式演算法變動的向量化保證。',
    },
    {
      heading: 'SoA vs AoS：資料佈局是向量化能否加速的決定性因素',
      body: '假設要對一堆粒子做 `x[i] += vx[i] * dt`。若資料佈局是 AoS（array-of-structures，`struct Particle { float x, y, z, vx, vy, vz; }; Particle particles[N];`），要把 N 個粒子的 `x` 欄位載入同一個 simd 暫存器，記憶體位置彼此相隔一個 `sizeof(Particle)`，不連續——這只能靠 gather（分散讀取，每個 lane 各自算位址再逐一讀取）才能填滿向量暫存器，而 gather／scatter 指令即使硬體支援（AVX2 起才有），延遲與吞吐通常遠不如連續的向量 load／store，很多情況下反而比純量迴圈更慢。\n\n若改成 SoA（structure-of-arrays，`float x[N], y[N], z[N], vx[N], vy[N], vz[N];`），同一欄位的 N 個粒子資料是連續記憶體，`std::simd` 可以直接用連續 load／store 一次搬進／搬出一整個向量寬度的資料，完全發揮硬體頻寬。這就是為什麼工業級向量化程式碼幾乎必然要求 SoA（或至少是分欄位連續儲存的變形，如 AoSoA）：資料佈局不是實作細節，而是「向量化到底划不划算」的第一決定因素，往往比選哪個向量化 API 更重要。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <cstddef>
#include <experimental/simd>
#include <print>
#include <vector>

namespace stdx = std::experimental;

// 5 點 stencil：out[i] = (in[i-1] + in[i] + in[i+1]) / 3，SoA
// 佈局（連續陣列）。
void stencilSimd(const std::vector<float>& in, std::vector<float>& out) {
    using Vec = stdx::native_simd<float>;
    constexpr std::size_t width = Vec::size();  // [1] 硬體決定的向量寬度
    const std::size_t n = in.size();

    std::size_t i = 1;
    // 主迴圈：一次處理 width 個元素，全部走連續 load/store。 [2]
    for (; i + width < n; i += width) {
        Vec left, mid, right;
        left.copy_from(&in[i - 1],
                       stdx::element_aligned);  // [3] 未強制對齊，安全但可能較慢
        mid.copy_from(&in[i], stdx::element_aligned);
        right.copy_from(&in[i + 1], stdx::element_aligned);

        Vec result = (left + mid + right) / Vec(3.0f);  // [4] 垂直運算，同時算 width 個 lane
        result.copy_to(&out[i], stdx::element_aligned);
    }

    // 尾端 remainder：剩下不足一個向量寬度的元素，退回純量迴圈補齊。 [5]
    for (; i + 1 < n; ++i) {
        out[i] = (in[i - 1] + in[i] + in[i + 1]) / 3.0f;
    }
}

int main() {
    constexpr std::size_t n = 4099;  // 刻意選不是向量寬度倍數的大小，強制觸發尾端迴圈 [6]
    std::vector<float> in(n), out(n, 0.0f);
    for (std::size_t i = 0; i < n; ++i) {
        in[i] = static_cast<float>(i % 7);
    }

    stencilSimd(in, out);
    std::println("out[1] = {}, out[n-2] = {}", out[1], out[n - 2]);
    return 0;
}`,
    callouts: [
      {
        n: 1,
        text: 'native_simd<float>::size() 是編譯目標硬體的原生向量寬度（例如 AVX2 float 為 8），不是工程師手動指定的魔術數字。',
      },
      {
        n: 2,
        text: '主迴圈條件 i + width < n 確保每次讀寫都完整落在陣列範圍內，避免越界的向量 load/store。',
      },
      {
        n: 3,
        text: 'element_aligned 表示不假設記憶體對齊到向量寬度；若能保證對齊（如用 aligned_alloc），可改用 vector_aligned 換取更快的 load/store 指令。',
      },
      {
        n: 4,
        text: '(left + mid + right) / Vec(3.0f) 是 lane-wise 運算：width 個元素的加法與除法一次完成，直接映射到硬體向量指令。',
      },
      {
        n: 5,
        text: '尾端 remainder 迴圈是必要的：資料量不是向量寬度整數倍時，剩餘元素只能用純量邏輯逐一補齊，遺漏這段會讀寫越界或漏算。',
      },
      {
        n: 6,
        text: '刻意選一個非向量寬度倍數的 n，是為了在範例裡實際觸發 remainder 路徑，驗證它有被正確覆蓋到。',
      },
    ],
  },
  pitfalls: [
    '忘記寫尾端 remainder（純量收尾）迴圈：只要資料量不是向量寬度的整數倍，主迴圈就會漏掉最後幾個元素，或（更糟）越界讀寫。',
    '對 AoS 佈局的資料直接套用 std::simd：連續 load 只能載到同一個粒子裡不同欄位的資料，得先轉成 SoA 或用昂貴的 gather，否則向量化不但沒加速反而更慢。',
    '誤以為 std::simd 在目前的編譯器上就是 `std::simd`：C++26 定案前，能實際編譯的通常是 `std::experimental::simd`（Parallelism TS2）或第三方 Vc 函式庫，命名空間與部分介面尚未完全定案。',
    '用 vector_aligned 存取未對齊的記憶體：假設資料對齊到向量寬度卻沒有真的用對齊配置器分配，會造成未定義行為或直接當掉。',
    '把昂貴、機率很低的分支也硬套 mask 化的「兩條路都算」模式：當其中一條路徑成本遠高於另一條且走到機率很低時，無條件計算反而比分支慢。',
  ],
  bestPractices: [
    '寫 std::simd 內核前先確認資料佈局是 SoA（或 AoSoA）；如果現有程式碼是 AoS，先評估轉換佈局的成本與效益，而不是直接對 AoS 套用 simd。',
    '主迴圈一律搭配尾端 remainder 純量迴圈，並用刻意非向量寬度倍數的輸入大小做測試，確保 remainder 邏輯真的被覆蓋且正確。',
    '不確定記憶體對齊時用 element_aligned；能保證對齊（如透過 aligned_alloc／自訂配置器）時再換成 vector_aligned 換取效能。',
    '把 std::simd 手寫內核當成「熱點才值得做」的最後手段：先用 profiler 找出真正的瓶頸迴圈，再針對它手寫，其餘程式碼交給自動向量化或執行策略。',
    '目前基於 std::experimental::simd 撰寫的程式碼，用 `namespace stdx = std::experimental;` 之類的別名集中管理，未來遷移到標準 std::simd 時只需改一處。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '對兩個 std::simd<float, N> 物件做 `a + b`，其語意最準確的描述是什麼？',
      options: [
        { id: 'a', text: '把兩個物件的所有 lane 加總成一個純量' },
        {
          id: 'b',
          text: 'lane-wise（垂直）運算：第 i 個 lane 的結果只由 a、b 各自的第 i 個 lane 決定',
        },
        { id: 'c', text: '編譯器會自動決定要不要向量化這個加法' },
        { id: 'd', text: '需要先呼叫 reduce 才能執行加法' },
      ],
      correctOptionId: 'b',
      explanation:
        'std::simd 的算術運算子是垂直（lane-wise）的：每個 lane 獨立運算，直接對應硬體向量指令，不涉及跨 lane 的歸約。若要把所有 lane 加總成一個純量，需要另外呼叫歸約函式（如 reduce）。',
    },
    {
      id: 'q2',
      stem: '對粒子系統做 `x[i] += vx[i] * dt` 這類逐欄位運算時，為什麼 AoS（array-of-structures）佈局通常會讓 std::simd 向量化效果變差甚至變慢？',
      options: [
        { id: 'a', text: '因為 AoS 佔用的總記憶體比 SoA 多' },
        {
          id: 'b',
          text: '因為同一欄位在 AoS 裡不連續，必須用 gather 而非連續 load，吞吐與延遲通常都比純量迴圈更差',
        },
        { id: 'c', text: '因為 AoS 無法儲存 float 型別' },
        { id: 'd', text: '因為 AoS 會觸發編譯器錯誤，std::simd 無法編譯' },
      ],
      correctOptionId: 'b',
      explanation:
        'AoS 佈局下同一欄位（如 x）分散在每個結構體之間相隔固定 stride 的位置，無法連續 load 進 SIMD 暫存器，只能靠 gather 逐一讀取；gather/scatter 的成本常常抵銷甚至超過向量化帶來的效益，因此 SoA 幾乎是有效向量化的前提。',
    },
    {
      id: 'q3',
      stem: '在 std::simd 的主向量化迴圈之後，仍然需要一段純量 remainder 迴圈的原因是什麼？',
      options: [
        { id: 'a', text: '純量迴圈可以讓編譯器產生更好的除錯資訊' },
        {
          id: 'b',
          text: '資料量通常不是向量寬度的整數倍，剩餘不足一個向量寬度的元素只能用純量邏輯逐一處理',
        },
        { id: 'c', text: 'std::simd 型別不支援讀取陣列中間的元素' },
        { id: 'd', text: '純量迴圈是為了觸發自動向量化的備援路徑' },
      ],
      correctOptionId: 'b',
      explanation:
        '向量寬度是固定的硬體常數（如 8 或 16），而輸入資料大小是任意的，兩者相除通常有餘數；主迴圈只能處理整數個向量寬度的資料，剩下的尾端元素必須靠額外的純量迴圈補齊，否則會漏算或越界。',
    },
  ],
  diagram: {
    key: 'execution-policies',
    caption:
      'std::simd 把一條純量迴圈攤平成固定寬度的 lane：SoA 佈局讓每個 lane 對應到連續記憶體的一次向量 load/store，AoS 佈局則被迫退化成逐 lane 的 gather。',
  },
  tryIt: {
    code: `#include <experimental/simd>
#include <iostream>
#include <vector>

namespace stdx = std::experimental;

void addVectors(const std::vector<float>& a, const std::vector<float>& b, std::vector<float>& out) {
    using Vec = stdx::native_simd<float>;
    const std::size_t width = Vec::size();
    const std::size_t n = a.size();

    std::size_t i = 0;
    for (; i + width <= n; i += width) {
        Vec va, vb;
        va.copy_from(&a[i], stdx::element_aligned);
        vb.copy_from(&b[i], stdx::element_aligned);
        Vec vr = va + vb;
        vr.copy_to(&out[i], stdx::element_aligned);
    }

    // 純量 remainder：補齊不足一個向量寬度的尾端元素。
    for (; i < n; ++i) {
        out[i] = a[i] + b[i];
    }
}

int main() {
    std::vector<float> a{1, 2, 3, 4, 5, 6, 7};
    std::vector<float> b{10, 20, 30, 40, 50, 60, 70};
    std::vector<float> out(a.size());

    addVectors(a, b, out);
    for (float v : out) {
        std::cout << v << ' ';
    }
    std::cout << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'P1928 - std::simd — Merge data-parallel types from the Parallelism TS2',
      href: 'https://wg21.link/p1928',
      description:
        '把 std::experimental::simd 扶正為標準 std::simd 的 WG21 提案，涵蓋型別模型、mask 與 ABI 考量。',
    },
    {
      title: 'std::experimental::simd - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/experimental/simd',
      description: '目前可實際編譯使用的實驗性資料平行型別完整介面文件。',
    },
    {
      title: 'Auto-Vectorization in LLVM',
      href: 'https://llvm.org/docs/Vectorizers.html',
      description: '說明編譯器自動向量化的成立條件與限制，對照理解為何需要顯式的 std::simd。',
    },
    {
      title: 'Data-Oriented Design (SoA vs AoS 佈局的系統性討論)',
      href: 'https://www.dataorienteddesign.com/dodbook/',
      description: '深入說明 SoA／AoS 佈局取捨與其對快取、向量化的影響，可免費線上閱讀的專書。',
    },
  ],
};

export default ind17StdSimd;
