import type { ChapterContent } from '@/types/ChapterContent';

const ch08UserDefinedLiterals: ChapterContent = {
  slug: 'ch08-user-defined-literals',
  chapterLabel: '第 8.1 章',
  title: '使用者自訂字面值 User-Defined Literals',
  group: '第 1 部：基礎概念 Foundations',
  description:
    'C++11 的 User-Defined Literals（UDL）讓你以 `42_km`、`"text"s` 這類語法為字面值附加單位與型別資訊，兼顧可讀性與型別安全。',
  concept: {
    standard: 'C++11',
    body: '使用者自訂字面值（User-Defined Literals，UDL）允許你定義形如 `operator""_suffix` 的函式，把後綴接在數字或字串字面值後面，例如 `90.0_deg`、`1024_KiB` 或 `"hello"s`。它的價值在於「把單位與型別編進字面值裡」：`5_km + 300_m` 可以在編譯期就得到正確且具型別的結果，避免把裸 `double` 到處傳遞而搞混單位。標準函式庫本身也大量使用 UDL，如 `<chrono>` 的 `10ms`、`std::string` 的 `"x"s`、`std::complex` 的 `3i`。自訂後綴必須以底線開頭（如 `_kg`），沒有底線的後綴保留給標準函式庫。',
  },
  deepDive: [
    {
      heading: '四種原始參數形式',
      body: '字面值運算子依接受的參數型別分為幾類。數值字面值最常用的是「熟型（cooked）」形式：整數用 `operator""_x(unsigned long long)`，浮點數用 `operator""_x(long double)`，編譯器會先把字面值解析成該型別再交給你。\n\n字元與字串字面值則使用 `operator""_x(char)` 或 `operator""_x(const char*, std::size_t)`；後者會拿到指標與長度，很適合建構 `std::string` 或 `std::string_view`。\n\n若你需要看到「原始字元序列」而非解析後的值（例如自訂大整數或編譯期進位轉換），可用「生型（raw）」形式 `operator""_x(const char*)`，或搭配可變參數樣板 `template<char...> operator""_x()` 在編譯期逐字處理。',
    },
    {
      heading: 'constexpr、型別安全與單位系統',
      body: '把字面值運算子宣告成 `constexpr`，就能在編譯期算出結果並用於常數運算式；這是實作零成本單位系統的關鍵。搭配強型別包裝（例如 `struct Meters { double value; };`）後，`1.5_m` 會回傳 `Meters`，讓「公尺加秒」在編譯期直接編不過。\n\n這種寫法在物理模擬、金融（貨幣單位）、圖形（角度／弧度）等領域特別有用：介面不再是一堆意義不明的 `double`，而是自我說明且無法誤用的具名量。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <iostream>

struct Distance {
    long double meters;
};

// 熟型浮點字面值運算子：字面值先被解析成 long double
constexpr Distance operator""_km(long double v) {   // [1]
    return Distance{v * 1000.0L};
}

constexpr Distance operator""_m(long double v) {     // [2]
    return Distance{v};
}

constexpr Distance operator+(Distance a, Distance b) {
    return Distance{a.meters + b.meters};
}

int main() {
    constexpr Distance d = 5.0_km + 300.0_m;          // [3]
    std::cout << d.meters << " m\\n";                   // 5300 m

    using namespace std::string_literals;
    auto s = "modern"s;                                // [4]
    std::cout << s + " C++\\n";
    return 0;
}`,
    callouts: [
      {
        n: 1,
        text: '自訂後綴必須以底線開頭；`_km` 把公里換算成公尺並回傳具型別的 `Distance`。',
      },
      {
        n: 2,
        text: '同一個型別可以有多個單位後綴，彼此可安全運算。',
      },
      {
        n: 3,
        text: '宣告為 `constexpr`，整個加總在編譯期完成，執行期零成本。',
      },
      {
        n: 4,
        text: '標準函式庫的 UDL：`"..."s` 直接產生 `std::string`（需引入對應的 `using namespace`）。',
      },
    ],
  },
  pitfalls: [
    '沒有底線的後綴（如 `operator""km`）屬於保留字，會觸發警告或未定義行為；自訂後綴一律以 `_` 開頭。',
    '整數與浮點字面值的參數型別固定為 `unsigned long long` 與 `long double`；`1_x` 不會呼叫接受 `long double` 的版本，反之亦然。',
    '標準函式庫的 UDL 藏在具名命名空間（如 `std::literals::chrono_literals`、`std::string_literals`），忘了 `using` 就找不到 `10ms` 或 `"x"s`。',
    '生型（raw）與可變參數樣板形式較難寫且較少用；除非要自行解析數字表示法，通常熟型就夠了。',
  ],
  bestPractices: [
    '用 UDL 為帶單位的量（時間、距離、資料大小、角度）建立型別安全介面，取代到處傳遞的裸數值。',
    '把字面值運算子宣告成 `constexpr`（甚至 `consteval`），讓單位換算在編譯期完成。',
    '將自訂 UDL 放進專屬的 inline 命名空間（例如 `units::literals`），讓使用者以 `using` 顯式選用，避免污染全域。',
    '優先採用標準函式庫既有的 UDL（`<chrono>`、`std::string`、`std::string_view`），語意清楚且可攜。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '關於整數與浮點的使用者自訂字面值，下列何者正確？',
      options: [
        {
          id: 'a',
          text: '熟型整數運算子的參數型別必須是 `unsigned long long`，浮點則為 `long double`',
        },
        { id: 'b', text: '自訂後綴可以省略開頭的底線，與標準庫寫法一致' },
        { id: 'c', text: '字面值運算子不能宣告為 `constexpr`' },
        { id: 'd', text: '字串字面值運算子只能接受單一 `char` 參數' },
      ],
      correctOptionId: 'a',
      explanation:
        '熟型數值 UDL 的參數型別固定：整數為 `unsigned long long`、浮點為 `long double`。自訂後綴必須以底線開頭，且可以是 `constexpr`；字串字面值可用 `(const char*, std::size_t)` 形式取得指標與長度。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['字面值 5.0_km', '呼叫 operator""_km', '回傳具型別 Distance', '編譯期單位安全'],
    caption: 'UDL 把單位與型別綁進字面值，讓量值運算在編譯期即具型別安全性。',
  },
  tryIt: {
    code: `#include <iostream>

constexpr unsigned long long operator""_KiB(unsigned long long n) {
    return n * 1024ULL;
}
constexpr unsigned long long operator""_MiB(unsigned long long n) {
    return n * 1024ULL * 1024ULL;
}

int main() {
    constexpr auto buffer = 4_MiB + 512_KiB;
    std::cout << buffer << " bytes\\n";
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'User-defined literals - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/user_literal',
      description: '字面值運算子的所有多載形式、生型／熟型與命名空間規則。',
    },
    {
      title: 'Standard library literals - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/symbol_index/literals',
      description: 'chrono、string、string_view、complex 等標準 UDL 的索引。',
    },
  ],
};

export default ch08UserDefinedLiterals;
