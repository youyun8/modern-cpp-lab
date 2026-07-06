import { createStub } from './_stub';

// TODO: 補充算術/記憶體最佳化、快取利用、對齊、prefetch、分支預測與迴圈最佳化的完整內容。
export default createStub({
  slug: 'ch24-optimization-ii',
  chapterLabel: 'Ch.24',
  title: '最佳化 II：快取與分支預測',
  group: 'F · 效能最佳化',
  description:
    '算術與記憶體最佳化、快取利用、資料對齊、prefetch、分支預測與迴圈最佳化。',
  topic: '快取利用、對齊、prefetch、分支預測與迴圈最佳化',
  standard: 'C++23',
  diagramKey: 'cache-line',
  diagramCaption:
    '快取行視覺化：切換偽共享（false sharing）與填充（padding）兩種配置，觀察多核心寫入如何互相使快取失效。',
});
