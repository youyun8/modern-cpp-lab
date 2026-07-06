import type { ChapterContent } from '@/types/ChapterContent';

const ind30OpenmpMpiInterop: ChapterContent = {
  slug: 'ind30-openmp-mpi-interop',
  chapterLabel: '第 59 章',
  title: '與 OpenMP／MPI 的分工與互操作',
  group: '第 18 部：架構、樣式與整合',
  description:
    'std::execution 與 OpenMP task 的取捨、Hybrid MPI + C++ threads 的 MPI_THREAD_MULTIPLE 陷阱，以及漸進遷移策略。',
  concept: {
    standard: 'C++26',
    body: 'OpenMP 與 MPI 都不是 ISO C++ 標準的一部分：OpenMP 是獨立的編譯器指示詞（pragma-based）規格，同時支援 C、C++、Fortran；MPI 是一份程序間通訊的函式庫 API 規格，同樣是語言中立的。兩者在 HPC 領域已有二十到三十年的部署歷史與編譯器/runtime 調校經驗。C++26 預期納入的 `std::execution`（P2300）則是第一個嘗試以純函式庫（不依賴編譯器 pragma）方式標準化結構化並行的方案。這一章的重點不是「哪個比較新就該取代舊的」，而是誠實地畫出邊界：現階段 std::execution 在 NUMA 感知排程、SIMD 提示、以及與既有 MPI runtime 的整合成熟度上，仍全面落後 OpenMP／MPI 的既有工具鏈，因此真實世界的 HPC 程式碼多半是「新程式碼、非熱路徑」逐步採用現代 C++ 並行，而非整體重寫。',
  },
  deepDive: [
    {
      heading: 'std::execution 何時能取代 OpenMP task，何時仍不能',
      body: '`std::execution` 提供的是可移植、以型別與函式庫組合表達的結構化並行（sender／receiver、`then`、`bulk`、`when_all`，見第 45 章），優點是不需要編譯器特別支援 pragma 語法、可以和一般 C++ 泛型程式碼自然組合、錯誤與取消路徑（`set_error`／`set_stopped`）有統一的語意。這些特質使它適合表達「任務圖」明確、粒度中等、且希望程式碼可移植到不同執行環境（CPU 執行緒池、未來的 GPU scheduler）的場景。\n\n但 OpenMP 累積數十年的優勢並非空談：`#pragma omp parallel for` 搭配 `schedule(static|dynamic|guided, chunk)`、`proc_bind(close|spread|master)`、`num_threads` 等子句，讓程式設計者可以在原始碼層級精細控制 NUMA 親和性、負載平衡策略與執行緒綁定，這些能力目前在 `std::execution` 中沒有標準化的對應物——排程細節被刻意留給 scheduler 實作，但生態系尚未出現與 OpenMP 同等成熟、且被廣泛部署的 NUMA 感知 scheduler。此外，`#pragma omp simd`／`declare simd` 這類「原始碼層級提示」直接告訴編譯器在向量化時可以做哪些假設（例如忽略特定型別的別名疑慮），這是函式庫呼叫做不到的、編譯器前端層級的溝通管道。因此誠實的結論是：`std::execution` 是一個正在成形、值得投資學習的方向，但它目前是「函式庫層級的補充」，還不是能在效能敏感的 NUMA 感知迴圈或需要編譯器向量化提示的熱路徑上，直接取代 OpenMP 的生產級替代品。',
    },
    {
      heading: 'Hybrid MPI + C++ threads 的正確性：MPI thread support level',
      body: 'MPI 標準定義了四個執行緒支援等級，透過 `MPI_Init_thread(argc, argv, required, &provided)` 向 MPI 實作要求，並必須檢查 runtime 實際 `provided` 的等級（實作可能給予比 `required`更高或更低的等級，程式必須依 `provided` 而非 `required` 調整行為）：\n\n`MPI_THREAD_SINGLE` — 行程內只有一個執行緒，完全沒有多執行緒支援，若程式其實有多執行緒同時活躍，即使只有一個執行緒呼叫 MPI，這個等級在語意上也不保證安全。\n\n`MPI_THREAD_FUNNELED` — 行程可以是多執行緒，但所有 MPI 呼叫都必須由同一個特定執行緒（通常是呼叫 `MPI_Init_thread` 的主執行緒）發出，其餘執行緒完全不可呼叫任何 MPI 函式。這是「OpenMP 平行區塊做運算、主執行緒外的序列部分做 MPI 通訊」這種常見混合模式最低限度需要的等級。\n\n`MPI_THREAD_SERIALIZED` — 多個執行緒都可以呼叫 MPI，但同一時間只能有一個執行緒正在呼叫（呼叫之間必須序列化，通常由使用者自行以鎖保護），MPI 實作不負責替使用者做這層互斥。\n\n`MPI_THREAD_MULTIPLE` — 多個執行緒可以同時、不需額外互斥地呼叫 MPI 函式，MPI 實作內部自行保證執行緒安全。這是彈性最大、但風險也最高的等級：不少 MPI 實作雖然「宣稱」支援 `MPI_THREAD_MULTIPLE`，實際上內部鎖競爭嚴重，效能遠低於 `FUNNELED`／`SERIALIZED` 模式，甚至某些網路互連層（interconnect）搭配特定版本會出現尚未修復的正確性瑕疵。實務上的鐵律是：永遠檢查 `MPI_Init_thread` 回傳的 `provided` 等級，不要假設要求的等級一定會被滿足，且在效能測試前不要預設 `MPI_THREAD_MULTIPLE` 一定比較快。',
    },
    {
      heading: 'C++ 記憶體模型與 MPI 記憶體模型的交界',
      body: 'C++ 標準的 happens-before 關係（第 33 章）只描述同一個位址空間內、由 C++ 同步原語（`std::atomic` 的 release／acquire、mutex 的 unlock／lock、`std::thread::join` 等）所建立的可見性保證。MPI 通訊發生在完全不同的同步網域：一次成功完成的 `MPI_Send`／`MPI_Recv`（或其非阻塞版本搭配 `MPI_Wait`）在傳送端與接收端之間建立的是 MPI 標準自身定義的排序與資料可見性保證，這個保證由 MPI 實作透過網路層、共享記憶體段（若在同一節點內，MPI 實作可能內部使用 shared memory 做最佳化）或其他機制達成，完全不經過、也不受 C++ 的 `std::atomic` 或記憶體屏障（fence）語意約束。\n\n這裡最容易出錯的地方，是在同一個行程內混合使用「MPI 訊息完成」與「C++ 執行緒間共享記憶體同步」這兩種機制時，把其中一種誤當成另一種的替代品：一個執行緒收到 `MPI_Recv` 完成，不代表這個行程裡其他執行緒能安全地讀取由該次接收更新的資料——如果另一個執行緒要讀取這份剛收到的資料，仍然需要一條標準的 C++ happens-before 邊（例如用 `std::atomic` 旗標或 mutex 把「MPI 接收完成」這個事實傳遞給其他執行緒），MPI 的完成語意本身不會自動延伸成 C++ 執行緒間的 synchronizes-with 關係。反過來，也不能用 C++ 的 `std::atomic` 去同步兩個不同行程（不同位址空間）——`std::atomic` 只對同一位址空間內的執行緒有意義，跨行程一定得靠 MPI（或其他 IPC 機制）本身的同步原語。',
    },
    {
      heading: '既有 OpenMP／MPI 程式碼的漸進遷移策略',
      body: '整體重寫一份運作中的 HPC 程式碼库以引入現代 C++ 並行，成本與風險通常無法被證成；務實的路徑是找出「風險低、可局部驗證」的切入點，逐步把現代 C++ 慣用法引入非熱路徑或邊界清楚的模組，而不動既有的 OpenMP／MPI 熱迴圈：\n\n1. 用 `std::atomic` 取代等價的 OpenMP `critical`／`atomic` 子句——若一段 `#pragma omp critical` 保護的只是一個簡單的計數器累加或旗標更新，改用 `std::atomic` 搭配合適的 `memory_order` 通常能降低鎖競爭、且是純 C++ 標準庫層級的改動，不影響外層 OpenMP 平行迴圈的結構。\n\n2. 用 `std::jthread` 承接輔助、非效能關鍵的執行緒——例如背景寫 log、定期健康檢查、非同步 I/O 預取，這些工作與主計算迴圈的效能無關，卻常常是舊程式碼裡手寫 `pthread_create`／裸 `std::thread` 且忘記處理例外或忘記 join 的地方；`std::jthread` 的 RAII join 與 `stop_token` 支援可以直接消除這類資源洩漏與忘記等待的錯誤，同時完全不觸碰熱路徑的 OpenMP／MPI 呼叫。\n\n3. 用 RAII 與 `std::expected`（C++23）包裝新增的邊界程式碼——例如新的組態解析、新的檔案匯出模組——讓新程式碼享有現代錯誤處理與資源管理的好處，而既有的、已經過長期驗證的 OpenMP／MPI 核心運算迴圈維持原樣，直到有具體證據（效能量測、正確性回歸測試）支持進一步改動為止。這種「新程式碼現代化、舊熱路徑先求穩定」的分層策略，是大型 HPC 程式碼库實務上最常見、風險最可控的遷移方式。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <mpi.h>
#include <omp.h>

#include <atomic>
#include <cstdio>
#include <vector>

int main(int argc, char** argv) {
    // 要求 MPI_THREAD_FUNNELED：只有呼叫 MPI_Init_thread 的這個
    // （主）執行緒之後可以呼叫任何 MPI 函式，OpenMP 平行區塊內的
    // worker 執行緒完全不可呼叫 MPI。 [1]
    int provided = MPI_THREAD_SINGLE;
    MPI_Init_thread(&argc, &argv, MPI_THREAD_FUNNELED, &provided);
    if (provided < MPI_THREAD_FUNNELED) {
        // 必須檢查實際獲得的等級，不能假設 required 一定被滿足。 [2]
        std::fprintf(stderr,
                     "MPI implementation does not provide "
                     "MPI_THREAD_FUNNELED\\n");
        MPI_Abort(MPI_COMM_WORLD, 1);
    }

    int rank = 0;
    int world_size = 1;
    MPI_Comm_rank(MPI_COMM_WORLD, &rank);
    MPI_Comm_size(MPI_COMM_WORLD, &world_size);

    constexpr int kLocalSize = 1'000'000;
    std::vector<double> local_data(kLocalSize, static_cast<double>(rank));

    // 用 std::atomic 取代原本可能是 #pragma omp critical 的累加器：
    // 這是「漸進遷移」中最低風險的一步，不改動外層 OpenMP 迴圈結構。 [3]
    std::atomic<long long> processed_count{0};

    double local_sum = 0.0;
#pragma omp parallel for reduction(+ : local_sum) schedule(static)
    for (int i = 0; i < kLocalSize; ++i) {
        // 熱路徑：純本地運算，完全不呼叫任何 MPI 函式。 [4]
        local_data[static_cast<std::size_t>(i)] *= 2.0;
        local_sum += local_data[static_cast<std::size_t>(i)];
        processed_count.fetch_add(1, std::memory_order_relaxed);
    }

    // 離開 OpenMP 平行區塊後，回到單一（主）執行緒的序列部分，
    // 才是唯一允許呼叫 MPI 的地方（滿足 MPI_THREAD_FUNNELED 的要求）。 [5]
    double global_sum = 0.0;
    MPI_Reduce(&local_sum, &global_sum, 1, MPI_DOUBLE, MPI_SUM, 0, MPI_COMM_WORLD);

    // 注意：MPI_Reduce 完成後 global_sum 在 rank 0 上有效，這個保證
    // 來自 MPI 標準自身的語意，與 C++ 的 happens-before／std::atomic
    // 無關——它們是兩套獨立的同步網域。 [6]
    if (rank == 0) {
        std::printf("global_sum = %f across %d ranks\\n", global_sum, world_size);
    }

    MPI_Finalize();
    return 0;
}`,
    callouts: [
      {
        n: 1,
        text: 'MPI_Init_thread 必須用 required 明確要求執行緒等級；FUNNELED 表示只有主執行緒可以呼叫 MPI，OpenMP worker 執行緒一律不可。',
      },
      {
        n: 2,
        text: '永遠檢查 provided 而非假設 required 被滿足：MPI 實作可能只給予較低等級的支援。',
      },
      {
        n: 3,
        text: '用 std::atomic 取代 OpenMP critical/atomic 子句是漸進遷移的低風險第一步，屬於純 C++ 標準庫層級改動。',
      },
      { n: 4, text: 'OpenMP 平行迴圈內的熱路徑完全不呼叫 MPI，避免違反 FUNNELED 的限制。' },
      {
        n: 5,
        text: '離開 parallel for 之後，程式回到單一執行緒，這裡才是唯一允許呼叫 MPI_Reduce 等 MPI 函式的地方。',
      },
      {
        n: 6,
        text: 'MPI_Reduce 的完成語意來自 MPI 標準自身，不經過 C++ 的 happens-before／atomic 機制，兩者是獨立的同步網域。',
      },
    ],
  },
  pitfalls: [
    '假設 MPI 自動支援 `MPI_THREAD_MULTIPLE`：多執行緒同時呼叫 MPI 函式卻沒有先透過 `MPI_Init_thread` 明確要求並確認 `provided` 等級，是未定義／實作相依的行為，即使在特定平台上「剛好」沒出錯也不代表可移植。',
    '誤以為一次完成的 MPI 通訊會自動與接收端的 C++ `std::atomic` 或其他執行緒建立 synchronizes-with 關係——MPI 的完成語意與 C++ 記憶體模型是兩套獨立的同步網域，跨執行緒可見性仍需要標準 C++ 同步原語自行建立。',
    'OpenMP 平行區塊與手動建立的 `std::thread`／執行緒池同時競爭相同的實體核心，造成過度訂閱（oversubscription）：例如在 OpenMP `parallel for` 內部又額外開啟執行緒池執行子任務，導致 context switch 開銷暴增、效能不升反降。',
    '在 `MPI_THREAD_FUNNELED` 模式下，讓 OpenMP 平行區塊內的 worker 執行緒直接呼叫 MPI 函式，違反該等級「只有初始化 MPI 的執行緒可呼叫 MPI」的限制。',
    '過度樂觀地把 `std::execution` 當成已可直接取代 OpenMP NUMA 感知排程與 SIMD 提示（`declare simd`）的生產級方案，忽略目前生態系與工具鏈成熟度的落差。',
  ],
  bestPractices: [
    '所有 hybrid MPI + 執行緒程式一律呼叫 `MPI_Init_thread` 並顯式檢查 `provided`，不要用 `MPI_Init`（其等級由實作決定且通常較保守）就假設多執行緒安全。',
    '明確劃定「哪個執行緒可以呼叫 MPI」：`FUNNELED` 模式下把所有 MPI 呼叫集中在平行區塊外的序列段落，避免散落在 worker 執行緒程式碼中難以稽核。',
    '把「MPI 通訊完成」這個事實傳遞給同一行程內其他執行緒時，一律透過標準 C++ 同步原語（`std::atomic`、mutex）明確建立 happens-before，不要假設 MPI 的完成語意會自動延伸到執行緒間。',
    '規劃執行緒與程序拓樸時，確保 OpenMP 執行緒數與任何額外的 `std::thread`／執行緒池總數不超過每個 MPI rank 實際可用的核心數，避免過度訂閱。',
    '對新增、非熱路徑的程式碼優先採用現代 C++（`std::jthread`、`std::atomic`、`std::expected`），既有且經過驗證的 OpenMP／MPI 熱路徑則以量測數據驅動、逐步而非一次性地改動。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '在 `MPI_THREAD_FUNNELED` 等級下，下列敘述何者正確？',
      options: [
        { id: 'a', text: '任何執行緒都可以隨時呼叫任何 MPI 函式' },
        {
          id: 'b',
          text: '只有呼叫 MPI_Init_thread 的那個執行緒可以呼叫 MPI 函式，其餘執行緒完全不可呼叫',
        },
        { id: 'c', text: '多個執行緒可以呼叫 MPI，但必須自行用鎖序列化' },
        { id: 'd', text: '這個等級完全不允許程式使用多執行緒' },
      ],
      correctOptionId: 'b',
      explanation:
        'MPI_THREAD_FUNNELED 允許行程是多執行緒的，但硬性規定所有 MPI 呼叫都必須來自同一個（通常是初始化 MPI 的）執行緒；其他執行緒即使存在，也一律不可呼叫任何 MPI 函式。',
    },
    {
      id: 'q2',
      stem: '一個執行緒呼叫 MPI_Recv 成功收到資料後，同行程內另一個執行緒想要讀取這份剛收到的資料，下列何者正確？',
      options: [
        { id: 'a', text: 'MPI_Recv 完成本身就自動建立跨執行緒的 happens-before，可以直接讀取' },
        {
          id: 'b',
          text: '仍需要透過 std::atomic 或 mutex 等標準 C++ 同步原語，明確在兩個執行緒之間建立 happens-before，MPI 的完成語意不會自動延伸到執行緒間',
        },
        { id: 'c', text: '完全不可能安全地做到，只能用另一次 MPI 呼叫在同一行程內傳遞資料' },
        { id: 'd', text: '只要兩個執行緒都在同一個 CPU 核心上執行就自動安全' },
      ],
      correctOptionId: 'b',
      explanation:
        'MPI 的通訊完成語意屬於 MPI 標準自身定義的同步網域，與 C++ 記憶體模型的 happens-before 是兩套獨立的機制；要讓同行程內其他執行緒安全看到剛接收的資料，仍必須用 C++ 標準同步原語明確建立跨執行緒的可見性。',
    },
    {
      id: 'q3',
      stem: '關於 `std::execution`（C++26）與 OpenMP 的取捨，下列敘述何者最誠實？',
      options: [
        { id: 'a', text: 'std::execution 已經在所有主流編譯器成熟實作，可以立即全面取代 OpenMP' },
        { id: 'b', text: 'OpenMP 完全過時，任何新專案都不應再使用' },
        {
          id: 'c',
          text: 'std::execution 提供可移植的函式庫層級結構化並行，但在 NUMA 感知排程、schedule 子句與 SIMD 編譯器提示等方面，目前仍不及 OpenMP 成熟；兩者現階段是互補而非取代關係',
        },
        { id: 'd', text: '兩者功能完全重疊，選哪一個純粹是個人偏好問題' },
      ],
      correctOptionId: 'c',
      explanation:
        'std::execution 是有前景但仍在成形中的純函式庫方案，缺乏 OpenMP 數十年累積的 NUMA 感知排程子句與編譯器層級的向量化提示（如 declare simd）；誠實的定位是目前兩者互補，新程式碼可逐步採用 std::execution，既有效能關鍵熱路徑上 OpenMP 仍有明顯優勢。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: [
      'MPI（跨行程通訊）',
      'OpenMP（節點內平行迴圈）',
      'C++ 標準並行（std::atomic／jthread／std::execution）',
      '漸進遷移（新程式碼優先、熱路徑最後）',
    ],
    caption:
      'MPI 負責跨行程通訊、OpenMP 負責節點內平行迴圈，兩者是獨立的既有 HPC 工具鏈；C++ 標準並行工具先進入非熱路徑與新程式碼，再視量測結果逐步、謹慎地擴大到既有熱路徑。',
  },
  tryIt: {
    code: `// 簡化示意：本地端無需 MPI runtime 也能觀察的部分——
// 用 std::atomic 取代假想的 OpenMP critical 計數器。
// 完整的 MPI + OpenMP 版本請見本章 code 區塊，需要 mpicxx 編譯與多行程執行。
#include <atomic>
#include <cstdio>

int main() {
    constexpr int kSize = 1'000'000;
    std::atomic<long long> processed_count{0};

    double sum = 0.0;
#pragma omp parallel for reduction(+ : sum) schedule(static)
    for (int i = 0; i < kSize; ++i) {
        sum += static_cast<double>(i);
        // 取代 #pragma omp critical { ++processed_count; } 的低風險改動。
        processed_count.fetch_add(1, std::memory_order_relaxed);
    }

    std::printf("sum = %f, processed = %lld\\n", sum,
                processed_count.load(std::memory_order_relaxed));
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'MPI: A Message-Passing Interface Standard — Chapter on MPI and Threads',
      href: 'https://www.mpi-forum.org/docs/',
      description:
        'MPI 標準文件（MPI Forum 官方頁面），涵蓋 MPI_Init_thread 與四個執行緒支援等級的完整定義。',
    },
    {
      title: 'OpenMP Application Programming Interface Specification',
      href: 'https://www.openmp.org/specifications/',
      description:
        'OpenMP 官方規格文件，涵蓋 parallel for 的 schedule／proc_bind 子句與 SIMD 指示詞。',
    },
    {
      title: 'P2300R10 — std::execution',
      href: 'https://wg21.link/p2300',
      description: 'C++26 std::execution 的正式提案文件，可對照本章關於其成熟度與適用範圍的討論。',
    },
    {
      title: 'MPI + Threads — MPI Forum FAQ / Best Practices',
      href: 'https://www.mpi-forum.org/faq/',
      description:
        'MPI Forum 對 hybrid MPI + threads 常見問題的說明，包含各實作對 MPI_THREAD_MULTIPLE 支援程度的實務落差。',
    },
  ],
};

export default ind30OpenmpMpiInterop;
