import type { ChapterContent } from '@/types/ChapterContent';

const ind25FloatingPointReductionReproducibility: ChapterContent = {
  slug: 'ind25-floating-point-reduction-reproducibility',
  chapterLabel: '第 54 章',
  title: '浮點、歸約與可重現性',
  group: '第 16 部：數值核心與可重現性',
  description:
    '浮點非結合性、確定性歸約策略（固定分割樹、pairwise summation、Kahan/Neumaier 補償求和）與 bitwise 可重現的代價。',
  concept: {
    standard: 'C++20',
    body: '浮點加法在數學上滿足結合律，但在有限精度下每一步都會捨入，因此 `(a+b)+c` 與 `a+(b+c)` 可能得到不同結果。平行歸約（parallel reduction）把陣列切成多段、由不同執行緒各自累加後再合併，合併的順序會隨執行緒數量、排程與硬體而異——即使每一次加法都是 IEEE-754 正確捨入，整體加總的結果仍可能因執行方式不同而不同，也可能與序列版本不同。要在效能、精度與「同一輸入永遠得到同一輸出」之間取得可控的權衡，需要刻意設計歸約順序（固定分割樹）、降低誤差的求和演算法（pairwise、Kahan/Neumaier），並理解 bitwise 可重現通常有其代價。對無法要求位元級相同的情境（例如跨硬體驗證 GEMM 或 attention kernel），應改用以容差為基礎、有理論根據的驗證策略。',
  },
  deepDive: [
    {
      heading: '浮點非結合性：為何平行歸約結果會變',
      body: '取三個 `float` 值 `a = 1e16`、`b = 1.0`、`c = -1e16`。若先算 `(a+b)+c`：`a+b` 因為 `1.0` 遠小於 `a` 的 ULP 而被捨入吸收，`a+b` 仍等於 `1e16`，結果 `(a+b)+c = 0`；但若先算 `a+(b+c)`：`b+c = 1 - 1e16 ≈ -1e16`，再加上 `a` 又被吸收，結果同樣可能是 `0` 或非零，視精度與中間值而定——重點是兩種結合順序在一般情況下並不保證相等，數量級差距愈大、加總項數愈多，落差可能愈明顯。\n\n平行歸約把 `n` 個元素依執行緒數 `p` 切成 `p` 段，每段內部循序相加，最後再把 `p` 個部分和合併。當 `p` 改變（例如換一台機器、換一個執行緒池大小、或同一程式因系統負載被排程成不同的切分），元素被相加的「分組方式」跟著改變，等同於改變了浮點加法的結合順序，因此结果的最後幾個位元、甚至更高位，都可能不同。這與競賽條件（race condition）無關——每個部分和的計算都是良定義且確定的——問題純粹出在浮點加法不具結合律，而歸約樹的形狀（也就是「誰先跟誰加」）由執行緒數與排程決定。',
    },
    {
      heading: '確定性歸約策略：固定分割樹、pairwise summation、Kahan/Neumaier',
      body: '**固定分割樹（fixed reduction tree）**：與其讓分割方式隨執行緒數變化，不如先依「邏輯區塊」（例如固定大小 1024 的區段，與硬體執行緒數無關）建立一棵固定形狀的二元合併樹，執行時無論用多少執行緒平行執行，最終合併的順序都依照這棵樹的形狀進行——只要輸入不變，樹的形狀就不變，結果也就不變。代價是失去「依核心數動態切分以達最佳平衡」的彈性。\n\n**Pairwise（cascade）summation**：與其把 `n` 個數字循序相加（誤差隨 `n` 線性累積），不如遞迴地把陣列對半切、各自求和後再相加，形成一棵平衡二元樹。其捨入誤差上界是 `O(log n · ε)` 而非樸素循序求和的 `O(n · ε)`，在大陣列（例如百萬級的歸約）上精度提升顯著，且天生就是一種固定形狀的樹，只要切分規則固定就與執行緒數無關。\n\n**Kahan 補償求和**：對每一次加法額外維護一個補償項 `c`，把「這次加法理論上遺失的低位元」記錄下來，下次加法前先把 `c` 加回被加數，藉此把單次加法的捨入誤差限制在幾乎與 `ε`（machine epsilon）同量級，而不隨 `n` 累積。**Neumaier（Kahan–Babuška）變體**改進了當「新元素的量級大於目前部分和」時 Kahan 演算法會失效的邊界情況：它比較 `sum` 與 `sum + x` 的量級，取兩者中較小的一方計算遺失量，因此無論新元素比目前和大或小都能正確補償。',
    },
    {
      heading: 'bitwise-reproducible 的代價與取捨',
      body: '要求「同一程式、同一輸入，在不同執行緒數、不同次執行、甚至不同硬體上都得到位元級相同的輸出」（bitwise reproducibility）幾乎必然要放棄某種平行度或彈性：常見做法是強制使用與核心數無關的固定分割樹（犧牲依硬體動態調整區塊大小以達最佳負載平衡的機會）、關閉會依運算元順序自由重排的最佳化（例如 `-ffast-math`、部分向量化的自動重排、FMA 融合的自動選擇），或是統一使用同一套 SIMD 寬度與歸約順序而非讓編譯器依目標架構自由選擇。\n\n這些限制通常都伴隨可量測的效能代價：固定分割樹可能無法完美對齊快取行或負載不均；關閉激進的浮點最佳化會犧牲向量化與 FMA 帶來的吞吐量。因此，bitwise 可重現性應被視為一個「明確要求時才付的稅」，而非預設目標——多數科學計算與機器學習工作負載其實只需要「數值上足夠接近」（容差內），而非位元相同；只有在需要逐位除錯、法規要求可稽核性，或跨版本迴歸測試必須排除隨機浮點差異干擾時，才值得支付這個代價。',
    },
    {
      heading: '驗證直接相關：為 GEMM／attention kernel 建立可信的參考基準與容差',
      body: '既然要求平行 kernel（例如矩陣乘法 GEMM 或 attention 中的 softmax／加權求和）與參考實作 bitwise 相同通常不切實際，也常常沒有必要，實務上改採「參考實作 + 容差比較」：先用一份高精度、易於推導正確性的參考版本（例如用 `double` 甚至任意精度算的樸素三重迴圈 GEMM）算出「真值」，再用相對誤差門檻比較待測 kernel 的輸出，而非要求逐位元相等。\n\n容差門檻不應是隨手挑的一個常數，而要依問題規模與條件數（condition number）縮放：歸約長度為 `k` 的內積，理論捨入誤差上界大致與 `k · ε · ‖a‖·‖b‖` 成正比，因此容差常取 `relative_error ≤ C · k · ε`（`C` 是留給實作差異的安全係數）；矩陣運算則需再乘上矩陣的條件數，因為病態（ill-conditioned）矩陣會放大輸入的微小誤差。實務上常見做法是回報 `max_i |x_i - ref_i| / max(|ref_i|, floor)` 的最大相對誤差與其分布，而非單一「通過／失敗」布林值，並且針對半精度（fp16/bf16）kernel 使用比 fp32/fp64 更寬鬆、但同樣有理論依據的容差，而不是憑經驗調到「測試剛好過」為止。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <cmath>
#include <cstddef>
#include <print>
#include <vector>

// Naive sequential summation: error accumulates linearly with element count n, O(n * eps). [1]
double naiveSum(const std::vector<double>& xs) {
    double total = 0.0;
    for (double x : xs) {
        total += x;
    }
    return total;
}

// Neumaier (Kahan-Babuska) compensated summation: maintains a compensation term c to track lost low-order bits. [2]
double neumaierSum(const std::vector<double>& xs) {
    double sum = 0.0;
    double c = 0.0;  // running total of low-order bits lost so far

    for (double x : xs) {
        double t = sum + x;
        if (std::fabs(sum) >= std::fabs(x)) {
            // sum has larger magnitude: x's low-order bits are absorbed during alignment, so compute the loss from x. [3]
            c += (sum - t) + x;
        } else {
            // x has larger magnitude (the case the original Kahan algorithm mishandles): compute the loss from sum instead. [4]
            c += (x - t) + sum;
        }
        sum = t;
    }
    return sum + c;  // [5] add the accumulated compensation back in to get the corrected sum
}

// Pairwise (cascade) summation: error upper bound is O(log n * eps). [6]
double pairwiseSum(const std::vector<double>& xs, std::size_t lo, std::size_t hi) {
    std::size_t n = hi - lo;
    if (n <= 8) {
        double total = 0.0;
        for (std::size_t i = lo; i < hi; ++i) {
            total += xs[i];
        }
        return total;
    }
    std::size_t mid = lo + n / 2;
    return pairwiseSum(xs, lo, mid) + pairwiseSum(xs, mid, hi);
}

int main() {
    // Deliberately mix wildly different magnitudes: sum many small values, then add one large value, to highlight rounding error.
    std::vector<double> data(1'000'000, 1e-8);
    data.push_back(1.0);

    double naive = naiveSum(data);
    double neumaier = neumaierSum(data);
    double pairwise = pairwiseSum(data, 0, data.size());

    std::println("naive    = {:.17f}", naive);
    std::println("neumaier = {:.17f}", neumaier);
    std::println("pairwise = {:.17f}", pairwise);
    std::println("naive vs neumaier diff = {:.3e}", std::fabs(naive - neumaier));
    return 0;
}`,
    callouts: [
      { n: 1, text: '樸素循序求和沒有誤差補償機制，元素愈多、量級差異愈大，累積捨入誤差愈明顯。' },
      { n: 2, text: 'c 是「補償項」：記錄每次加法理論上應該加上、但因捨入而遺失的低位元量。' },
      {
        n: 3,
        text: '當目前部分和量級較大時，新元素 x 的低位元在對齊指數時被捨去，故從 x 這一側回推遺失量。',
      },
      {
        n: 4,
        text: 'Neumaier 相對原始 Kahan 的改進：新元素比部分和大時改用另一側計算，避免原始 Kahan 在此情況失效。',
      },
      { n: 5, text: '回傳前把累積的補償 c 加回 sum，修正前面所有步驟遺失的低位元。' },
      {
        n: 6,
        text: 'Pairwise 求和把陣列遞迴對半切，形成平衡二元樹；樹形狀固定則與執行緒數切分無關，具確定性。',
      },
    ],
  },
  pitfalls: [
    '預設平行版本與序列版本的歸約結果會 bitwise 相同——只要合併順序不同，結果本來就可能不同，這不代表程式有 bug。',
    '對大陣列使用樸素循序求和卻不理解誤差會隨元素個數累積，尤其在混合大量小值與少量大值時特別明顯。',
    '任意挑一個「看起來夠小」的容差（如寫死 `1e-6`）而不依問題規模、元素個數或條件數推導，導致測試對某些規模過嚴、對另一些規模又太鬆。',
    '把 bitwise 可重現性當成免費的預設需求去追求，卻沒有評估它對向量化、FMA 融合與負載平衡造成的效能代價。',
    '誤以為原始 Kahan 求和在所有情況都穩健，忽略了新元素量級大於目前部分和時需要 Neumaier 變體才能正確補償。',
  ],
  bestPractices: [
    '需要確定性歸約時，採用與執行緒數無關的固定分割樹或固定大小區塊，讓合併順序只取決於輸入資料，不取決於執行時的排程。',
    '大量或量級懸殊的浮點求和優先採用 pairwise summation 或 Kahan/Neumaier 補償求和，而非樸素循序累加。',
    '把 bitwise 可重現性當成明確、可獨立測量效能代價的需求來評估，而非隱含的預設目標。',
    '驗證平行數值 kernel（GEMM、attention 等）時，建立高精度參考實作，並依元素個數、資料範數與條件數推導相對誤差容差，而非拍腦袋給一個常數。',
    '回報驗證結果時同時給出最大相對誤差與誤差分布，而不是單一通過／失敗布林值，方便追蹤精度隨規模退化的趨勢。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '為什麼同一份平行歸約程式，在 4 個執行緒與 8 個執行緒下跑，可能得到不完全相同的浮點總和？',
      options: [
        { id: 'a', text: '因為執行緒數不同時發生了資料競爭（race condition）' },
        { id: 'b', text: '因為浮點加法不具結合律，不同執行緒數導致元素被分組、合併的順序不同' },
        { id: 'c', text: '因為 IEEE 754 加法在執行緒數較多時不是正確捨入的' },
        { id: 'd', text: '因為編譯器針對不同執行緒數會產生不同精度的浮點型別' },
      ],
      correctOptionId: 'b',
      explanation:
        '每次加法都可以是 IEEE-754 正確捨入，但執行緒數改變了「誰先跟誰相加」的分組方式，等同改變了加法的結合順序，浮點加法不具結合律，故結果可能不同。',
    },
    {
      id: 'q2',
      stem: '關於 Kahan 補償求和演算法中的補償項 `c`，下列敘述何者正確？',
      options: [
        { id: 'a', text: 'c 用來限制迴圈次數，加速求和' },
        {
          id: 'b',
          text: 'c 記錄每一步加法因捨入而理論上遺失的低位元量，下次加法前補回，藉此抑制誤差累積',
        },
        { id: 'c', text: 'c 是用來偵測 NaN 的旗標' },
        { id: 'd', text: 'c 讓求和變成平行執行' },
      ],
      correctOptionId: 'b',
      explanation:
        'Kahan 演算法在每次加法後計算「應加上卻被捨入捨去」的量存入 c，下一輪加法前先把 c 加回，使單次捨入誤差不再隨元素個數線性累積。',
    },
    {
      id: 'q3',
      stem: '為 GEMM 或 attention 這類平行數值 kernel 建立驗證基準時，最合理的做法是？',
      options: [
        { id: 'a', text: '要求 kernel 輸出與參考實作在所有硬體上 bitwise 完全相同，否則視為錯誤' },
        {
          id: 'b',
          text: '用高精度參考實作算出真值，再依元素個數、資料範數與條件數推導相對誤差容差進行比較',
        },
        { id: 'c', text: '只要輸出的浮點位元組數相同就視為通過' },
        { id: 'd', text: '固定容差為 0，任何差異都視為失敗' },
      ],
      correctOptionId: 'b',
      explanation:
        '跨硬體、跨演算法的 bitwise 相等通常不切實際；應以高精度參考實作為真值，並依理論誤差上界（隨規模與條件數縮放）設定容差，用相對誤差比較，而非要求逐位元相等。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['非結合性', '固定分割樹', '補償求和', '容差驗證'],
    caption:
      '從浮點非結合性出發：先以固定分割樹或 pairwise 結構控制合併順序，再用 Kahan/Neumaier 補償求和降低誤差累積，最終以依規模與條件數推導的容差驗證平行 kernel 的正確性。',
  },
  tryIt: {
    code: `#include <cmath>
#include <iostream>
#include <vector>

// Neumaier compensated summation: more robust than the original Kahan algorithm when a new element has larger magnitude.
double neumaierSum(const std::vector<double>& xs) {
    double sum = 0.0;
    double c = 0.0;
    for (double x : xs) {
        double t = sum + x;
        if (std::fabs(sum) >= std::fabs(x)) {
            c += (sum - t) + x;
        } else {
            c += (x - t) + sum;
        }
        sum = t;
    }
    return sum + c;
}

double naiveSum(const std::vector<double>& xs) {
    double total = 0.0;
    for (double x : xs) {
        total += x;
    }
    return total;
}

int main() {
    std::vector<double> data(100'000, 1e-8);
    data.push_back(1.0);

    double naive = naiveSum(data);
    double compensated = neumaierSum(data);

    std::cout.precision(17);
    std::cout << "naive        = " << naive << '\\n';
    std::cout << "compensated  = " << compensated << '\\n';
    std::cout << "abs diff     = " << std::fabs(naive - compensated) << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'What Every Computer Scientist Should Know About Floating-Point Arithmetic',
      href: 'https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html',
      description: 'Goldberg 的經典長文，涵蓋浮點誤差、捨入與求和演算法的理論基礎。',
    },
    {
      title: 'std::numeric_limits - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/types/numeric_limits',
      description: '查詢 epsilon、最大/最小可表示值等浮點特性，用於推導誤差容差。',
    },
    {
      title: 'Kahan summation algorithm - Wikipedia',
      href: 'https://en.wikipedia.org/wiki/Kahan_summation_algorithm',
      description: 'Kahan 與 Neumaier（Kahan-Babuska）補償求和演算法的推導與虛擬碼。',
    },
    {
      title: 'Pairwise summation - Wikipedia',
      href: 'https://en.wikipedia.org/wiki/Pairwise_summation',
      description: '成對／級聯求和如何把捨入誤差上界從 O(n) 降到 O(log n)。',
    },
  ],
};

export default ind25FloatingPointReductionReproducibility;
