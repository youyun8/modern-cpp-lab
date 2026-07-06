import { createStub } from './_stub';

// TODO: 補充 ABA 問題、hazard pointers、compare_exchange 與 MPSC 佇列的完整內容。
export default createStub({
  slug: 'lab-lock-free',
  title: '平行化實驗室：無鎖資料結構',
  group: '平行化實驗室',
  description:
    '無鎖資料結構：ABA 問題、hazard pointers、compare_exchange_weak 與 _strong 的差異，以及標註的 MPSC 佇列。',
  topic: 'ABA 問題、hazard pointers 與 compare_exchange',
  standard: 'C++20',
  diagramNodes: ['load', 'CAS', 'retry', 'commit'],
});
