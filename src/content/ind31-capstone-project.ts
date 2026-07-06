import type { ChapterContent } from '@/types/ChapterContent';

const ind31CapstoneProject: ChapterContent = {
  slug: 'ind31-capstone-project',
  chapterLabel: '第 31 章',
  title: '綜合專案 Capstone',
  group: 'S · 第十一部：綜合實戰',
  description:
    '三選一綜合專案（並行數值核心／高吞吐並行系統／平行圖處理引擎），交付效能報告與正確性證據。',
  concept: {
    standard: 'C++26',
    body:
      '本章不是單一技術的教學，而是把全書技術收攏成一份「專案規格書」。你要在三個題目中擇一：' +
      '（1）並行數值核心（多執行緒＋向量化＋GPU offload 的 GEMM 或 stencil）、' +
      '（2）高吞吐並行系統（無鎖佇列驅動的任務 runtime 或網路服務）、' +
      '（3）平行圖處理引擎（BSP 模型＋work-stealing）。' +
      '每個題目都要求同時交付「效能報告」與「正確性證據」，而不是只交一份會跑的程式碼。' +
      '評分標準不是「有沒有平行化」，而是「平行化的主張能不能被重現、被驗證」——這正是整本教材從第 1 章 roofline 到第 25 章可重現性一路鋪陳的核心價值觀。',
  },
  deepDive: [
    {
      heading: '選項一：並行數值核心（GEMM / Stencil）',
      body:
        '目標：實作一個多執行緒、向量化、並可選擇性 offload 到 GPU 的 GEMM 或 stencil 核心，' +
        '並以 roofline 模型量化它離硬體上限還有多遠。' +
        '\n\n' +
        '這個選項要求你把第 1 章的 roofline 分析（`operational intensity` vs. 可達到的 GFLOP/s）當成「起點」而非「事後補充」——' +
        '先算出你的核心屬於 compute-bound 還是 memory-bound，再決定要優化的方向是向量化（`inline code` 使用第 17 章 `std::simd`）' +
        '還是資料佈局（第 26 章 `std::mdspan` 描述多維陣列的 stride 與記憶體佈局）。' +
        '若延伸到 GPU，第 27 章討論的 offload 與 host/device 資料搬移策略（pinned memory、非同步傳輸與計算重疊）將決定你能不能把理論峰值真正兌現成量測值。' +
        '交付物必須包含：一條或多條 roofline 圖上的量測點、不同執行緒數/向量寬度下的效能曲線，以及對「歸約」（例如矩陣乘法的內積累加）跨執行緒數可重現性的驗證。',
    },
    {
      heading: '選項二：高吞吐並行系統（Lock-Free Runtime / 網路服務）',
      body:
        '目標：實作一個由無鎖佇列驅動的任務 runtime，或一個高並發網路服務，並提供 scaling 與尾延遲（tail latency）分析。' +
        '\n\n' +
        '這個選項直接建立在第 12 章的並行容器（`inline code` 無鎖佇列、`std::hazard_pointer` 等記憶體回收策略）' +
        '與第 21 章的執行緒池／排程設計之上：你需要決定任務分配策略（work-stealing vs. 集中式佇列）、' +
        '如何避免 false sharing、以及如何在高負載下維持公平性。' +
        '正確性上，第 23 章介紹的併發臭蟲偵測工具（ThreadSanitizer、AddressSanitizer）在這裡不是「跑一次就好」的檢查項，' +
        '而是整個開發過程中持續執行的守門員——任何一次 data race 或 use-after-free 都足以讓整份效能報告失去意義。' +
        '交付物必須包含：吞吐量 vs. 執行緒數的 scaling 曲線、p50/p95/p99 尾延遲分佈，以及在負載下維持穩定的證據（長時間跑測不崩潰、不洩漏）。',
    },
    {
      heading: '選項三：平行圖處理引擎（BSP + Work-Stealing）',
      body:
        '目標：實作一個以 Bulk Synchronous Parallel（BSP）模型組織超步（superstep）、' +
        '並以 work-stealing 平衡負載的圖處理引擎（例如 PageRank、BFS 或連通元件），並提供負載平衡分析。' +
        '\n\n' +
        '這個選項的骨架來自第 9 章的 `std::barrier`／`std::latch` 同步原語——BSP 的每一個超步都需要一個全域同步點，' +
        '確保所有執行緒在進入下一輪計算前都已完成局部更新與訊息交換。' +
        '而圖的分割天生負載不均（power-law 度數分佈會讓少數頂點吃掉大部分工作），因此第 21 章介紹的 work-stealing 排程' +
        '在這裡不是錦上添花，而是效能的關鍵：你需要量測「工作竊取率」與「執行緒閒置時間」，並解釋負載不均的來源與緩解策略。' +
        '交付物必須包含：不同圖規模/度數分佈下的 scaling 曲線、每執行緒工作量的直方圖（或變異係數），以及正確性上與序列版本結果一致的證明。',
    },
    {
      heading: '驗收與評分標準',
      body:
        '無論選哪個題目，以下四項是硬性驗收條件，任何一項不通過都視為未完成：' +
        '\n\n' +
        '一、乾淨通過 ThreadSanitizer 與 AddressSanitizer（第 23 章）：在 CI 或本機以 `-fsanitize=thread` 與 `-fsanitize=address` 分別建置並執行完整測試與壓力測試，不得有任何警告或錯誤——即使是「看起來無害」的 race。' +
        '\n\n' +
        '二、達到目標 scaling 效率：在 8 執行緒下，相對於單執行緒基準應達到至少 70% 的平行效率（`speedup / 執行緒數 >= 0.7`）；若因演算法本質（如 Amdahl 定律中不可平行化的序列部分）無法達標，必須用第 1 章的模型定量解釋差距來源，而不是含糊帶過。' +
        '\n\n' +
        '三、量測方法符合第 22 章的基準紀律：固定 CPU 頻率或記錄變異、暖機後才計時、報告多次執行的中位數與離散程度（而非單次最佳值）、明確交代硬體與編譯選項，讓別人能重現你的數字。' +
        '\n\n' +
        '四、數值結果符合第 25 章的容差標準：對浮點歸約結果，需說明所選容差（絕對誤差或相對誤差）的依據，並證明結果在不同執行緒數、不同排程下都落在容差內——而不是只在一次幸運的執行中「剛好對」。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <chrono>
#include <cmath>
#include <cstdio>
#include <vector>

// Minimal capstone harness: run a candidate kernel N times, verify its
// result against a serial reference within tolerance, and print a
// scaling-efficiency-style summary line. Adapt "kernel" and "reference"
// to whichever project option (numeric core / lock-free system / graph
// engine) you choose; the harness shape stays the same.

double reference_kernel(const std::vector<double>& data) {  // [1]
  double sum = 0.0;
  for (double x : data) {
    sum += x;
  }
  return sum;
}

double candidate_kernel(const std::vector<double>& data,
                        int num_threads);  // [2]

bool within_tolerance(double got, double want, double rel_tol) {  // [3]
  double diff = std::fabs(got - want);
  double scale = std::max(std::fabs(want), 1.0);
  return diff <= rel_tol * scale;
}

struct RunResult {
  double seconds;
  bool correct;
};

RunResult time_one_run(const std::vector<double>& data, int num_threads,
                       double reference, double rel_tol) {
  auto start = std::chrono::steady_clock::now();
  double got = candidate_kernel(data, num_threads);  // [4]
  auto end = std::chrono::steady_clock::now();

  RunResult result;
  result.seconds = std::chrono::duration<double>(end - start).count();
  result.correct = within_tolerance(got, reference, rel_tol);
  return result;
}

int main() {
  const std::vector<double> data(1'000'000, 1.0);
  const double reference = reference_kernel(data);
  const double rel_tol = 1e-9;  // [5] Justify this number in your report.

  const double baseline = time_one_run(data, 1, reference, rel_tol).seconds;

  for (int threads : {1, 2, 4, 8}) {
    RunResult r = time_one_run(data, threads, reference, rel_tol);
    double speedup = baseline / r.seconds;
    double efficiency = speedup / static_cast<double>(threads);  // [6]
    std::printf(
        "threads=%d correct=%d time=%.6fs speedup=%.2fx efficiency=%.2f\\n",
        threads, r.correct ? 1 : 0, r.seconds, speedup, efficiency);
  }
  return 0;
}`,
    callouts: [
      {
        n: 1,
        text: '先寫一份簡單、易驗證的序列參考實作，作為所有平行版本的正確性基準（best practice：先求對，再求快）。',
      },
      {
        n: 2,
        text: '候選核心（多執行緒／向量化／offload／無鎖佇列版本等）由你依所選題目實作；此處僅宣告介面。',
      },
      {
        n: 3,
        text: '容差判斷需依第 25 章討論的相對誤差／絕對誤差取捨，並在報告中說明選擇依據，而非隨意取一個「看起來安全」的數字。',
      },
      {
        n: 4,
        text: '正式量測前務必先跑過 ASan/TSan 乾淨的版本；在 sanitizer 建置下量測到的時間不代表真實效能，只用於正確性檢查。',
      },
      {
        n: 5,
        text: '容差常數必須寫明理由：是基於浮點誤差的理論上界，還是基於歸約順序敏感度的實測結果？空白理由等於沒有驗證。',
      },
      {
        n: 6,
        text: '效率 = 加速比 / 執行緒數；本章要求在 8 執行緒下達到 >= 0.7，未達標時需用 Amdahl 定律等模型解釋差距來源。',
      },
    ],
  },
  pitfalls: [
    '只在一個執行緒數（例如「8 核最好」）跑一次就交差，沒有完整的 scaling 曲線，讓評審無法判斷平行化是否真的有效。',
    '把 ThreadSanitizer / AddressSanitizer 檢查留到專案最後一天才跑，結果一堆 data race 早已深埋在幾週前寫的程式碼裡，難以定位。',
    '隨手選一個數值容差（例如 `1e-6`）卻說不出理由，導致正確性驗證變成「反正過了就好」而非有依據的證明。',
    '效能報告只放「最佳一次執行」的數字，沒有報告多次量測的中位數與變異，違反第 22 章的基準紀律。',
    'GPU offload 或無鎖佇列版本在正確性上「大部分時候對」，卻把偶發性錯誤當成雜訊忽略，而非用容差或不變量測試系統性地抓出來。',
  ],
  bestPractices: [
    '第一步永遠是寫一個簡單、清楚、容易人工驗證的序列參考實作，所有後續平行版本都以它為正確性基準。',
    '從專案第一天就把 Google Benchmark 或等價的計時框架接進去，而不是等「功能做完再補測試」——效能與正確性應該同步演進。',
    '持續（而非最後）在 CI 或本機以 `-fsanitize=thread,address` 建置並跑測試，讓 sanitizer 成為每次提交的守門員。',
    '維護一份跑分實驗記錄（lab notebook）：每次量測記下硬體、編譯選項、執行緒數、重複次數與結果，方便事後重現與除錯。',
    '在報告中明確寫出容差選擇的依據與 scaling 效率未達標時的定量解釋，讓「誠實地沒做到」也是一種可接受的交付。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '一份合格的 Capstone 效能報告，下列哪一項是必要條件？',
      options: [
        { id: 'a', text: '只要在最高執行緒數下贏過序列版本即可，不需要完整的 scaling 曲線。' },
        {
          id: 'b',
          text: '需要多個執行緒數下的量測點（含中位數與變異），並說明未達目標效率時的原因。',
        },
        { id: 'c', text: '只要程式能編譯並跑出答案，效能數字可以之後再補。' },
      ],
      correctOptionId: 'b',
      explanation:
        '單點量測無法證明平行化策略在不同規模下都有效；報告需要完整的 scaling 曲線與變異度，並對未達標情形給出定量解釋。',
    },
    {
      id: 'q2',
      stem: '為什麼 ThreadSanitizer／AddressSanitizer 應該在整個開發過程中持續執行，而不是留到專案結束前才跑一次？',
      options: [
        { id: 'a', text: '因為 sanitizer 只能在最終版本上執行，中途執行會影響最終分數。' },
        {
          id: 'b',
          text: '因為 data race 與記憶體錯誤會隨程式碼演進不斷新增，越晚發現定位成本越高，且沒被抓到的錯誤會讓效能數字失去意義。',
        },
        { id: 'c', text: '因為 sanitizer 的檢查結果只在建置的最後一天才會生效。' },
      ],
      correctOptionId: 'b',
      explanation:
        '併發錯誤具有累積性且難以事後定位；提早、持續地跑 sanitizer 可以把每次修改的風險限制在可控範圍內，也保證效能量測的前提（程式行為正確）成立。',
    },
    {
      id: 'q3',
      stem: '選擇數值結果的驗證容差時，下列哪一種作法最能支撐「正確性證據」這項要求？',
      options: [
        { id: 'a', text: '選一個看起來夠小的常數（例如 `1e-6`），只要測試通過就代表數值正確。' },
        {
          id: 'b',
          text: '依浮點誤差理論上界或歸約順序敏感度的實測結果推導容差，並在不同執行緒數／排程下重複驗證都落在容差內。',
        },
        {
          id: 'c',
          text: '容差可以事後依實際跑出來的誤差反向調整，只要最終報告裡數字看起來一致即可。',
        },
      ],
      correctOptionId: 'b',
      explanation:
        '容差必須有依據（理論誤差界或實測分佈）且需在多種平行化條件下驗證其穩定性，否則所謂「正確性驗證」只是巧合，而非證據。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: [
      '選題與範疇界定',
      '序列參考實作',
      '平行化與效能量測',
      '正確性與可重現性驗證',
      '效能報告交付',
    ],
    caption:
      'Capstone 專案的五階段流程：先界定範疇並寫出序列參考，再逐步平行化並量測，最後用 sanitizer 與容差驗證正確性，交付可重現的效能報告。',
  },
  tryIt: {
    code: `#include <cmath>
#include <cstdio>
#include <numeric>
#include <vector>

// Simplified variant: verify a "parallel-style" reduction against a
// straightforward serial sum within a relative tolerance, and print a
// pass/fail line. Swap accumulate() for your real candidate kernel.

int main() {
  std::vector<double> data(100'000, 0.5);

  double reference = std::accumulate(data.begin(), data.end(), 0.0);
  double candidate = std::accumulate(data.rbegin(), data.rend(), 0.0);

  double rel_tol = 1e-9;
  double diff = std::fabs(candidate - reference);
  double scale = std::max(std::fabs(reference), 1.0);
  bool ok = diff <= rel_tol * scale;

  std::printf("reference=%.6f candidate=%.6f within_tolerance=%d\\n", reference,
              candidate, ok ? 1 : 0);
  return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Google Benchmark',
      href: 'https://github.com/google/benchmark',
      description: '撰寫可重現微基準的標準函式庫，適合作為 Capstone 效能量測的骨幹工具。',
    },
    {
      title: 'ThreadSanitizer',
      href: 'https://clang.llvm.org/docs/ThreadSanitizer.html',
      description: '偵測 data race 的官方文件，說明如何建置與解讀報告，是正確性驗收的必經工具。',
    },
    {
      title: 'AddressSanitizer',
      href: 'https://clang.llvm.org/docs/AddressSanitizer.html',
      description: '偵測記憶體錯誤（越界、use-after-free 等）的官方文件。',
    },
    {
      title: 'STREAM Benchmark',
      href: 'https://www.cs.virginia.edu/stream/',
      description: '量測記憶體頻寬的經典基準，適合為 roofline 分析建立記憶體上限基準線。',
    },
  ],
};

export default ind31CapstoneProject;
