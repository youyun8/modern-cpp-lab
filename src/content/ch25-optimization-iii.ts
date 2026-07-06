import { createStub } from './_stub';

// TODO: 補充編譯器旗標（-O3/-march/PGO/LTO）、profiling 與 benchmarking 方法論的完整內容。
export default createStub({
  slug: 'ch25-optimization-iii',
  chapterLabel: 'Ch.25',
  title: '最佳化 III：編譯器旗標與剖析',
  group: 'F · 效能最佳化',
  description:
    '編譯器旗標（-O3 / -march / PGO / LTO）、profiling 工具與平行擴充性、benchmarking 方法論。',
  topic: '編譯器旗標、profiling 與擴充性',
  standard: 'C++23',
  diagramKey: 'amdahl-curve',
  diagramCaption:
    'Amdahl 定律加速曲線：拖動滑桿調整可平行化比例 p，SVG 會即時重繪加速比對處理器數量的曲線。',
});
