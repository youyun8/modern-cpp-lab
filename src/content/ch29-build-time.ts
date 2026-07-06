import { createStub } from './_stub';

// TODO: 補充 precompiled headers、unity build、ThinLTO 與 IWYU 的完整內容。
export default createStub({
  slug: 'ch29-build-time',
  chapterLabel: 'Ch.29',
  title: '建置時間最佳化',
  group: 'G · 軟體設計與工具',
  description: 'Precompiled headers、unity build、ThinLTO 與 include-what-you-use。',
  topic: 'precompiled headers、unity build、ThinLTO 與 IWYU',
  standard: 'C++23',
  diagramNodes: ['PCH', 'unity build', 'ThinLTO', 'IWYU'],
});
