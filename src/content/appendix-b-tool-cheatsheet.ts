import type { ChapterContent } from '@/types/ChapterContent';

const appendixBToolCheatsheet: ChapterContent = {
  slug: 'appendix-b-tool-cheatsheet',
  chapterLabel: '附錄 B',
  title: '工具速查',
  group: '附錄',
  description:
    'perf、LIKWID、rocprof、ThreadSanitizer、Google Benchmark、CppMem 等工具的速查與常用指令。',
  concept: {
    standard: 'C++20',
    body: '寫出正確又快速的平行 C++ 程式，光靠語言本身不夠——需要一整套工具鏈驗證正確性與量測效能。剖析工具（perf、LIKWID、rocprof）回答「時間花在哪裡」；消毒器（ThreadSanitizer、AddressSanitizer）回答「有沒有資料競爭或記憶體錯誤」；微基準框架（Google Benchmark）回答「這段程式碼實際多快、多穩定」；CppMem 這類形式化工具則回答「在給定的記憶體序下，這段程式碼所有合法結果是什麼」。這些工具彼此互補，涵蓋開發生命週期的不同階段：先以消毒器確保正確性，再以剖析工具找出熱點，最後以微基準驗證優化成效，CppMem 則用於釐清記憶體模型的邊界情況。本附錄以 C++20 的工具鏈慣例整理各工具的核心指令。',
  },
  code: {
    lang: 'bash',
    code: `# ---- perf: general-purpose sampling profiler on Linux ----
perf stat ./app                                    # [1] Overview of global performance counters
perf record -g -- ./app                            # [2] Sample and record the call stack
perf report                                        # View sampling results to find hot functions

# ---- LIKWID: lightweight hardware counters ----
likwid-perfctr -C 0-3 -g CACHE ./app                # [3] Measure cache event groups on specified cores

# ---- rocprof: AMD ROCm GPU profiling ----
rocprof --stats ./gpu_app                           # [4] Collect kernel execution time statistics

# ---- ThreadSanitizer: data race detection ----
g++ -std=c++20 -g -fsanitize=thread race.cpp -o race
TSAN_OPTIONS="halt_on_error=1 second_deadlock_stack=1" ./race  # [5]

# ---- Google Benchmark: microbenchmarking ----
./bench --benchmark_min_time=1s --benchmark_repetitions=10 \\
        --benchmark_report_aggregates_only=true            # [6]`,
    callouts: [
      {
        n: 1,
        text: 'perf stat 一次列出 IPC、快取未命中率、分支預測失誤率等硬體計數器，用於快速健檢。',
      },
      {
        n: 2,
        text: 'perf record -g 以取樣方式記錄呼叫堆疊；開銷低，適合觀察熱點在整個呼叫鏈的分布。',
      },
      {
        n: 3,
        text: 'likwid-perfctr -C 綁定核心、-g 指定計數器群組（如 CACHE、MEM），比 perf 更貼近硬體細節。',
      },
      {
        n: 4,
        text: 'rocprof 是 AMD ROCm 平台的 GPU 剖析工具，--stats 產生每個 kernel 的耗時彙總。',
      },
      {
        n: 5,
        text: 'TSAN_OPTIONS 可控制 TSan 行為，例如發現錯誤即中止、印出死鎖相關的第二條堆疊。',
      },
      {
        n: 6,
        text: '--benchmark_min_time 確保每個基準跑滿足夠時間以降低雜訊；--benchmark_repetitions 重複多次取統計量。',
      },
    ],
  },
  deepDive: [
    {
      heading: '剖析三劍客：perf、LIKWID、rocprof',
      body: 'perf 是 Linux 內建的通用取樣剖析工具，不需重新編譯即可用。`perf stat` 給出整體硬體計數器摘要（IPC、cache miss、分支預測失誤），`perf record` + `perf report` 則以低開銷取樣方式定位熱點函式與呼叫路徑，`-g` 旗標可加上呼叫堆疊。它的優勢是普適，幾乎任何 Linux 程式都能剖析。\n\nLIKWID 更貼近硬體，透過直接讀取 CPU 的效能計數器暫存器，提供比 perf 更細緻的計數器群組（如 `CACHE`、`MEM`、`FLOPS_DP`），並能以 `-C` 精準綁定特定核心，適合分析 NUMA 與快取行為等底層議題。\n\nrocprof 則是 AMD ROCm 生態系的 GPU 剖析工具，用於量測 HIP／OpenCL kernel 的執行時間、記憶體搬移與佔用率，是 GPU 平行程式優化不可或缺的工具，職責類似 NVIDIA 生態系的 nsight 系列。',
    },
    {
      heading: '消毒器：ThreadSanitizer 與 AddressSanitizer',
      body: 'ThreadSanitizer（TSan）以編譯旗標 `-fsanitize=thread` 插樁，動態偵測資料競爭與部分同步錯誤（如對已銷毀 mutex 上鎖）。執行期可用 `TSAN_OPTIONS` 環境變數調整行為，常用鍵值包括 `halt_on_error`（發現錯誤立即中止）、`second_deadlock_stack`（印出死鎖另一端的堆疊）與 `report_bugs`。\n\nAddressSanitizer（ASan，`-fsanitize=address`）則專注於記憶體錯誤：越界存取、釋放後使用、雙重釋放等，是 TSan 之外最常配對使用的消毒器。兩者插樁機制彼此衝突，不能編進同一個執行檔，需分開建置與執行。實務上會在 CI 分別跑 ASan+UBSan 與 TSan 兩種組態，交叉覆蓋不同類型的錯誤。',
    },
    {
      heading: 'Google Benchmark 的常用旗標與巨集',
      body: 'Google Benchmark 以 `BENCHMARK(FunctionName)` 巨集註冊一個微基準函式，函式內用 `for (auto _ : state) { ... }` 迴圈包住待測程式碼，並以 `BENCHMARK_MAIN()` 產生進入點。命令列旗標中，`--benchmark_min_time=<duration>` 確保每個基準案例至少跑滿指定時間，避免因執行太短而讀數雜訊過大；`--benchmark_repetitions=<N>` 重複整個基準 N 次並回報平均值與變異數；`--benchmark_report_aggregates_only=true` 只顯示彙總統計、隱藏個別重複，方便閱讀。\n\n此外 `--benchmark_filter=<regex>` 可篩選只跑符合名稱的基準；`--benchmark_counters_tabular=true` 讓自訂計數器以表格呈現。這些旗標的組合能大幅降低雜訊、提升結果可信度。',
    },
    {
      heading: 'CppMem：記憶體模型的形式驗證沙盒',
      body: 'CppMem 是一個線上工具，讓使用者輸入一小段使用 C++11 起原子操作與各種記憶體序（`memory_order_relaxed`、`acquire`、`release`、`seq_cst` 等）的程式，然後窮舉列出在 C++ 記憶體模型下所有合法的執行結果（包含看似違反直覺的重排序結果）。它不是效能剖析工具，而是形式化分析沙盒，適合用來驗證「這段無鎖程式碼在最寬鬆的記憶體序下是否仍然正確」。\n\n這與教材中記憶體模型（happens-before、synchronizes-with）章節直接呼應：當口頭推理難以窮盡所有交錯情況時，CppMem 能給出詳盡、可信的列舉結果，是設計無鎖資料結構前的重要驗證手段，但僅適用於足夠小的程式片段，無法取代對真實系統的測試。',
    },
  ],
  pitfalls: [
    '在未調整 `/proc/sys/kernel/perf_event_paranoid` 的系統上以非特權使用者執行 `perf record`，會因權限不足而失敗或資料不完整。',
    '嘗試把 ThreadSanitizer 與 AddressSanitizer 編進同一個執行檔——兩者插樁機制衝突，必須分開建置。',
    '省略 `--benchmark_min_time`，讓基準跑太短，導致計時雜訊蓋過真實差異，得出誤導性結論。',
    '在筆電或雲端共享 vCPU 上跑微基準，未關閉頻率調節（turbo/CPU 節流），造成結果不可重現。',
    '把 CppMem 拿來分析大型真實程式——它只適合驗證窮舉可行的小型記憶體序範例。',
  ],
  bestPractices: [
    '先用 `perf stat` 做整體健檢，再用 `perf record`/`perf report` 或 LIKWID 深入定位熱點，避免一開始就過度細節化。',
    'CI 中分開執行 ASan+UBSan 與 TSan 兩種組態，並設定 `TSAN_OPTIONS=halt_on_error=1` 讓錯誤立即可見。',
    '微基準務必搭配 `--benchmark_min_time` 與 `--benchmark_repetitions`，並在穩定、獨佔的環境下量測。',
    '設計無鎖演算法時，先用 CppMem 驗證核心的記憶體序邏輯，再進行真實實作與壓力測試。',
    'GPU 程式優化前用 rocprof 找出真正的 kernel 熱點，避免憑直覺猜測瓶頸位置。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '想要驗證一段只有數個原子操作、使用 memory_order_relaxed 的無鎖程式在所有合法重排序下的結果，最適合使用哪個工具？',
      options: [
        { id: 'a', text: 'perf' },
        { id: 'b', text: 'CppMem' },
        { id: 'c', text: 'Google Benchmark' },
        { id: 'd', text: 'rocprof' },
      ],
      correctOptionId: 'b',
      explanation:
        'CppMem 是專門窮舉列出 C++ 記憶體模型下所有合法執行結果的線上形式化驗證工具，適合驗證小段記憶體序邏輯，而非效能量測。',
    },
    {
      id: 'q2',
      stem: '懷疑多執行緒程式存在資料競爭，且已知不會同時需要 AddressSanitizer 的記憶體錯誤檢查，應優先使用哪個工具？',
      options: [
        { id: 'a', text: 'LIKWID' },
        { id: 'b', text: 'ThreadSanitizer（-fsanitize=thread）' },
        { id: 'c', text: 'Google Benchmark' },
        { id: 'd', text: 'perf stat' },
      ],
      correctOptionId: 'b',
      explanation:
        'ThreadSanitizer 專門偵測資料競爭與部分同步錯誤，以 -fsanitize=thread 編譯即可插樁偵測，是此情境下最直接的選擇。',
    },
    {
      id: 'q3',
      stem: '執行微基準時發現每次結果差異很大，最可能的直接改善方式是？',
      options: [
        { id: 'a', text: '改用 perf record 取樣' },
        { id: 'b', text: '提高 --benchmark_min_time 並增加 --benchmark_repetitions' },
        { id: 'c', text: '改用 CppMem 分析' },
        { id: 'd', text: '關閉編譯器最佳化' },
      ],
      correctOptionId: 'b',
      explanation:
        '延長每次執行時間並增加重複次數能降低計時雜訊、提供更可信的統計量，是 Google Benchmark 減少結果變異最直接的手段。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['剖析', '消毒器', '微基準', '形式驗證'],
    caption:
      '平行程式的工具鏈分工：以剖析工具找熱點、消毒器抓正確性錯誤、微基準量測優化成效，形式驗證工具釐清記憶體模型邊界情況。',
  },
  tryIt: {
    code: `#Minimal working toolchain example: sanitize first, then profile, then microbenchmark
g++ - std =
    c++ 20 - g - fsanitize =
        thread race.cpp -
        o race #1. First make sure there is no data race./
            race

                perf stat./
            race #2. Health-check the overall performance counters

# 3. Write a Google Benchmark microbenchmark for the key function (compiled separately as bench.cpp)
#BENCHMARK(BM_MyFunction);
#BENCHMARK_MAIN();
                g++ -
        std = c++ 20 - O2 bench.cpp - lbenchmark - lpthread - o bench./ bench-- benchmark_min_time =
                  1s --benchmark_repetitions = 5`,
  },
  furtherReading: [
    {
      title: 'perf Examples (Brendan Gregg)',
      href: 'https://www.brendangregg.com/perf.html',
      description: 'perf 命令的實例大全，涵蓋 stat、record、report 等常用子指令。',
    },
    {
      title: 'LIKWID (GitHub)',
      href: 'https://github.com/RRZE-HPC/likwid',
      description: 'LIKWID 輕量硬體計數器工具的原始碼、文件與計數器群組說明。',
    },
    {
      title: 'ROCProfiler (AMD ROCm Docs)',
      href: 'https://rocm.docs.amd.com/projects/rocprofiler/en/latest/',
      description: 'AMD ROCm 平台 GPU 剖析工具 rocprof 的官方文件。',
    },
    {
      title: 'ThreadSanitizer (Clang/LLVM Docs)',
      href: 'https://clang.llvm.org/docs/ThreadSanitizer.html',
      description: 'ThreadSanitizer 的編譯旗標、執行期選項與可偵測錯誤類型。',
    },
    {
      title: 'Google Benchmark User Guide',
      href: 'https://github.com/google/benchmark/blob/main/docs/user_guide.md',
      description: 'Google Benchmark 的巨集與命令列旗標完整說明。',
    },
    {
      title: 'CppMem: Interactive C/C++ Memory Model',
      href: 'https://svr-pes20-cppmem.cl.cam.ac.uk/cppmem/',
      description: '劍橋大學提供的線上 C++ 記憶體模型互動驗證工具。',
    },
  ],
};

export default appendixBToolCheatsheet;
