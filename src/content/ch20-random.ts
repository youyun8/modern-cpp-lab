import type { ChapterContent } from '@/types/ChapterContent';

const ch20Random: ChapterContent = {
  slug: 'ch20-random',
  chapterLabel: '第 20.1 章',
  title: '亂數程式庫 <random>',
  group: '第 4 部：STL 與工具庫',
  description:
    'C++11 的 `<random>` 以「引擎 + 分布」分離的設計取代 `rand()`，提供高品質、可設定種子且可重現的隨機數，特別適合模擬與平行數值運算。',
  concept: {
    standard: 'C++11',
    body: '傳統的 `rand()` / `srand()` 品質差、週期短、執行緒不安全，且 `rand() % n` 會造成分布偏斜，早已不該用於任何嚴肅場合。C++11 的 `<random>` 把隨機數拆成兩個正交的元件：「引擎（engine）」負責產生原始的隨機位元流（如 `std::mt19937`、`std::mt19937_64`），「分布（distribution）」負責把這些位元映射到你要的統計分布（如 `std::uniform_int_distribution`、`std::normal_distribution`）。要取得高品質種子則用 `std::random_device`。這種分離讓你能自由組合引擎與分布，明確控制種子以達成可重現性，並避開 `rand()` 的所有陷阱。',
  },
  deepDive: [
    {
      heading: '引擎、分布與種子的分工',
      body: '引擎是決定性的位元產生器：給定相同種子就產生相同序列，這正是可重現性的基礎。`std::mt19937`（32 位元 Mersenne Twister）是通用首選，品質與速度平衡良好；需要 64 位元時用 `std::mt19937_64`。\n\n分布把引擎的輸出轉成目標統計形狀，且同一種寫法在不同引擎上都成立。`std::uniform_int_distribution<int> d(1, 6)` 給出無偏的骰子點數，`std::normal_distribution<double> g(0.0, 1.0)` 給出常態分布，完全不需要自己做取模或縮放。\n\n`std::random_device` 提供非決定性的亂源，通常用來產生種子。但它可能很慢、在某些平台品質不佳，因此常見做法是「用 `random_device` 播一次種，之後由 `mt19937` 快速產生序列」。',
    },
    {
      heading: '可重現性與多執行緒',
      body: '在模擬、蒙地卡羅與機器學習中，「可重現」往往和「隨機」同等重要：出了問題要能用同一顆種子重跑。做法是把種子（以及引擎狀態）視為實驗的一部分明確記錄下來，除錯時固定種子，正式跑再改用 `random_device`。\n\n多執行緒下絕不能共用同一個引擎——那既是資料競爭也會破壞可重現性。正確做法是「每個執行緒一個獨立引擎」，並用不同但可記錄的種子（例如以 `thread_id` 或序號偏移）播種，讓每條執行緒的子序列彼此獨立又能各自重現。這與本手冊「效能可重現性」章節的紀律一脈相承。',
    },
    {
      heading: '常見陷阱與正確用法',
      body: '不要每次要用時就在函式內重建引擎——尤其別用當下時間反覆播種，那會讓連續呼叫拿到高度相關甚至相同的值。引擎應該建立一次、長期重複使用。\n\n也別再寫 `engine() % n`：這會引入模數偏斜（modulo bias），讓某些值出現機率偏高。永遠透過分布物件取值。分布物件本身很輕量，可視需要重建，但引擎要留存。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <iostream>
#include <random>

int main() {
    std::random_device rd;                              // [1]
    std::mt19937 engine(rd());                          // [2]

    std::uniform_int_distribution<int> dice(1, 6);      // [3]
    std::normal_distribution<double> gauss(0.0, 1.0);   // [4]

    for (int i = 0; i < 3; ++i)
        std::cout << dice(engine) << ' ';
    std::cout << '\\n';

    std::cout << gauss(engine) << '\\n';

    // 可重現：固定種子 -> 固定序列
    std::mt19937 fixed(42);                             // [5]
    std::uniform_int_distribution<int> d(0, 99);
    std::cout << d(fixed) << ' ' << d(fixed) << '\\n';   // 每次執行皆相同
    return 0;
}`,
    callouts: [
      {
        n: 1,
        text: '`std::random_device` 提供非決定性亂源，通常只用來產生種子（可能較慢）。',
      },
      {
        n: 2,
        text: '以 `rd()` 為 `mt19937` 引擎播種；引擎建立一次後長期重複使用。',
      },
      {
        n: 3,
        text: '整數均勻分布 `[1, 6]`，無模數偏斜，取代 `rand() % 6 + 1`。',
      },
      {
        n: 4,
        text: '常態分布（平均 0、標準差 1）；同一引擎可餵給多種分布。',
      },
      {
        n: 5,
        text: '固定種子 42 產生可重現序列，除錯與回歸測試不可或缺。',
      },
    ],
  },
  pitfalls: [
    '別再用 `rand()` / `srand()`：品質差、週期短、非執行緒安全，且 `rand() % n` 有模數偏斜。',
    '不要每次呼叫都重建引擎或用時間反覆播種，會導致連續取值高度相關甚至相同。',
    '多執行緒切勿共用同一引擎——既是資料競爭，也會破壞可重現性；應每執行緒一個獨立引擎。',
    '`std::random_device` 在部分平台可能很慢或品質不佳，適合播種而不適合當作高頻亂源。',
  ],
  bestPractices: [
    '採用「引擎 + 分布」組合：`mt19937` 搭配對應的 `*_distribution`，永遠透過分布取值。',
    '引擎建立一次、長期重用；分布物件輕量，可依需要建立。',
    '除錯與測試固定種子以確保可重現，並把種子記錄為實驗的一部分。',
    '多執行緒時為每條執行緒配置獨立引擎，用可記錄的不同種子播種。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '關於 `<random>` 的設計與用法，下列何者正確？',
      options: [
        { id: 'a', text: '引擎負責產生隨機位元，分布負責把位元映射成目標統計分布，兩者分離組合' },
        { id: 'b', text: '`engine() % n` 是取範圍內整數的建議做法' },
        { id: 'c', text: '多執行緒可以安全地共用同一個 `mt19937` 引擎' },
        { id: 'd', text: '`std::random_device` 保證是最快的高頻亂數來源' },
      ],
      correctOptionId: 'a',
      explanation:
        '`<random>` 刻意將「引擎」與「分布」分離以自由組合。取範圍值應透過分布避免模數偏斜；引擎不可跨執行緒共用；`random_device` 通常較慢，適合播種而非高頻取值。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['random_device 播種', 'mt19937 引擎', 'distribution 映射', '可重現的隨機序列'],
    caption: '「引擎 + 分布」的分離設計，讓隨機數兼具品質、彈性與可重現性。',
  },
  tryIt: {
    code: `#include <iostream>
#include <map>
#include <random>

int main() {
    std::mt19937 engine(12345);                // 固定種子以便觀察分布
    std::uniform_int_distribution<int> dice(1, 6);

    std::map<int, int> hist;
    for (int i = 0; i < 6000; ++i)
        ++hist[dice(engine)];

    for (auto [face, count] : hist)
        std::cout << face << ": " << count << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Pseudo-random number generation - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/numeric/random',
      description: '所有引擎、分布與 random_device 的完整參考。',
    },
    {
      title: 'std::mersenne_twister_engine - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/numeric/random/mersenne_twister_engine',
      description: 'mt19937 / mt19937_64 的參數、品質與週期說明。',
    },
  ],
};

export default ch20Random;
