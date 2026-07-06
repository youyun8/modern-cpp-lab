import { createStub } from './_stub';

// TODO: 補充 std::thread 與 CUDA/HIP 核心啟動、cudaStream_t 對 std::future 心智模型，
// 以及 hipBLASLt / AITER 分派模式的完整內容。
export default createStub({
  slug: 'lab-gpu-bridge',
  title: '平行化實驗室：CPU–GPU 橋接',
  group: '平行化實驗室',
  description:
    'CPU–GPU 並行橋接：std::thread 如何與非同步 CUDA/HIP 核心啟動互動、cudaStream_t 對比 std::future 的心智模型，以及 hipBLASLt / AITER 分派模式概觀。',
  topic: 'CPU–GPU 並行橋接與非同步核心啟動',
  standard: 'C++23',
  diagramNodes: ['host', 'launch', 'stream', 'sync'],
});
