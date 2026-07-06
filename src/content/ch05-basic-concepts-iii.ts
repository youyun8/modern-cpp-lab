import type { ChapterContent } from '@/types/ChapterContent';

const ch05BasicConceptsIII: ChapterContent = {
  slug: 'ch05-basic-concepts-iii',
  chapterLabel: '第 5 章',
  title: '基本概念 III：浮點數',
  group: '第 1 部：基礎概念 Foundations',
  description:
    'IEEE 754 浮點數表示、ULP 與 NaN 等特殊值的行為，以及為何浮點相等比較幾乎總是錯誤的。',
  concept: {
    standard: 'C++23',
    body: '浮點數以 IEEE 754 格式儲存：一個符號位、若干指數位與尾數位（float 為 32 位、double 為 64 位）。它以有限位元近似實數，因此 0.1 + 0.2 不精確等於 0.3。相鄰兩個可表示浮點數之間的間距稱為一個 ULP（unit in the last place），數值越大 ULP 越大，故絕對誤差門檻並不可靠。特殊值包括 +0／-0、正負無限大，以及 NaN；NaN 與任何值（含自己）比較皆為 false，可用 std::isnan 偵測。比較浮點數應採相對誤差或 ULP 容忍度，而非直接用 ==。',
  },
  code: {
    lang: 'cpp',
    code: `#include <cmath>
#include <cstdint>
#include <limits>
#include <print>

// Comparing floats with relative + absolute error is far more reliable than ==. [1]
bool nearlyEqual(double a, double b, double eps = 1e-9) {
    double diff = std::fabs(a - b);
    double scale = std::fmax(std::fabs(a), std::fabs(b));
    return diff <= eps * std::fmax(1.0, scale);  // [2]
}

int main() {
    double x = 0.1 + 0.2;
    std::println("0.1+0.2 == 0.3 ? {}", x == 0.3);  // [3] almost always false
    std::println("nearlyEqual ? {}", nearlyEqual(x, 0.3));

    double nan = std::numeric_limits<double>::quiet_NaN();
    std::println("nan == nan ? {}", nan == nan);  // [4] always false
    std::println("isnan ? {}", std::isnan(nan));  // [5] correctly detected
    return 0;
}`,
    callouts: [
      { n: 1, text: '直接用 == 比較浮點數幾乎總是錯的；應以誤差門檻判斷「足夠接近」。' },
      { n: 2, text: '結合相對誤差（隨數值大小縮放）與絕對誤差（處理接近 0 的情況）較穩健。' },
      { n: 3, text: '0.1、0.2、0.3 都無法以二進位精確表示，累積誤差使等式不成立。' },
      { n: 4, text: 'NaN 與任何值比較皆為 false，包括與自己比較，這是 IEEE 754 的規定。' },
      {
        n: 5,
        text: '要判斷是否為 NaN 必須用 std::isnan，不能用 x == x 之外的直覺方法（雖然 x != x 也可）。',
      },
    ],
  },
  deepDive: [
    {
      heading: 'IEEE 754 佈局與特殊值的成本',
      body: '`float`（32 位）、`double`（64 位）以符號、指數與尾數編碼。除了 `±0`、`±inf`、`NaN`，還有次正規數（denormal／subnormal）用以在極小值附近保持精度，但在許多硬體上處理次正規數會有顯著的效能懸崖。\n\n延遲敏感的數值程式有時會啟用 flush-to-zero／denormals-are-zero 模式以避開此成本，但這會改變數值行為，需審慎評估。',
    },
    {
      heading: '誤差累積與穩健比較',
      body: '浮點加法不具結合律，天真地累加大量數值會累積誤差；`std::abs(a-b) < eps` 這種固定絕對門檻在數值很大時失效。實務上結合相對誤差與絕對誤差，或以 ULP 距離比較。\n\n災難性抵消（catastrophic cancellation，兩個相近大數相減）會放大相對誤差；大量求和可用 Kahan 或成對（pairwise）求和降低誤差。金融計算則常改用定點或十進位型別以避免二進位表示問題。',
    },
    {
      heading: '編譯器旗標如何改變浮點語意',
      body: '`-ffast-math`（含於 `-Ofast`）假設沒有 `NaN`／`inf`、允許重排與結合律，會使 `std::isnan` 檢查失效並改變結果，除非你完全理解否則不應開啟。\n\nFMA 收縮（`a*b+c` 融合為單一指令）由 `-ffp-contract` 控制，會影響最後一位精度與跨平台可重現性。要求位元級可重現時，需固定這些旗標並避免非決定性的平行歸約順序。',
    },
  ],
  pitfalls: [
    '以 `==` 比較浮點數，或以固定絕對誤差門檻比較大數值。',
    '天真地累加大量浮點值而不做 Kahan／成對求和，累積可觀誤差。',
    '在啟用 `-ffast-math` 的情況下仍以 `std::isnan` 偵測 NaN——該檢查會被最佳化掉。',
    '假設浮點加法／乘法符合結合律，導致平行歸約結果不可重現。',
  ],
  bestPractices: [
    '比較時結合相對與絕對誤差，或使用 ULP 距離。',
    '大量求和採 Kahan 或成對求和；金融計算改用定點／十進位型別。',
    '除非完全理解後果，否則避免 `-ffast-math`；以 `-ffp-contract` 控制 FMA。',
    '預設使用 `double`；以 `std::isfinite`／`std::isnan` 檢查特殊值。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '為什麼 0.1 + 0.2 == 0.3 在 C++ 中通常為 false？',
      options: [
        { id: 'a', text: '因為 C++ 的加法有 bug' },
        { id: 'b', text: '因為這些十進位小數無法用有限的二進位浮點精確表示，產生捨入誤差' },
        { id: 'c', text: '因為 0.3 被自動轉為整數' },
        { id: 'd', text: '因為浮點加法不符合交換律' },
      ],
      correctOptionId: 'b',
      explanation:
        '0.1、0.2、0.3 在二進位下都是無限循環，只能近似儲存，累積捨入誤差使等式不成立。參見 Ch.05 PDF 第 22 頁。',
    },
    {
      id: 'q2',
      stem: '關於 NaN（Not a Number），下列何者正確？',
      options: [
        { id: 'a', text: 'NaN 等於它自己' },
        { id: 'b', text: 'NaN 與任何值比較（包括自己）皆為 false，應以 std::isnan 偵測' },
        { id: 'c', text: 'NaN 一定等於 0' },
        { id: 'd', text: 'NaN 只會出現在整數運算' },
      ],
      correctOptionId: 'b',
      explanation:
        'IEEE 754 規定 NaN 的比較永遠為 false（除了 != 為 true），因此需用 std::isnan 判斷。參見 Ch.05 PDF 第 40 頁。',
    },
    {
      id: 'q3',
      stem: 'ULP（unit in the last place）描述的是什麼？',
      options: [
        { id: 'a', text: '浮點數的總位元數' },
        { id: 'b', text: '相鄰兩個可表示浮點數之間的間距，隨數值大小變化' },
        { id: 'c', text: 'CPU 的時脈週期' },
        { id: 'd', text: '固定為 1e-9 的絕對誤差' },
      ],
      correctOptionId: 'b',
      explanation:
        'ULP 是相鄰浮點值的間距；數值越大 ULP 越大，因此固定的絕對誤差門檻並不通用。參見 Ch.05 PDF 第 31 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['符號位', '指數', '尾數', '特殊值'],
    caption:
      'IEEE 754 浮點數的組成：符號位、指數與尾數共同編碼數值，並保留位元組合表示無限大與 NaN 等特殊值。',
  },
  tryIt: {
    code: `#include <cmath>
#include <iostream>
#include <limits>

int main() {
    double x = 0.1 + 0.2;
    std::cout.precision(17);
    std::cout << "0.1 + 0.2 = " << x << '\\n';
    std::cout << "(== 0.3) ? " << (x == 0.3) << '\\n';
    double nan = std::numeric_limits<double>::quiet_NaN();
    std::cout << "nan == nan ? " << (nan == nan) << '\\n';
    std::cout << "isnan ? " << std::isnan(nan) << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'What Every Computer Scientist Should Know About Floating-Point',
      href: 'https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html',
      description: 'Goldberg 的經典長文，深入 IEEE 754 與數值誤差。',
    },
    {
      title: 'std::numeric_limits - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/types/numeric_limits',
      description: '查詢 epsilon、infinity 與 quiet_NaN 等浮點特性。',
    },
    {
      title: 'Modern C++ Programming — Basic Concepts III (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/05.Basic_concepts_III.html',
      description: 'Busato 課程第 5 章 HTML 投影片，涵蓋浮點數原文。',
    },
  ],
};

export default ch05BasicConceptsIII;
