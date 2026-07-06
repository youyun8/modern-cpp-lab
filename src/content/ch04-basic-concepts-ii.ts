import type { ChapterContent } from '@/types/ChapterContent';

const ch04BasicConceptsII: ChapterContent = {
  slug: 'ch04-basic-concepts-ii',
  chapterLabel: '第 4 章',
  title: '基本概念 II：整數型別',
  group: '第 1 部：基礎概念 Foundations',
  description:
    '整數型別、溢位與算術運算的細節與陷阱：有號與無號的差異、整數提升、隱式轉換與未定義行為。',
  concept: {
    standard: 'C++23',
    body: '整數分為有號與無號兩類。有號整數溢位是「未定義行為（UB）」，編譯器可據此激進最佳化，因此絕不可依賴溢位回繞；無號整數則以 2 的冪為模回繞，行為明確但容易在「無號減法變成巨大正數」時出錯。運算前，小於 int 的型別會先做整數提升（integer promotion）至 int；混合有號與無號運算時會發生 usual arithmetic conversions，常把有號值悄悄轉為無號，導致 -1 > 0u 之類的陷阱。實務原則：迴圈索引與一般算術優先用有號型別，位元操作與明確模運算才用無號，並開啟 -fsanitize=undefined 偵測溢位。',
  },
  code: {
    lang: 'cpp',
    code: `#include <bit>
#include <cstdint>
#include <limits>
#include <print>

int main() {
    int smax = std::numeric_limits<int>::max();  // [1]
    // smax + 1;   // [2] Signed overflow is undefined behavior; never rely on it

    unsigned int u = 0;
    --u;  // [3] Unsigned wraparound: becomes UINT_MAX, well-defined but often unintended

    int a = -1;
    unsigned int b = 1;
    bool surprising = (a < b);  // [4] a is converted to unsigned, result may be counterintuitive

    std::int8_t small = 100;
    auto promoted = small + small;  // [5] Promoted to int before addition; result type is int

    std::uint32_t bits = 0b1011'0000u;
    std::println("popcount={}, countl_zero={}, rotl={:#x}",
                 std::popcount(bits), std::countl_zero(bits), std::rotl(bits, 8));  // [6]

    static_assert(sizeof(float) == sizeof(std::uint32_t));
    float f = 1.0f;
    auto raw = std::bit_cast<std::uint32_t>(f);  // [7] Bit reinterpretation, not numeric conversion
    std::println("float 1.0f bits = {:#x}", raw);

    std::println("u={}, (a<b)={}, promoted type size={}", u, surprising, sizeof(promoted));
    return 0;
}`,
    callouts: [
      { n: 1, text: 'std::numeric_limits<T> 查詢型別的極值，是安全處理邊界的標準工具。' },
      { n: 2, text: '有號整數溢位為 UB；編譯器可假設它不會發生，故不可用來偵測溢位。' },
      { n: 3, text: '無號整數在 0 減 1 時回繞為最大值，這是「有定義」但常被誤用的行為。' },
      { n: 4, text: '有號與無號混合比較時，有號值被轉為無號，-1 會變成極大值，導致意外結果。' },
      { n: 5, text: '小於 int 的運算元先做整數提升；small + small 的結果型別是 int 而非 int8_t。' },
      {
        n: 6,
        text: '`<bit>` 提供標準化位元工具；`popcount` 計算 1 的數量，`countl_zero` 計算前導 0，`rotl` 做循環左移。',
      },
      {
        n: 7,
        text: '`std::bit_cast` 複製物件的位元表示；它不是數值轉型，也不需要用指標別名讀取。',
      },
    ],
  },
  deepDive: [
    {
      heading: '有號溢位是 UB——以及它帶來的最佳化',
      body: '有號整數溢位是未定義行為，編譯器據此假設 `x + 1 > x` 恆真，用以最佳化迴圈與邊界檢查。這代表你無法用 `if (x + 1 < x)` 偵測溢位——該分支可能被直接刪除。\n\n正確做法：以 `__builtin_add_overflow`（GCC／Clang）或 C++26 的 `<stdckdint>` 檢查、以 `-fsanitize=undefined` 在測試期捕捉，或改用無號型別取得明確的模運算回繞語意。',
    },
    {
      heading: '轉換階層與 size_t 陷阱',
      body: '整數運算依循轉換階層（rank）與提升規則；`size_t` 為無號，因此 `for (size_t i = n - 1; i >= 0; --i)` 會因 `i >= 0` 恆真而無窮迴圈，且 `n - 1` 在 `n == 0` 時回繞成極大值。\n\n容器索引與長度多為無號（`size()` 回傳 `size_type`），與有號索引混用是常見錯誤來源。C++20 的 `std::ssize` 回傳有號長度，可緩解此類問題。',
    },
    {
      heading: '位元操作與 <bit>',
      body: '位元操作常用在旗標、遮罩、壓縮格式、雜湊、校驗碼、底層 I/O 與效能敏感程式中。它的陷阱是語法看起來簡單，但邊界條件常直接落入未定義行為。實務上應先決定「這是在做一般算術，還是在操作位元表示」；後者通常用無號整數與 C++20 `<bit>` 工具表達，語意最清楚。\n\n位移量是第一個必查邊界。對 `x << n` 或 `x >> n` 而言，`n` 不能是負數，也不能大於或等於左運算元型別的位元寬度；在 32-bit `std::uint32_t` 上，`x << 31` 合法，`x << 32` 是 UB。不要假設硬體會把位移量取模，因為 C++ 語言層級沒有這個保證。安全寫法是用 `std::numeric_limits<T>::digits` 取得寬度，先檢查 `n < 0 || n >= width`，再移位。產生低 `n` 位遮罩時也要特別處理 `n == 0` 與 `n == width`，不能直接寫 `(T{1} << n) - 1` 後才補救。\n\n有號整數位移要更保守。C++20 起有號整數採二補數表示，負數右移規定為算術右移，也就是補符號位，例如 `-8 >> 1` 得到 `-4`。但這不代表所有位元技巧都適合寫在 signed type 上：左移負數、左移後超出可表示範圍、或混入整數提升與有號／無號轉換，都會讓程式碼難以審查。旗標、遮罩、rotate、hash mixing 這類操作，優先使用 `std::uint32_t`、`std::uint64_t` 等無號型別。\n\n`std::popcount(x)` 計算 unsigned integer 的二進位表示中有多少個 bit 是 1。例如 `0b10110000u` 的結果是 3。它常用於權限旗標、bitset 統計、棋盤表示、Bloom filter 與 SIMD 前後的摘要計算。相較手寫迴圈或 bit hack，`std::popcount` 直接表達意圖，且編譯器通常能對應到硬體指令。若手上是有號值，應先明確轉成對應的無號型別，而不是讓隱式轉換藏在呼叫點。\n\n`std::countl_zero(x)` 計算從最高位元開始連續有多少個 0。對 32-bit 值 `0x00f00000u` 來說，前 8 位是 0，所以結果是 8。它常用來找最高有效位元、計算 bit width、選擇 bucket、或實作壓縮編碼。`x == 0` 時它會回傳該型別的位元寬度，例如 `std::uint32_t` 回傳 32；這比許多舊式 compiler builtin 更容易安全使用，因為零值語意是標準化的。\n\n`std::rotl(x, n)` 是循環左移：被移出最高位的 bit 會繞回最低位。它常出現在雜湊、checksum 與某些位元混合步驟。手寫 rotate 常見形式是 `(x << n) | (x >> (width - n))`，但當 `n == 0`、`n == width` 或 `n` 未先正規化時，很容易因 `x >> width` 或 `x << width` 變成 UB。`std::rotl` 與 `std::rotr` 把這個意圖標準化，也讓編譯器更容易產生 rotate 指令。\n\n`std::bit_cast<To>(from)` 是位元重解讀工具：它把 `from` 的 object representation 原封不動複製到一個 `To` 物件中。它問的是「這個物件的位元長什麼樣子」，不是「這個數值轉成另一個型別是多少」。例如 `static_cast<std::uint32_t>(1.0f)` 是數值轉型，結果是 1；在常見 IEEE 754 平台上，`std::bit_cast<std::uint32_t>(1.0f)` 會得到 float 的位元表示 `0x3f800000`。\n\n這也是為什麼 `std::bit_cast` 能取代舊式 type punning。`*reinterpret_cast<std::uint32_t*>(&f)` 讓程式用 `std::uint32_t*` 去讀一個實際型別是 `float` 的物件，通常會違反 strict aliasing，屬於 UB。用 union 寫入 `f` 再讀 `u` 在 C++ 也不應作為一般性的型別雙關手法，因為讀取非目前 active member 有嚴格限制。`std::bit_cast` 的語意接近「用標準方式複製位元到另一個 trivially copyable 型別」，不靠別名讀取；最佳化後通常仍是零成本或極低成本。\n\n`std::bit_cast` 也有明確限制。來源與目標大小必須相同，兩者都必須是 trivially copyable；它不會幫你處理 endian、padding 或跨平台序列化格式。把 `std::uint32_t{0x12345678}` bit-cast 成 bytes 時，byte 順序依本機 endian 而定；把 struct bit-cast 成 bytes 時，padding bytes 也會一起出現，內容不應被當成穩定檔案格式。目標型別也必須能接受該位元組合；任意 bytes 轉成 `bool`、指標或有特殊表示限制的型別，仍可能沒有合理語意。',
    },
  ],
  pitfalls: [
    '在反向迴圈或減法中使用無號型別，因回繞造成無窮迴圈或極大值。',
    '以 `if (x + 1 < x)` 偵測有號溢位——該分支可能被最佳化器直接移除。',
    '位移量 `>=` 型別位元寬度或為負值，屬未定義行為。',
    '手寫 rotate 表達式卻沒有處理 `n == 0` 或 `n == width`，導致位移 UB。',
    '以 `reinterpret_cast` 或 union 做型別雙關（type punning），違反嚴格別名規則。',
    '把 `std::bit_cast` 當成可攜序列化工具，忽略 endian、padding 與目標型別表示限制。',
  ],
  bestPractices: [
    '一般算術與索引優先使用有號型別（依 Core Guidelines），僅在需要模運算或位元操作時用無號。',
    '以 `__builtin_*_overflow` 或 C++26 `<stdckdint>` 進行檢查式運算。',
    '使用 `<bit>` 的 `popcount`／`countl_zero`／`rotl`／`bit_cast` 取代手寫位元技巧。',
    '位移前用 `std::numeric_limits<T>::digits` 檢查寬度；遮罩產生器要明確處理 0 與完整寬度。',
    '需要有號長度時用 `std::ssize`，避免有號／無號混用。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '對於有號整數溢位（例如 INT_MAX + 1），C++ 標準如何規定？',
      options: [
        { id: 'a', text: '一定回繞到 INT_MIN' },
        { id: 'b', text: '是未定義行為（UB），不可依賴任何特定結果' },
        { id: 'c', text: '會拋出例外' },
        { id: 'd', text: '結果一定是 0' },
      ],
      correctOptionId: 'b',
      explanation:
        '有號整數溢位是未定義行為；編譯器可假設它不發生並據此最佳化。需要明確回繞語意時應改用無號型別。參見 Ch.04 PDF 第 27 頁。',
    },
    {
      id: 'q2',
      stem: '運算式 (-1 < 1u) 在 C++ 中的結果為何，原因是什麼？',
      options: [
        { id: 'a', text: 'true，因為 -1 顯然小於 1' },
        { id: 'b', text: 'false，因為 -1 被轉為極大的無號值' },
        { id: 'c', text: '編譯錯誤' },
        { id: 'd', text: '結果未定義' },
      ],
      correctOptionId: 'b',
      explanation:
        '混合有號與無號時會套用 usual arithmetic conversions，-1 轉為無號變成極大值，故比較結果為 false。參見 Ch.04 PDF 第 41 頁。',
    },
    {
      id: 'q3',
      stem: '兩個 std::int8_t 相加，運算結果的型別為何？',
      options: [
        { id: 'a', text: '仍為 std::int8_t' },
        { id: 'b', text: '因整數提升而成為 int' },
        { id: 'c', text: 'double' },
        { id: 'd', text: '無號整數' },
      ],
      correctOptionId: 'b',
      explanation:
        '小於 int 的整數型別在算術前會被提升為 int，因此 int8_t + int8_t 的結果型別是 int。參見 Ch.04 PDF 第 33 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['有號整數', '無號整數', '整數提升', '溢位'],
    caption:
      '整數運算的關鍵環節：有號／無號的選擇、運算前的整數提升，以及溢位所帶來的未定義或回繞行為。',
  },
  tryIt: {
    code: `#include <bit>
#include <cstdint>
#include <iostream>
#include <limits>

int main() {
    unsigned int u = 0;
    --u;  // unsigned wraparound
    int a = -1;
    unsigned int b = 1;
    std::cout << "u = " << u << '\\n';
    std::cout << "(a < b) = " << (a < b) << "  (may be counterintuitive)\\n";
    std::cout << "INT_MAX = " << std::numeric_limits<int>::max() << '\\n';

    std::uint32_t x = 0b1011'0000u;
    std::cout << "popcount = " << std::popcount(x) << '\\n';
    std::cout << "countl_zero = " << std::countl_zero(x) << '\\n';
    std::cout << "rotl(x, 8) = " << std::rotl(x, 8) << '\\n';

    static_assert(sizeof(float) == sizeof(std::uint32_t));
    float f = 1.0f;
    auto raw = std::bit_cast<std::uint32_t>(f);
    std::cout << "bit_cast<float 1.0f> = 0x" << std::hex << raw << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Bit manipulation - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/numeric',
      description: '`<bit>` 中 `popcount`、`countl_zero`、`rotl`、`bit_cast` 等工具的總覽。',
    },
    {
      title: 'Integer conversions - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/implicit_conversion',
      description: '整數提升與 usual arithmetic conversions 的精確規則。',
    },
    {
      title: 'std::numeric_limits - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/types/numeric_limits',
      description: '查詢各型別極值、位元數與特性的標準介面。',
    },
    {
      title: 'Modern C++ Programming — Basic Concepts II (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/04.Basic_concepts_II.html',
      description: 'Busato 課程第 4 章 HTML 投影片，涵蓋整數型別原文。',
    },
  ],
};

export default ch04BasicConceptsII;
