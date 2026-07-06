import type { ChapterContent } from '@/types/ChapterContent';

const ind14ParallelStl: ChapterContent = {
  slug: 'ind14-parallel-stl',
  chapterLabel: '第 14 章',
  title: '平行 STL 演算法（C++17）',
  group: 'L · 第四部：高階平行抽象',
  description: 'execution policy：seq／par／par_unseq／unseq（C++20），可平行化演算法與在 GPU 上執行 std::par 的現況。',
  concept: {
    standard: 'C++20',
    body:
      'C++17 為標準演算法加入執行策略參數，C++20 補齊 `unseq` 並讓 `par_unseq` 的向量化安全語意定案，C++20/23 的 ranges 演算法也開始與其接軌。工業場景真正的難題不是記住四個策略名稱，而是理解每種策略對「傳入的可呼叫物件」施加了哪些硬性限制——尤其 `par_unseq` 要求函式體對向量化安全（vectorization-safe），違反者是未定義行為而非效能問題。本章聚焦於這些限制、ranges 的現況落差，以及把 `std::par` 實際跑上 GPU（nvc++ stdpar、AMD roc-stdpar）所需的編譯器與記憶體條件。',
  },
  deepDive: [
    {
      heading: '四種策略的真正差異：不是「多快」而是「能做什麼」',
      body:
        '`std::execution::seq`：單執行緒、依序求值，元素函式可自由使用鎖、配置記憶體、拋出例外——與一般循序程式碼無異。\n\n`std::execution::par`：允許多執行緒平行呼叫元素函式，但每次呼叫仍是「不可分割」地完整執行；元素函式之間不得有資料競爭，但函式內部仍可短暫上鎖或配置記憶體（只要不跨執行緒共享未受保護的狀態）。\n\n`std::execution::unseq`（C++20）：允許在單一執行緒內把多次呼叫交錯（interleave）成 SIMD 向量指令，例如一次呼叫的部分指令與下一次呼叫的部分指令混在同一組向量暫存器操作中執行。這代表函式內部「不能」有跨呼叫無法安全交錯的操作。\n\n`std::execution::par_unseq`：同時具備 `par` 的跨執行緒平行與 `unseq` 的單執行緒向量交錯，因此同時繼承兩者的限制，且限制取聯集後更嚴格——這是四者中限制最多、但潛在效能天花板最高的策略。',
    },
    {
      heading: 'par_unseq 的向量化安全契約：不可鎖、不可配置、不可拋、不可依序',
      body:
        '`par_unseq`（以及 `unseq`）要求傳入的可呼叫物件必須是向量化安全（vectorization-safe），具體禁止事項：\n\n不可取得鎖（`std::mutex::lock`、自旋鎖等）——因為同一硬體執行緒可能被要求「交錯」處理多個元素，若其中一次呼叫還未釋放鎖就被交錯進另一次呼叫，會直接死鎖，且標準明訂此情境為未定義行為。\n\n不可配置或釋放記憶體（`new`／`malloc`／容器成長）——記憶體配置器內部常有鎖或全域狀態，在向量化交錯下同樣不安全，且配置延遲會抵銷向量化的效能收益。\n\n不可讓例外逃逸出元素函式——`par_unseq` 底下若例外傳播出演算法呼叫，行為與 `par`／`unseq` 相同：程式呼叫 `std::terminate`，而非把例外傳給呼叫端；因此可能拋例外的操作必須在函式內部完整 `try/catch` 處理。\n\n不可依賴元素間的執行順序或跨元素的可變共享狀態——包含用非原子變數做跨元素累加、以疊代順序寫入共享緩衝區等。\n\n違反上述任何一條都不是「跑比較慢」而是未定義行為：可能表現為死鎖、資料損毀，或在不同編譯器／向量寬度下產生不一致結果，且往往只在特定 SIMD 寬度或執行緒數下才會現形，難以在小規模測試中發現。',
    },
    {
      heading: 'Ranges 與執行策略：C++20/23 的現況落差',
      body:
        'C++20 引入 `std::ranges` 演算法家族（`std::ranges::sort`、`std::ranges::transform` 等），提供 projection、sentinel、range adaptor 等更現代的介面。然而截至 C++23，多數 `std::ranges::*` 演算法「尚未」接受執行策略參數——`std::ranges::for_each` 等仍是純循序介面，平行版本目前仍需透過傳統 `std::for_each(std::execution::par, ...)` 搭配迭代器範圍取得。\n\n委員會內部持續有提案（概念上類似 P2408、P2500 一系列討論）在探討如何讓 ranges 演算法與執行策略、乃至與 sender/receiver（`std::execution` 提案，注意此 `std::execution` 命名空間與 C++17 執行策略的 `std::execution` 同名但語意不同）整合，但實際落地時程與確切介面在不同標準版本間仍在演變，讀者應以當時採用的編譯器與標準庫版本的實作狀態為準，不宜假設目前已有穩定的「ranges + 執行策略」統一介面。\n\n實務上要平行化基於 range 的程式碼，目前多半仍需退回到迭代器版本的平行演算法，或使用第三方函式庫（如 Intel oneTBB 的 range-based 平行結構）補足。',
    },
    {
      heading: '把 std::par 跑上 GPU：nvc++ stdpar 與 roc-stdpar 的現況',
      body:
        'NVIDIA 的 nvc++（NVIDIA HPC SDK 的一部分）提供 `-stdpar=gpu` 編譯選項，把 `std::execution::par`（以及某些情況下 `par_unseq`）標記的標準演算法直接編譯成在 NVIDIA GPU 上執行的 kernel，而不需改寫成 CUDA 或 Thrust 呼叫。其運作前提相當嚴格：所有被平行演算法觸及的記憶體必須來自可被 GPU 存取的配置（實務上倚賴 CUDA Unified/Managed Memory，例如標準容器搭配特殊配置器，或整個程式以 `-stdpar=gpu` 編譯讓執行期自動用受管理記憶體置換預設的堆積配置），否則會退回主機執行或直接執行失敗；且只有一部分標準演算法與其呼叫模式受支援，函式物件內部不能有前述向量化不安全的操作，也通常不支援例外、虛擬函式呼叫或遞迴等在裝置端難以生成的結構。\n\nAMD 陣營對應的努力常統稱為 roc-stdpar（建立在 ROCm 工具鏈與 LLVM 之上），目標是讓 `std::par` 風格的程式碼透過 ROCm 編譯流程offload 到 AMD GPU，理念與 nvc++ stdpar 相近：一樣仰賴統一定址的記憶體模型、一樣只涵蓋演算法清單的子集、一樣需要專門的編譯旗標與工具鏈版本搭配。相較 nvc++，roc-stdpar 相關生態成熟度與涵蓋範圍仍在快速演進中，導入前務必以當下 ROCm 版本的官方文件與 release note 為準，不能假設功能矩陣與 NVIDIA 端一致。\n\n對兩者共同的實務建議：把 `std::par` 平行演算法視為「可能被 offload 到 GPU 的可攜寫法」而非保證平行，一定要在目標硬體與工具鏈上實測效能與正確性，並準備好在不支援的環境退回純 CPU 多執行緒路徑。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <algorithm>
#include <execution>  // [1]
#include <numeric>
#include <vector>

// Sum of squares via transform_reduce; safe under par_unseq because the
// lambda touches only its own by-value argument and does pure arithmetic.
double sumOfSquares(const std::vector<double>& data) {
    return std::transform_reduce(std::execution::par_unseq,  // [2]
                                 data.begin(), data.end(), 0.0, std::plus<>{}, [](double x) {
                                     return x * x;
                                 });  // [3] pure, no shared state, no throw
}

void scaleInPlace(std::vector<double>& data, double factor) {
    std::for_each(std::execution::par_unseq, data.begin(), data.end(),
                  [factor](double& x) { x *= factor; });  // [4] pure elementwise update
}

// UNSAFE-FOR-par_unseq EXAMPLE (do not do this):
//   std::mutex log_mutex;
//   std::for_each(std::execution::par_unseq, data.begin(), data.end(),
//                 [&](double& x) {
//                     std::lock_guard<std::mutex> lock(log_mutex);  // [5] locking
//                     x = std::sqrt(x);                              // may deadlock:
//                 });                                                // interleaved
//                                                                     // calls can be
//                                                                     // issued on one
//                                                                     // thread under
//                                                                     // unseq.
// The same lambda would also be unsafe if it allocated memory (e.g. pushed
// into a std::vector) or let an exception escape (e.g. data.at() out of
// range without a try/catch): both call std::terminate or corrupt state
// instead of merely running slower. [6]`,
    callouts: [
      { n: 1, text: '<execution> 標頭提供 seq／par／unseq／par_unseq 四種策略標籤。' },
      { n: 2, text: 'par_unseq 同時要求可跨執行緒平行、也可在單一執行緒內向量化交錯。' },
      { n: 3, text: '轉換函式為純函式（無副作用、不共享狀態），滿足向量化安全的前提。' },
      { n: 4, text: '以值捕獲純量、只寫回自身元素，符合 par_unseq 對「無跨元素相依」的要求。' },
      { n: 5, text: '在 par_unseq 下取得鎖是明確禁止的行為：交錯執行可能讓同一執行緒重入未釋放的鎖。' },
      { n: 6, text: '配置記憶體或讓例外逃逸同樣違反向量化安全契約，結果是未定義行為或 std::terminate，而非單純變慢。' },
    ],
  },
  pitfalls: [
    '在 `par_unseq`／`unseq` 的元素函式中取得鎖，導致同一執行緒因交錯呼叫而死鎖。',
    '在平行演算法的可呼叫物件中配置或釋放記憶體，因配置器內部狀態而引發未定義行為或效能反噬。',
    '讓例外從元素函式逃逸；任何執行策略下未捕捉的例外都會呼叫 `std::terminate`，而非傳回呼叫端。',
    '假設 `std::par` 對小型或記憶體頻寬受限的資料一定更快，忽略排程與同步開銷。',
    '未安裝支援平行後端的標準庫（如缺少 TBB）或未使用 `-stdpar=gpu` 等專用旗標，就假設 `std::par` 會自動用上多核甚至 GPU。',
  ],
  bestPractices: [
    '把 `par_unseq` 的元素函式當成「必須是純函式」來設計：無鎖、無配置、無例外逃逸、不依賴呼叫順序。',
    '無法保證向量化安全時，先用 `par` 而非 `par_unseq`，用效能量測決定是否值得承擔更嚴格的限制。',
    '若目標是 ranges 風格程式碼但仍需平行，先確認所用標準庫版本的 `std::ranges` 演算法是否已支援執行策略，未支援時退回迭代器版介面。',
    '評估 GPU offload（nvc++ `-stdpar=gpu`、roc-stdpar）前，先確認記憶體來源相容統一定址、演算法在支援清單內，並以官方文件核對工具鏈版本。',
    '一律以循序版本作為效能與正確性基準，量化平行化與 GPU offload 的實際增益，而非假設理論最佳情境。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '在 `std::execution::par_unseq` 策略下，元素函式為何不能取得鎖（如 `std::mutex::lock`）？',
      options: [
        { id: 'a', text: '因為鎖的實作在所有平台都不存在' },
        { id: 'b', text: '因為向量化交錯可能讓同一執行緒在釋放鎖前重入，造成死鎖，且標準明訂此為未定義行為' },
        { id: 'c', text: '因為鎖只能在 GPU 上使用' },
        { id: 'd', text: '因為 par_unseq 只允許唯讀存取' },
      ],
      correctOptionId: 'b',
      explanation: 'par_unseq 允許把多次元素呼叫在同一執行緒內交錯執行，若其中一次呼叫尚未釋放鎖就被交錯進另一次呼叫，會直接死鎖；標準將此情境定義為未定義行為，而非僅是效能問題。',
    },
    {
      id: 'q2',
      stem: '截至 C++23，`std::ranges::for_each` 等 ranges 演算法與執行策略（`std::execution::par` 等）的關係為何？',
      options: [
        { id: 'a', text: '所有 ranges 演算法都已原生支援執行策略參數' },
        { id: 'b', text: '多數 ranges 演算法尚未接受執行策略參數，平行化仍多倚賴傳統迭代器版介面' },
        { id: 'c', text: 'ranges 演算法完全禁止平行執行' },
        { id: 'd', text: 'ranges 演算法只能在 GPU 上平行執行' },
      ],
      correctOptionId: 'b',
      explanation: '截至 C++23，多數 std::ranges 演算法仍是純循序介面，尚未整合執行策略；相關整合方向仍有委員會提案在演進中，實務上要平行化通常仍需退回迭代器版本的演算法。',
    },
    {
      id: 'q3',
      stem: '把 `std::execution::par` 標記的演算法透過 NVIDIA nvc++ 的 `-stdpar=gpu` offload 到 GPU 執行時，最關鍵的前提條件是什麼？',
      options: [
        { id: 'a', text: '演算法必須使用 std::ranges 介面' },
        { id: 'b', text: '所有涉及的記憶體必須可被 GPU 存取，實務上倚賴統一／受管理記憶體模型' },
        { id: 'c', text: '元素函式必須拋出例外以觸發裝置端編譯' },
        { id: 'd', text: '必須先手動轉譯成 CUDA kernel' },
      ],
      correctOptionId: 'b',
      explanation: 'nvc++ 的 stdpar GPU offload 要求所有被平行演算法觸及的記憶體都能被 GPU 存取，實務上依賴 CUDA 統一／受管理記憶體，且只涵蓋部分演算法與呼叫模式；記憶體不相容時會退回主機執行或直接失敗。',
    },
  ],
  diagram: {
    key: 'execution-policies',
    caption: '切換分頁比較 seq／par／unseq／par_unseq 如何把 8 個元素分派到執行緒與向量通道——注意 unseq／par_unseq 允許的交錯正是禁止上鎖與例外逃逸的根本原因。',
  },
  tryIt: {
    code: `#include <algorithm>
#include <execution>
#include <iostream>
#include <numeric>
#include <vector>

int main() {
    std::vector<double> data(1'000'000, 2.0);

    // Safe for par_unseq: pure transform, associative/commutative reduce.
    double sumSquares = std::transform_reduce(std::execution::par_unseq, data.begin(), data.end(),
                                              0.0, std::plus<>{}, [](double x) { return x * x; });

    // Safe for par: independent in-place update per element.
    std::for_each(std::execution::par, data.begin(), data.end(), [](double& x) { x *= 0.5; });

    std::cout << "sumSquares = " << sumSquares << '\\n';
    std::cout << "data[0] = " << data.front() << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::execution policies - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/algorithm/execution_policy_tag_t',
      description: 'seq／par／unseq／par_unseq 策略標籤的正式定義與對元素函式的語意限制。',
    },
    {
      title: 'std::transform_reduce - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/algorithm/transform_reduce',
      description: '融合轉換與歸約的平行演算法，含各執行策略下的多載與複雜度說明。',
    },
    {
      title: 'NVIDIA HPC SDK - C++ Standard Parallelism (stdpar)',
      href: 'https://developer.nvidia.com/hpc-sdk',
      description: 'nvc++ 以 -stdpar=gpu 將 std::par 標記的演算法 offload 到 GPU 的官方說明入口。',
    },
    {
      title: 'ROCm Documentation',
      href: 'https://rocm.docs.amd.com/',
      description: 'AMD ROCm 工具鏈文件，涵蓋 roc-stdpar 一類標準平行化 GPU offload 效果的現況與限制。',
    },
  ],
};

export default ind14ParallelStl;
