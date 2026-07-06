import { createStub } from './_stub';

// TODO: 補充 co_await/co_yield/co_return、generator<T>、Task<T> 與 async I/O 的完整內容。
export default createStub({
  slug: 'lab-coroutines',
  title: '平行化實驗室：協程 Coroutines',
  group: '平行化實驗室',
  description:
    'C++20 協程：co_await、co_yield、co_return，generator<T> 與 Task<T> 模式，以及與非同步 I/O 的關係。',
  topic: 'C++20 協程與 generator/Task 模式',
  standard: 'C++20',
  diagramNodes: ['呼叫', 'co_await', '暫停', '恢復'],
});
