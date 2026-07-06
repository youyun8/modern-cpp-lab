import { createStub } from './_stub';

// TODO: 補充 symbol visibility、LTO 與 template bloat 的完整內容。
export default createStub({
  slug: 'ch28-binary-size',
  chapterLabel: 'Ch.28',
  title: '二進位檔大小',
  group: 'G · 軟體設計與工具',
  description: 'symbol visibility、LTO 與樣板膨脹（template bloat）的控制。',
  topic: 'symbol visibility、LTO 與 template bloat',
  standard: 'C++23',
  diagramNodes: ['符號可見性', 'strip', 'LTO', 'template bloat'],
});
