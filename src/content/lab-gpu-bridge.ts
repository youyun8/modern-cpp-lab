import type { ChapterContent } from '@/types/ChapterContent';

const labGpuBridge: ChapterContent = {
  slug: 'lab-gpu-bridge',
  title: '平行化實驗室：CPU–GPU 橋接',
  group: '平行化實驗室',
  description:
    'CPU–GPU 並行橋接：std::thread 如何與非同步 CUDA/HIP 核心啟動互動、cudaStream_t 對比 std::future 的心智模型，以及 hipBLASLt / AITER 分派模式概觀。',
  concept: {
    standard: 'C++23',
    body:
      'GPU 程式設計的核心是非同步：核心啟動（kernel launch）與記憶體複製對 host 而言多是「發射即返回」，實際工作排入一條 stream（CUDA 的 cudaStream_t、HIP 的 hipStream_t）依序執行。這與 CPU 端的 std::async／std::future 有相似心智模型——都代表「稍後才會完成的工作」，但 stream 是明確、可重疊的工作佇列：同一 stream 內保序，不同 stream 可並行，並以事件（event）表達相依。host 端可用 std::thread 同時餵多條 stream 或做 CPU 前處理，再以 cudaStreamSynchronize／事件等待對應 std::future::get。實務函式庫如 hipBLASLt 提供可調參的 GEMM，AITER 等分派層則依形狀與硬體選擇最佳核心。要點：讓資料傳輸與計算重疊、避免不必要的同步點、並以 pinned memory 提升 H2D／D2H 頻寬。',
  },
  code: {
    lang: 'cpp',
    code: `// 概念示意（省略錯誤檢查）：以多條 stream 重疊傳輸與計算。 [1]
// 需以 nvcc（CUDA）或 hipcc（HIP）編譯，非一般 g++。
#include <vector>

// __global__ void scale(float* d, float k, int n); // GPU 核心宣告

void pipeline(float* h_in, float* d_buf, int n /*, cudaStream_t s */) {
  // cudaMemcpyAsync(d_buf, h_in, n*sizeof(float),
  //                 cudaMemcpyHostToDevice, s);        // [2] 非同步 H2D
  // scale<<<(n+255)/256, 256, 0, s>>>(d_buf, 2.0f, n); // [3] 發射即返回
  // cudaMemcpyAsync(h_in, d_buf, n*sizeof(float),
  //                 cudaMemcpyDeviceToHost, s);        // [4] 非同步 D2H
  // host 此時可繼續做別的事；稍後再同步。               [5]
}

// 心智模型：cudaStream 之於 GPU，類似 std::future 之於 CPU 非同步工作。
#include <future>
int cpuAnalog() {
  std::future<int> f = std::async(std::launch::async, [] { return 42; });
  return f.get(); // 對應 cudaStreamSynchronize：等待非同步工作完成
}`,
    callouts: [
      { n: 1, text: '真正的 GPU 程式需以 nvcc／hipcc 編譯；此處以註解示意非同步 stream 的資料流。' },
      { n: 2, text: 'cudaMemcpyAsync 把 H2D 傳輸排入 stream 後立即返回，不阻塞 host。' },
      { n: 3, text: '核心啟動 <<<...>>> 也是非同步的：把工作排入同一 stream，host 立刻取回控制權。' },
      { n: 4, text: '同一 stream 內操作保序，因此 D2H 會在核心完成後才執行，無需顯式同步。' },
      { n: 5, text: 'host 可在 GPU 工作進行時做其他事（或餵其他 stream），最後才以同步點等待結果。' },
    ],
  },
  deepDive: [
    {
      heading: '主機-裝置非同步模型',
      body:
        '核心啟動與 `cudaMemcpyAsync` 對 host 為非同步：排入 stream 後立即返回。同一 stream 內保序，不同 stream 可並行；預設 stream 有特殊的隱式同步語意，容易造成非預期的序列化。\n\npinned（page-locked）記憶體讓 H2D／D2H 傳輸可非同步且頻寬更高；用可分頁記憶體的 async 複製可能退化為同步。事件（event）用於跨 stream 表達相依與計時。',
    },
    {
      heading: '重疊與 pipelining',
      body:
        '要逼近硬體吞吐，需讓資料傳輸與計算重疊：使用多條 stream 搭配雙緩衝（double buffering），在計算前一批的同時傳輸下一批。PCIe／xGMI 傳輸頻寬常是真正的瓶頸，減少 H2D／D2H 往返與提高佔用率（occupancy）同等重要。\n\nhost 端可用 `std::thread` 餵不同 stream 或做前處理，但需注意 CPU 執行緒與 GPU stream 之間的同步。',
    },
    {
      heading: '分派層與函式庫',
      body:
        'hipBLASLt／cuBLASLt 等提供可調參的 GEMM，並以啟發式（heuristic）依矩陣形狀與硬體選核心；AITER 等分派層進一步依 shape 選擇最佳實作，或做離線／線上 autotuning。\n\n實務上優先採用這些廠商／社群函式庫而非自寫核心，並以 Nsight Systems／rocprof 剖析，找出傳輸、同步或核心佔用的瓶頸。',
    },
  ],
  pitfalls: [
    '所有操作都排到預設 stream，因其隱式同步而意外序列化。',
    '以可分頁（未 pin）記憶體做 async 複製，退化為同步且頻寬低落。',
    '每個操作後都同步 host，扼殺傳輸與計算的重疊。',
    'CPU 執行緒與 GPU stream 之間缺乏同步，讀到未完成的結果。',
  ],
  bestPractices: [
    '使用多條 stream + pinned memory + 雙緩衝重疊傳輸與計算。',
    '盡量減少同步點與 H2D／D2H 往返，PCIe 傳輸常是瓶頸。',
    '採用 hipBLASLt／cuBLASLt 等函式庫與其 autotuning，勿自寫核心。',
    '以 Nsight Systems／rocprof 剖析，定位傳輸、同步與佔用瓶頸。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '對 host 而言，CUDA/HIP 的核心啟動（kernel launch）通常是什麼行為？',
      options: [
        { id: 'a', text: '同步阻塞，直到 GPU 完成才返回' },
        { id: 'b', text: '非同步：把工作排入 stream 後立即返回，host 可繼續執行' },
        { id: 'c', text: '一定會建立一個新的 CPU 執行緒' },
        { id: 'd', text: '只能在單一 stream 上執行' },
      ],
      correctOptionId: 'b',
      explanation:
        '核心啟動與 async 記憶體複製多為非同步：排入 stream 後 host 立即返回，實際計算稍後在 GPU 進行。參見 CPU–GPU 橋接單元。',
    },
    {
      id: 'q2',
      stem: '把 cudaStream_t 類比為 CPU 端的哪個抽象最貼切？',
      options: [
        { id: 'a', text: 'std::mutex' },
        { id: 'b', text: '代表「稍後完成的工作」的 std::future／非同步佇列，並以同步點等待' },
        { id: 'c', text: 'std::vector' },
        { id: 'd', text: 'const 參考' },
      ],
      correctOptionId: 'b',
      explanation:
        'stream 是有序、可重疊的非同步工作佇列，心智模型近似 std::future；cudaStreamSynchronize 對應 future.get()。參見 CPU–GPU 橋接單元。',
    },
    {
      id: 'q3',
      stem: '要讓資料傳輸與 GPU 計算重疊以提升吞吐，常見做法是什麼？',
      options: [
        { id: 'a', text: '每個操作後都立即同步' },
        { id: 'b', text: '使用多條 stream 與非同步複製，並以 pinned memory 提升傳輸頻寬' },
        { id: 'c', text: '只用單一 stream 並頻繁呼叫 synchronize' },
        { id: 'd', text: '把所有資料一次搬到 GPU 後才開始' },
      ],
      correctOptionId: 'b',
      explanation:
        '多 stream 讓傳輸與計算重疊，pinned（page-locked）記憶體提升 H2D／D2H 頻寬，並應避免不必要的同步點。參見 CPU–GPU 橋接單元。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['host', 'launch', 'stream', 'sync'],
    caption:
      'CPU–GPU 非同步橋接：host 發射核心與傳輸到 stream（發射即返回），工作在 GPU 排隊執行，最後於同步點會合。',
  },
  tryIt: {
    code: `// GPU 需以 nvcc/hipcc 編譯。以下用 std::async/std::future 展示
// 對應的「非同步、稍後同步」心智模型，可在一般編譯器執行。
#include <chrono>
#include <future>
#include <iostream>
#include <thread>

int main() {
  // 類比：把「核心」排入非同步佇列，host 立即返回。
  auto stream = std::async(std::launch::async, [] {
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
    return 21 * 2; // 假裝這是 GPU 算出的結果
  });

  std::cout << "host 在 GPU 工作時繼續做別的事...\\n";
  int result = stream.get(); // 對應 cudaStreamSynchronize
  std::cout << "GPU 結果 = " << result << '\\n';
  return 0;
}`,
  },
  furtherReading: [
    {
      title: 'CUDA C++ Programming Guide — Streams',
      href: 'https://docs.nvidia.com/cuda/cuda-c-programming-guide/index.html#asynchronous-concurrent-execution',
      description: '非同步執行、stream 與事件的官方說明。',
    },
    {
      title: 'HIP Programming Guide (AMD ROCm)',
      href: 'https://rocm.docs.amd.com/projects/HIP/en/latest/',
      description: 'HIP 的 stream、記憶體與核心啟動模型，對應 CUDA 概念。',
    },
    {
      title: 'std::future - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/thread/future',
      description: 'CPU 端非同步結果的取得與同步，作為 stream 的心智類比。',
    },
  ],
};

export default labGpuBridge;
