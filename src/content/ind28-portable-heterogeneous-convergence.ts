import type { ChapterContent } from '@/types/ChapterContent';

const ind28PortableHeterogeneousConvergence: ChapterContent = {
  slug: 'ind28-portable-heterogeneous-convergence',
  chapterLabel: '第 57 章',
  title: '可攜異質程式設計的收斂趨勢',
  group: '第 17 部：異質運算',
  description:
    'SYCL、HIP、CUDA 的模型對照，std::par on GPU 與 std::execution bulk 的收斂，以及何時仍需廠商手調 kernel。',
  concept: {
    standard: 'C++23',
    body: '異質運算的程式設計模型正在往「單一原始碼、多後端派送」收斂，但收斂的路徑不只一條。SYCL 是 Khronos 制定的開放標準，以純現代 C++（lambda、buffer/accessor 或 unified shared memory）表達 kernel，可編譯到 NVIDIA、AMD、Intel 等多種後端；HIP 是 AMD 主推、語法幾乎與 CUDA 一一對應的可攜 API，並提供 hipify 工具半自動把既有 CUDA 原始碼轉換為 HIP；CUDA 則是 NVIDIA 專有但事實上主宰產業的生態系，擁有最成熟的工具鏈與函式庫。與此同時，C++ 標準庫本身也在往同一方向收斂：`std::par` 透過 nvc++／roc-stdpar 等編譯器把標準演算法 offload 到 GPU，`std::execution`（P2300）則用 scheduler／sender 抽象把「演算法結構」與「執行後端」解耦。本章把這些互相競爭又彼此呼應的模型放在一起比較，並誠實面對一個尚未解決的張力：標準化寫法帶來可攜性，但頂尖效能往往仍仰賴廠商手調 kernel。',
  },
  deepDive: [
    {
      heading: 'SYCL、HIP、CUDA 三方模型對照',
      body: 'CUDA 是 NVIDIA 於 2007 年推出的專有生態系，包含 `nvcc` 編譯器、`cuBLAS`／`cuDNN`／`cuFFT` 等高度最佳化函式庫、`Nsight` 系列剖析工具，以及龐大的社群與現成程式碼庫。它的最大優勢不是技術本身多先進，而是「事實上的產業標準」地位：絕大多數深度學習框架、HPC 應用、教學材料都以 CUDA 為第一參考實作，這使得脫離 CUDA 生態的移植成本必須被嚴肅評估，而非視為單純的技術選型。\n\nHIP（Heterogeneous-compute Interface for Portability）是 AMD 對這個現實的直接回應：它的 API 語法幾乎是 CUDA Runtime API 的鏡像（`hipMalloc` 對應 `cudaMalloc`、`hipLaunchKernelGGL` 對應 `<<<>>>` 語法糖等），讓熟悉 CUDA 的工程師幾乎不需要重新學習程式設計模型。AMD 提供 `hipify-perl`／`hipify-clang` 工具，能掃描既有 CUDA 原始碼並自動轉換絕大多數呼叫為 HIP 等價物；HIP 程式碼本身可以在編譯期選擇後端，在 AMD GPU 上編譯為原生 ROCm 呼叫，在 NVIDIA GPU 上則直接轉呼叫底層 CUDA，因此同一份 HIP 原始碼具備跨兩大廠牌硬體的可攜性。\n\nSYCL 走的是完全不同的路線：它是 Khronos Group（也是 OpenCL、Vulkan 背後的標準組織）制定的開放標準，核心訴求是「單一原始碼（single-source）」的純標準 C++——不需要像 CUDA 那樣引入 `__global__`／`<<<>>>` 這類語言擴充語法，kernel 直接以 lambda 或函式物件表達，資料存取透過 `buffer`／`accessor` 抽象（自動處理主機與裝置間的資料搬移與相依關係）或 unified shared memory（USM，語意更接近一般指標）。SYCL 實作（如 Intel oneAPI DPC++、AdaptiveCpp／原 hipSYCL、triSYCL）可以把同一份原始碼編譯到 CPU、Intel GPU、NVIDIA GPU（透過 CUDA 後端）、AMD GPU（透過 HIP 後端）等多種目標，理論上提供三者中最高的硬體無關可攜性，代價是各實作對特定硬體特化指令的支援程度不一，效能可攜性（performance portability）比語法可攜性更難兌現。',
    },
    {
      heading: 'std::par on GPU 與 std::execution 的收斂：兩條通往同一終點的路',
      body: '仔細觀察會發現，`std::par` 的 GPU offload（第 43 章介紹的 nvc++ `-stdpar=gpu`、AMD 的 roc-stdpar）與 `std::execution` 的 scheduler／bulk 抽象（第 45 章）其實是同一個目標的兩種表現形式：讓使用者以標準 C++ 描述「做什麼」，把「在哪個硬體上做」的決定權下放給編譯器或執行期。\n\n`std::par` 這條路線的做法是「編譯器魔法」：使用者完全不需要改寫演算法呼叫，只需要在編譯選項上打開 GPU offload，編譯器分析標準演算法的呼叫模式，在滿足記憶體與函式限制的前提下自動產生裝置端 kernel。這條路線的優點是遷移成本最低（既有的 `std::transform_reduce`、`std::for_each` 呼叫幾乎原封不動），缺點是使用者對「什麼會被 offload、offload 效果如何」的掌控力較弱，且高度仰賴特定編譯器（nvc++、未來的 roc-stdpar 對應工具鏈）的實作品質。\n\n`std::execution` 這條路線則是「顯式但可攜的抽象」：使用者明確選擇一個 `scheduler`（可能代表 CPU 執行緒池，也可能代表 GPU stream），再用 `bulk` 等演算法把資料平行工作排入該 scheduler，演算法邏輯本身完全不知道底層硬體是什麼。這條路線的優點是控制力與可組合性更高（可以用 `then`／`when_all` 串接跨硬體的複雜工作流，例如「CPU 前處理 → GPU bulk 運算 → CPU 後處理」），缺點是需要顯式改寫程式碼以採用 sender／receiver 模型，且截至目前仍高度仰賴 stdexec 這類參考實作，各硬體廠商提供符合概念的 scheduler 的完整度也還在演進中。\n\n把兩者放在一起看，會發現業界正朝著「使用者只描述演算法結構，硬體派送交給工具鏈或執行期」這個共同方向前進，只是 `std::par` 選擇隱藏派送機制、`std::execution` 選擇把派送機制（scheduler）做成顯式但泛用的第一級抽象。理解這個收斂脈絡，比背誦兩者的 API 細節更重要：它說明了為什麼學會 `std::execution` 的 scheduler 概念，對未來讀懂任何一種「標準 C++ 派送到異質硬體」的機制都有幫助。',
    },
    {
      heading: '何時用標準 C++、何時仍需廠商手調 kernel：誠實面對 GEMM 的現實',
      body: '標準庫路線（`std::par`、規劃中的 `std::linalg`）的價值在於可攜性、可讀性與維護成本：同一份程式碼理論上可以在不同世代、不同廠牌的硬體上編譯執行，不需要為每個後端維護一份平行的 kernel 原始碼，也讓非平行運算專家的工程師更容易理解與修改程式邏輯。對於資料搬移主導（memory-bound）、或計算模式不特別規則、又或者效能要求是「夠快就好」而非「業界最佳」的場景，標準 C++ 路線通常是務實的第一選擇。\n\n然而在最效能敏感的內層迴圈——尤其是稠密矩陣乘法（GEMM）與近年的 attention kernel——現實是廠商手調的 kernel 仍然持續勝出。`cuBLAS`／`rocBLAS` 這類函式庫背後投入了數十人年的工程，針對每一代硬體的暫存器檔案大小、共享記憶體 bank 數量、tensor core／matrix core 的資料佈局要求、記憶體階層的 tile 策略做極致調校，甚至為不同的矩陣形狀（tall-skinny、square、batched）維護不同的專用 kernel 變體。標準演算法或泛用的 `std::linalg` 呼叫即便能夠 offload 到 GPU，編譯器產生的 kernel 通常無法自動重現這種手工調校的資料佈局與排程決策，實測效能與廠商函式庫之間往往存在顯著差距，且差距在新一代硬體推出初期（廠商函式庫尚未針對新架構調校完成前）與推出後期（廠商函式庫已深度調校）都可能不同，不能一概而論。\n\n誠實的結論是：這個張力目前並未被「解決」，只是被更清楚地劃出了邊界。標準 C++ 路線持續在擴大「足夠好」的涵蓋範圍（新版本的執行策略、`std::linalg`、`std::execution` 都在往效能可攜性靠近），但只要硬體廠商仍然可以透過人工調校榨出額外的個位數到兩位數百分比效能，對延遲或吞吐量錙銖必較的高效能運算核心，手調 kernel 或至少直接呼叫廠商函式庫，仍會是業界的現實選擇，而非單純的技術債。',
    },
    {
      heading: '決策框架：如何在硬體多樣性、團隊能力與效能要求之間取捨',
      body: '面對「該用哪個模型」的問題，可以從三個維度評估。第一是目標硬體多樣性：如果專案必須同時支援 NVIDIA 與 AMD（甚至 Intel）GPU，且不願意維護多份 kernel 原始碼，SYCL 或 HIP（透過其 NVIDIA 後端）提供的單一原始碼可攜性有明顯優勢；如果目標硬體長期鎖定單一廠牌，直接使用該廠牌的原生 API（CUDA 或 ROCm HIP）通常能取得最完整的工具鏈與文件支援，減少可攜層帶來的抽象開銷與除錯難度。\n\n第二是團隊既有能力與遷移成本：已經擁有大量 CUDA 程式碼與 CUDA 專長的團隊，若需要支援 AMD 硬體，HIP 搭配 hipify 通常是遷移路徑最短的選擇，但務必把 hipify 的輸出視為「起點」而非「終點」；若團隊本來就以標準 C++／STL 風格開發、希望降低平行程式設計的心智負擔，`std::par` 或 `std::execution` 提供的漸進式路徑（先寫可讀的標準演算法，再視效能需求決定是否下沉到廠商 kernel）往往是更平滑的技術演進節奏。\n\n第三是效能要求的嚴苛程度：對絕大多數應用邏輯（資料前處理、非熱點路徑、原型驗證），標準 C++ 路線的可讀性與可攜性效益通常大於效能損失；但對已被剖析工具明確標示為熱點的核心運算（GEMM、卷積、attention、FFT），應該預期最終仍需呼叫廠商函式庫或撰寫專用 kernel，並把標準 C++ 版本保留作為正確性基準與跨硬體的後備路徑，而不是假設單一模型能同時滿足所有場景的可攜性與效能需求。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <algorithm>
#include <execution>
#include <numeric>
#include <vector>

// The SAME logical operation -- elementwise vector add -- expressed via
// std::par-style standard C++. Conceptually, this one call could map to:
//   * a SYCL parallel_for over a sycl::range<1>(n) with USM pointers; [1]
//   * a HIP kernel launch: hipLaunchKernelGGL(vectorAddKernel, ...);   [2]
//   * a raw CUDA <<<blocks, threads>>> kernel launch of the same shape. [3]
// The point of this chapter's convergence story is that none of those
// three require a different *algorithmic* description -- only a different
// dispatch mechanism underneath.
void vectorAdd(const std::vector<float>& a, const std::vector<float>& b, std::vector<float>& out) {
    // [4] std::execution::par_unseq: portable request for data-parallel
    // dispatch. Whether this actually lands on a GPU depends entirely on
    // the compiler/toolchain (e.g. nvc++ -stdpar=gpu, roc-stdpar) and on
    // the memory backing a/b/out being GPU-accessible.
    std::transform(std::execution::par_unseq,  // [5]
                   a.begin(), a.end(), b.begin(), out.begin(),
                   [](float x, float y) { return x + y; });  // [6]
}

// Equivalent structure using std::execution (P2300 / stdexec) instead of
// an execution-policy algorithm: the same "add elementwise" work is
// expressed as a bulk sender, and the scheduler (sch) -- not this
// function -- decides whether it runs on a CPU thread pool or a GPU
// stream. This is the "std::execution bulk" side of the same convergence.
//
//   auto work = stdexec::schedule(sch)
//       | stdexec::bulk(n, [=](std::size_t i) {
//             out[i] = a[i] + b[i];
//         });
//   stdexec::sync_wait(work);`,
    callouts: [
      {
        n: 1,
        text: 'SYCL 版本會用 parallel_for 搭配 USM 指標表達完全相同的逐元素加法，語法不同但結構一致。',
      },
      {
        n: 2,
        text: 'HIP 版本會啟動一個明確撰寫的 kernel，語法幾乎與對應的 CUDA kernel 一一對應。',
      },
      { n: 3, text: 'CUDA 版本結構相同，只是換成 <<<>>> 語法與 __global__ kernel 函式。' },
      {
        n: 4,
        text: '這是「隱藏派送」路線：呼叫端完全不改寫演算法邏輯，是否 offload 到 GPU 由編譯器與工具鏈決定。',
      },
      {
        n: 5,
        text: 'par_unseq 只是「請求」平行與向量化派送，實際能否落地到 GPU 仍取決於記憶體來源與編譯旗標。',
      },
      { n: 6, text: '元素函式維持純函式、無共享狀態，同時滿足 par_unseq 語意與跨後端可攜的前提。' },
    ],
  },
  pitfalls: [
    '假設 `std::par` 一旦編譯成功就自動取得 GPU 級效能，忽略記憶體是否可被 GPU 存取、演算法是否落在支援清單內等前提條件。',
    '把 hipify 轉換出的 HIP 程式碼當成可直接上線的產物，未檢視轉換工具無法自動處理的邊界情況（例如平台特有的 intrinsic、記憶體佈局假設）。',
    '低估 SYCL／HIP／CUDA 在特定硬體 intrinsic（如 tensor core／matrix core 專用指令、warp-level 原語）上的功能對等落差，導致「可攜」程式碼在某些後端效能大幅落後。',
    '認為選定一種可攜模型（SYCL 或 HIP 或 std::par）就能一勞永逸解決異質運算問題，而不為最熱的內層迴圈保留退回廠商函式庫或手調 kernel 的路徑。',
    '把效能比較建立在單一硬體世代或單一問題規模上，忽略廠商函式庫與可攜模型的相對優劣會隨硬體世代與資料形狀而變動。',
  ],
  bestPractices: [
    '以「多後端支援需求」與「團隊既有專長」作為選擇 SYCL、HIP 或原生 CUDA 的主要依據，而非單純追逐最新標準或最流行的名稱。',
    '把 hipify 的輸出視為遷移的起點，安排人工審查關鍵路徑，特別是記憶體管理與效能敏感的 kernel。',
    '對熱點運算（GEMM、attention、FFT 等）預設先評估廠商函式庫（cuBLAS／rocBLAS 等），只有在功能或授權限制無法滿足時才投入手寫 kernel。',
    '把標準 C++（`std::par`、`std::execution`）版本保留為正確性基準與跨硬體後備路徑，即使最終熱點交給廠商 kernel 處理。',
    '在效能關鍵決策前，於目標硬體與工具鏈版本上實測，不依賴其他世代硬體或其他廠牌的效能數據做外推。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: 'HIP 相對於 SYCL 與原生 CUDA，最主要的定位與優勢是什麼？',
      options: [
        { id: 'a', text: '它是唯一能在 CPU 上執行的模型' },
        {
          id: 'b',
          text: '語法幾乎與 CUDA Runtime API 一一對應，並提供 hipify 工具半自動轉換既有 CUDA 程式碼，同時可編譯到 AMD 與 NVIDIA 硬體',
        },
        { id: 'c', text: '它是 Khronos 制定的開放標準，因此比 CUDA 更快' },
        { id: 'd', text: '它不需要任何程式碼修改就能自動比 CUDA 快' },
      ],
      correctOptionId: 'b',
      explanation:
        'HIP 是 AMD 主推、語法貼近 CUDA 的可攜 API，搭配 hipify 工具可從 CUDA 原始碼半自動轉換，同一份 HIP 程式碼可編譯到 AMD 原生 ROCm 或轉呼叫底層 CUDA，藉此降低熟悉 CUDA 的團隊遷移到 AMD 硬體的成本。',
    },
    {
      id: 'q2',
      stem: '`std::par` 的 GPU offload（如 nvc++ -stdpar=gpu）與 `std::execution` 的 scheduler/bulk 抽象，兩者在「派送到異質硬體」這件事上的關鍵差異是什麼？',
      options: [
        { id: 'a', text: '兩者完全無關，分屬不同標準且目標不同' },
        {
          id: 'b',
          text: 'std::par 讓編譯器隱式決定是否 offload，使用者不改寫演算法呼叫；std::execution 則要求顯式選擇 scheduler，把派送機制做成第一級抽象',
        },
        { id: 'c', text: 'std::execution 只能在 CPU 上執行，std::par 只能在 GPU 上執行' },
        { id: 'd', text: '兩者都需要完全重寫成 CUDA 語法才能運作' },
      ],
      correctOptionId: 'b',
      explanation:
        'std::par 路線的價值在於幾乎不需改寫既有標準演算法呼叫，是否落地到 GPU 由編譯器與工具鏈隱式決定；std::execution 路線則要求使用者顯式選擇 scheduler 並用 bulk 等演算法描述資料平行工作，兩者是「隱藏派送」與「顯式但泛用的派送抽象」這同一收斂目標的兩種表現形式。',
    },
    {
      id: 'q3',
      stem: '為什麼即使有 std::linalg 或高階可攜模型可用，GEMM 等核心運算在最效能敏感的場景仍常依賴 cuBLAS／rocBLAS 這類廠商函式庫？',
      options: [
        { id: 'a', text: '因為標準 C++ 演算法在語法上不允許表達矩陣乘法' },
        {
          id: 'b',
          text: '因為廠商函式庫針對特定硬體世代的暫存器、共享記憶體、tensor/matrix core 資料佈局做了泛用編譯器難以自動重現的極致調校',
        },
        { id: 'c', text: '因為廠商函式庫是唯一能在 GPU 上執行的程式碼' },
        { id: 'd', text: '因為標準委員會明文禁止把 std::linalg offload 到 GPU' },
      ],
      correctOptionId: 'b',
      explanation:
        '廠商函式庫投入大量工程針對每一代硬體的暫存器檔案、共享記憶體 bank、tensor/matrix core 資料佈局與 tile 策略做手工調校，這種程度的特化目前泛用編譯器難以從標準演算法呼叫自動推導出來，因此在最效能敏感的內層迴圈，手調 kernel 或廠商函式庫通常仍勝過標準 C++ 路線。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['SYCL', 'HIP', 'CUDA', 'std::execution'],
    caption:
      '四種模型收斂於同一目標——以標準或近標準 C++ 描述平行計算，再把「派送到哪個硬體」交給編譯器、hipify 轉換或 scheduler 抽象決定。',
  },
  tryIt: {
    code: `#include <algorithm>
#include <execution>
#include <iostream>
#include <vector>

int main() {
    const std::size_t n = 1'000'000;
    std::vector<float> a(n, 1.0f), b(n, 2.0f), out(n, 0.0f);

    // Portable, standard-C++ description of elementwise add. Whether this
    // dispatches to multiple CPU cores, SIMD lanes, or (with the right
    // compiler and memory setup) a GPU is an implementation detail hidden
    // behind the execution policy.
    std::transform(std::execution::par_unseq, a.begin(), a.end(), b.begin(), out.begin(),
                   [](float x, float y) { return x + y; });

    std::cout << "out[0] = " << out[0] << "\\n";
    std::cout << "out[n-1] = " << out[n - 1] << "\\n";
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'SYCL 2020 Specification — Khronos Group',
      href: 'https://registry.khronos.org/SYCL/specs/sycl-2020/html/sycl-2020.html',
      description:
        'SYCL 官方規格文件，涵蓋單一原始碼模型、buffer/accessor 與 USM 記憶體模型的完整定義。',
    },
    {
      title: 'HIP Porting Guide — ROCm Documentation',
      href: 'https://rocm.docs.amd.com/projects/HIP/en/latest/how-to/hip_porting_guide.html',
      description:
        'AMD 官方的 CUDA 到 HIP 移植指南，涵蓋 hipify 工具用法與需要人工審查的常見情境。',
    },
    {
      title: 'CUDA C++ Programming Guide — NVIDIA',
      href: 'https://docs.nvidia.com/cuda/cuda-c-programming-guide/',
      description: 'CUDA 官方程式設計指南，涵蓋 kernel 啟動語法、記憶體模型與效能調校基礎。',
    },
    {
      title: 'P2300R10 — std::execution',
      href: 'https://wg21.link/p2300',
      description:
        'senders/receivers 與 std::execution 的正式提案文件，是 scheduler/bulk 抽象的標準化依據。',
    },
  ],
};

export default ind28PortableHeterogeneousConvergence;
