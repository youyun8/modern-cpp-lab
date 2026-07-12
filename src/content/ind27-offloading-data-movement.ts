import type { ChapterContent } from '@/types/ChapterContent';

const ind27OffloadingDataMovement: ChapterContent = {
  slug: 'ind27-offloading-data-movement',
  chapterLabel: '第 56 章',
  title: 'Offloading 模型與資料搬移成本',
  group: '第 17 部：異質運算',
  description:
    'host/device 執行模型與 kernel launch 開銷、unified/managed memory 的陷阱，以及 stream 重疊與資料搬移瓶頸。',
  concept: {
    standard: 'C++17',
    body: 'GPU offload 的本質是「host 端 CPU 指揮、device 端 GPU 執行」的異質模型：資料要先搬到 device 才能被 kernel 存取，計算結果通常還要搬回。這一切靠廠商執行環境（AMD ROCm/HIP、NVIDIA CUDA）以 C++ 語言擴充實作，並非 ISO C++ 標準——`__global__`、`<<<...>>>`、`hipMalloc` 這類語法需要 hipcc／nvcc 編譯，一般 g++/clang++ 無法直接處理。本章聚焦三件事：kernel launch 本身的排隊開銷、unified/managed memory 「看似免費」背後的 page migration 成本，以及如何用 pinned memory 與多條 stream/queue 讓資料搬移與計算重疊，並用剖析工具量測 PCIe 與 Infinity Fabric 頻寬，判斷瓶頸究竟在算力還是在資料搬移。以 AMD ROCm/HIP 為主要語彙，並與 CUDA 對照，因為兩者 API 形狀幾乎一一對應。',
  },
  deepDive: [
    {
      heading: 'host/device 執行模型與 kernel launch 開銷',
      body: 'GPU 程式是 host 程式碼與 device 程式碼的混合體：host（CPU）負責配置記憶體、搬移資料、發射（launch）kernel，device（GPU）則執行大量平行的執行緒網格。`hipLaunchKernelGGL(kernel, grid, block, sharedMem, stream, args...)`（或 `<<<...>>>` 語法）看似只是一次函式呼叫，實際上要經過 runtime／driver 排入指令佇列、驗證參數、配置硬體資源，這些都是真實的微秒級固定開銷，與 kernel 本身做多少事無關。\n\n因此，發射一百萬次「只做一個加法」的極小 kernel，總時間可能被 launch overhead 主宰，而非真正的計算。工業實務上要盡量批次化（batching）或融合（kernel fusion）：把多個小操作合併成一個較大的 kernel，或用 graph capture（HIP Graph／CUDA Graph）把一整串 launch 預先錄製、一次性重播，攤提排隊與驗證成本。這與 CPU 端「合併小型系統呼叫」的思路完全一致——固定開銷不會因為工作量小而消失。',
    },
    {
      heading: 'unified/managed memory 的真相與陷阱',
      body: '`hipMallocManaged`（對應 CUDA 的 `cudaMallocManaged`）配置的統一記憶體（unified memory）讓 host 與 device 可以用同一個指標存取，程式設計者不必手動 `hipMemcpy`，心智負擔大幅降低。但這只是把資料搬移「隱藏」到底層：當 host 存取一頁尚在 device 上的記憶體，或 device 存取一頁尚在 host 上的記憶體，硬體/驅動會觸發 page fault 並做 page migration，把整頁資料搬過去，這個延遲是真實存在的，只是不出現在你的原始碼裡。\n\n危險之處在於「隱性、難以察覺的效能懸崖」：程式邏輯正確、也能跑，但當存取模式在 host／device 之間頻繁乒乓（thrashing）——例如迴圈裡交替讓 CPU 與 GPU 各存取同一塊資料一次——效能可能比手動管理記憶體差一個數量級，而剖析工具第一眼看到的往往只是「kernel 變慢了」，真正原因要靠 page fault／page migration 計數器才能揪出來。統一記憶體適合原型開發與存取模式不規則、難以預先切分的資料結構；對延遲敏感、存取模式明確的熱路徑，仍建議手動配置 device 記憶體並顯式搬移。',
    },
    {
      heading: 'pinned memory 與 stream/queue 重疊',
      body: '一般用 `malloc`／`new` 配置的 host 記憶體是可分頁（pageable）的，作業系統隨時可能把它換頁到磁碟或搬動實體位址。DMA（Direct Memory Access）引擎要求來源位址在傳輸期間固定不動，因此對可分頁記憶體做 `hipMemcpyAsync` 時，驅動程式會先把資料複製到一塊內部的暫存 pinned buffer，再由 DMA 搬到 device——這一步複製是同步的，「非同步 API」因此悄悄退化成同步行為，H2D／D2H 頻寬也明顯較低。\n\n用 `hipHostMalloc`（對應 `cudaMallocHost` 或 `cudaHostAlloc`）配置的 pinned（page-locked）host 記憶體，作業系統保證其實體位址固定，DMA 引擎可以直接存取，這才是達成「真正非同步」傳輸的前提。搭配多條 stream/queue（HIP 的 `hipStream_t`、CUDA 的 `cudaStream_t`），可以把資料切成多個區塊，用雙緩衝（double buffering）模式讓「傳輸區塊 N+1」與「計算區塊 N」在不同 stream 上同時進行，隱藏傳輸延遲，逼近硬體理論頻寬與吞吐上限。代價是 pinned memory 是稀缺資源、配置/釋放較慢，且過量 pin 記憶體會壓縮系統可用分頁記憶體，須節制使用，通常只 pin 真正走高頻寬傳輸路徑的緩衝區。',
    },
    {
      heading: '量測 PCIe／Infinity Fabric 流量：找出真正瓶頸',
      body: '很多「GPU 太慢」的案例，根源其實是資料搬移而非算力不足。Host-device 之間的傳輸走 PCIe，其頻寬（例如 PCIe 4.0 x16 理論值約 32 GB/s 單向）遠低於 GPU 內部 HBM 頻寬（可達數 TB/s），一旦演算法需要頻繁往返搬資料，PCIe 就會成為硬性天花板。AMD 平台上，GPU 與 GPU 之間、或某些 APU/加速卡的 CPU-GPU 互連則走 Infinity Fabric，頻寬顯著高於 PCIe，這也是多 GPU 訓練/推論拓樸設計時要優先考慮的差異。\n\n量測上，AMD 生態可用 `rocprof`／ROCm SMI（`rocm-smi`）觀察 PCIe/Infinity Fabric 的實際傳輸位元組數與匯流排使用率，NVIDIA 端則用 Nsight Systems／`nvprof`（或其後繼 Nsight Compute）看 H2D/D2H 時間軸與頻寬利用率。實務流程是：先量測理論頻寬上限，再量測實際達成頻寬，若兩者差距很大，通常代表傳輸未重疊、用了未 pin 的記憶體，或搬移的資料量本身就超過計算所需（例如搬了整個陣列卻只用到其中一部分）。只有先確認瓶頸落在傳輸還是計算，才知道該優化 kernel 邏輯，還是該優化資料搬移策略。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `// Conceptual sketch (error checking omitted): pinned memory + multiple streams overlapping transfer and compute. [1]
// Must be compiled with hipcc (HIP); the CUDA version's API shape maps almost
// one-to-one (swap the hip -> cuda prefix).
#include <cstddef>
#include <vector>

// __global__ void scale_kernel(float* data, float k, int n); // device-side
// kernel declaration

constexpr int kChunks = 4;

void overlapped_pipeline(std::size_t totalElems) {
    std::size_t chunkElems = totalElems / kChunks;
    std::size_t chunkBytes = chunkElems * sizeof(float);

    float* h_pinned = nullptr;
    // hipHostMalloc(&h_pinned, totalElems * sizeof(float));      // [2] pinned
    // host memory
    float* d_buf = nullptr;
    // hipMalloc(&d_buf, totalElems * sizeof(float));              // device
    // memory

    // hipStream_t streams[kChunks];
    // for (int i = 0; i < kChunks; ++i) {
    //     hipStreamCreate(&streams[i]);                           // [3]
    //     one stream per chunk
    // }

    for (int i = 0; i < kChunks; ++i) {
        std::size_t offset = static_cast<std::size_t>(i) * chunkElems;
        // hipMemcpyAsync(d_buf + offset, h_pinned + offset, chunkBytes,
        //                 hipMemcpyHostToDevice, streams[i]);     // [4] async
        //                 H2D for chunk i
        // hipLaunchKernelGGL(scale_kernel,
        //                     dim3((chunkElems + 255) / 256), dim3(256),
        //                     0, streams[i],
        //                     d_buf + offset, 2.0f,
        //                     static_cast<int>(chunkElems));      // [5] compute
        //                     for chunk i overlaps with the transfer for chunk i+1
        // hipMemcpyAsync(h_pinned + offset, d_buf + offset, chunkBytes,
        //                 hipMemcpyDeviceToHost, streams[i]);
    }

    // for (int i = 0; i < kChunks; ++i) {
    //     hipStreamSynchronize(streams[i]);                       // [6]
    //     sync point: wait for all chunks to finish hipStreamDestroy(streams[i]);
    // }
    // hipFree(d_buf);
    // hipHostFree(h_pinned);
}`,
    callouts: [
      {
        n: 1,
        text: '真正的 HIP/CUDA 程式需以 hipcc/nvcc 編譯；此處以註解示意多 stream 重疊的資料流與呼叫形狀。',
      },
      {
        n: 2,
        text: 'hipHostMalloc 配置 pinned（page-locked）記憶體，是達成「真正非同步」DMA 傳輸的前提；一般 malloc 的可分頁記憶體會讓 async 複製悄悄退化為同步。',
      },
      { n: 3, text: '每個資料區塊配一條獨立 stream，讓不同區塊的傳輸與計算可在硬體上並行排程。' },
      { n: 4, text: 'hipMemcpyAsync 把 H2D 傳輸排入對應 stream 後立即返回，不阻塞 host。' },
      {
        n: 5,
        text: '核心啟動同樣非同步：因為排在同一 stream，會等該 stream 的複製完成才執行；不同 stream 之間則可並行，形成傳輸與計算的重疊（pipelining）。',
      },
      {
        n: 6,
        text: 'hipStreamSynchronize 是明確的同步點，用來確保所有區塊都完成後才讀取結果；同步點應盡量集中在最後，而非每個區塊後都呼叫。',
      },
    ],
  },
  pitfalls: [
    '把統一記憶體（unified/managed memory）當成免費午餐，用在延遲敏感的熱路徑 kernel 上，結果 host/device 交替存取觸發大量 page migration，效能斷崖式下滑卻難以從原始碼看出原因。',
    '誤以為對一般 `malloc` 配置的可分頁記憶體呼叫 `hipMemcpyAsync` 就能非同步，實際上驅動會先做一次同步的內部複製到暫存 pinned buffer，隱性退化為同步傳輸。',
    '為求「程式碼簡單」發射大量極小 kernel，而非批次化或融合，導致總執行時間被 launch overhead 主宰而非真正計算時間。',
    '所有 stream 共用一個同步點、或每個區塊傳輸完就立刻同步等待，扼殺了原本可以重疊的傳輸與計算。',
    '只看 kernel 執行時間就判斷「GPU 太慢」，未量測 PCIe/Infinity Fabric 實際頻寬利用率，誤把資料搬移瓶頸診斷成算力不足。',
  ],
  bestPractices: [
    '延遲敏感、存取模式明確的熱路徑優先手動配置 device 記憶體並顯式搬移；統一記憶體留給原型開發或存取模式不規則的資料結構。',
    '需要非同步傳輸時務必用 `hipHostMalloc`／`cudaHostAlloc` 配置的 pinned host 記憶體，且節制用量避免壓縮系統可用分頁記憶體。',
    '用多條 stream/queue 搭配雙緩衝，讓資料傳輸與 kernel 計算重疊；同步點盡量集中收斂在管線末端。',
    '避免大量極小 kernel；優先批次化、融合，或用 HIP Graph／CUDA Graph 錄製重播以攤提 launch 排隊開銷。',
    '用 `rocprof`／`rocm-smi`（AMD）或 Nsight Systems（NVIDIA）量測實際 PCIe/Infinity Fabric 傳輸位元組數與頻寬利用率，先確認瓶頸在傳輸還是計算，再決定優化方向。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '為什麼統一記憶體（unified/managed memory）可能在「程式邏輯正確」的情況下仍造成隱性效能懸崖？',
      options: [
        { id: 'a', text: '因為它會在編譯期報錯，開發者被迫改寫程式' },
        {
          id: 'b',
          text: '因為 host/device 交替存取同一塊記憶體時會觸發 page fault 與 page migration，延遲不會顯示在原始碼裡，只在剖析工具的底層計數器才看得到',
        },
        { id: 'c', text: '因為統一記憶體只能配置在 host 上，device 完全無法存取' },
        { id: 'd', text: '因為統一記憶體會強制所有 kernel 序列化執行' },
      ],
      correctOptionId: 'b',
      explanation:
        '統一記憶體把資料搬移隱藏在底層：存取模式在 host/device 間頻繁乒乓時會觸發大量 page migration，效能可能比手動管理記憶體差一個數量級，而這個成本不會出現在原始碼中，需要用 page fault／migration 計數器才能診斷。',
    },
    {
      id: 'q2',
      stem: '為什麼 pinned（page-locked）host 記憶體是達成「真正非同步」DMA 傳輸的前提？',
      options: [
        { id: 'a', text: '因為 pinned 記憶體比一般記憶體容量更大' },
        {
          id: 'b',
          text: 'DMA 引擎要求傳輸期間來源位址固定不動；可分頁記憶體隨時可能被作業系統搬動或換頁，因此驅動需先同步複製到暫存 pinned buffer，讓 async 複製退化為同步',
        },
        { id: 'c', text: '因為只有 pinned 記憶體才能被 kernel 讀取' },
        { id: 'd', text: '因為 pinned 記憶體會自動壓縮資料以加速傳輸' },
      ],
      correctOptionId: 'b',
      explanation:
        'DMA 傳輸需要固定不動的實體位址；`hipHostMalloc`／`cudaHostAlloc` 配置的 pinned 記憶體滿足此要求，才能讓 `hipMemcpyAsync` 真正非阻塞，並搭配多 stream 達成傳輸與計算重疊。',
    },
    {
      id: 'q3',
      stem: '判斷一個 GPU 應用程式的瓶頸究竟是計算還是資料搬移，較合理的做法是什麼？',
      options: [
        { id: 'a', text: '只看 kernel 執行時間，時間長就代表演算法本身太慢' },
        {
          id: 'b',
          text: '用 rocprof/rocm-smi（AMD）或 Nsight Systems（NVIDIA）量測實際 PCIe/Infinity Fabric 傳輸位元組數與頻寬利用率，與理論頻寬上限比較',
        },
        { id: 'c', text: '增加 kernel 的執行緒數量直到不再變快為止' },
        { id: 'd', text: '把所有記憶體都換成統一記憶體，觀察是否變快' },
      ],
      correctOptionId: 'b',
      explanation:
        '資料搬移常是真正瓶頸，需用剖析工具實際量測 PCIe（host-device）與 AMD Infinity Fabric（GPU 間/CPU-GPU 高頻寬互連）的傳輸量與頻寬利用率，與理論上限對照，才能判斷該優化計算還是傳輸策略。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['Host（pinned 緩衝）', '多 Stream 非同步搬移', 'Kernel 執行（重疊）', 'Device'],
    caption:
      'host 以 pinned memory 透過多條 stream 非同步搬移資料，各區塊的傳輸與 kernel 計算在不同 stream 上重疊執行，最後於同步點會合取回結果。',
  },
  tryIt: {
    code: `// The GPU version must be compiled with hipcc/nvcc. The following uses
// std::async/std::future to simulate the mental model of "multiple streams
// overlapping transfer and compute", runnable on an ordinary compiler.
#include <chrono>
#include <future>
#include <iostream>
#include <thread>
#include <vector>

int main() {
    constexpr int kChunks = 4;
    std::vector<std::future<int>> streams;

    // Analogy: each chunk's "async transfer + compute" is queued independently.
    for (int i = 0; i < kChunks; ++i) {
        streams.push_back(std::async(std::launch::async, [i] {
            // Simulate async H2D transfer latency
            std::this_thread::sleep_for(std::chrono::milliseconds(10));
            // Simulate kernel compute
            std::this_thread::sleep_for(std::chrono::milliseconds(20));
            return i * 100;  // pretend this is the result computed for this chunk
        }));
    }

    std::cout << "host continues running while per-chunk GPU work is in flight...\\n";

    // Sync points are consolidated at the end, letting all chunks' transfer and compute overlap.
    for (int i = 0; i < kChunks; ++i) {
        std::cout << "chunk " << i << " result = " << streams[i].get() << '\\n';
    }
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'HIP Programming Guide (AMD ROCm)',
      href: 'https://rocm.docs.amd.com/projects/HIP/en/latest/',
      description:
        'HIP 的 host/device 模型、記憶體管理、stream 與非同步 API 的官方說明，本章 API 主要依此撰寫。',
    },
    {
      title: 'CUDA C++ Programming Guide — Asynchronous Concurrent Execution',
      href: 'https://docs.nvidia.com/cuda/cuda-c-programming-guide/index.html#asynchronous-concurrent-execution',
      description: 'CUDA 對應的 stream、事件與非同步傳輸/計算重疊機制，可與 HIP 對照閱讀。',
    },
    {
      title: 'ROCm System Management Interface (rocm-smi) 與 rocprof',
      href: 'https://rocm.docs.amd.com/projects/rocprofiler/en/latest/',
      description: '量測 PCIe/Infinity Fabric 傳輸流量與 kernel 時間軸的 AMD 官方剖析工具文件。',
    },
    {
      title: 'NVIDIA Nsight Systems',
      href: 'https://docs.nvidia.com/nsight-systems/',
      description:
        '對照用：量測 H2D/D2H 頻寬利用率、stream 時間軸與 kernel launch 開銷的 NVIDIA 剖析工具。',
    },
  ],
};

export default ind27OffloadingDataMovement;
