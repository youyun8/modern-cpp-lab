import type { ChapterContent } from '@/types/ChapterContent';

const ind35Cpp20UtilityUpdates: ChapterContent = {
  slug: 'ind35-cpp20-utility-updates',
  chapterLabel: '第 64 章',
  title: 'C++20 工具庫更新：chrono、bit、source_location',
  group: '第 20 部：C++20 語言與工具庫新特性',
  description:
    'C++20 的 calendar chrono、`<bit>` 位元工具與 `std::source_location`：把常見平台技巧標準化，降低手寫巨集與位元 hack。',
  concept: {
    standard: 'C++20',
    body: '除了大型語言特性，C++20／23 也補齊許多日常工具。`std::chrono`（C++20）加入 calendar/date 型別，能用 `2026y / July / 6` 建立日期，避免手寫年月日結構；`<bit>` 提供 `has_single_bit`、`bit_width`、`bit_floor`、`popcount`、`endian` 等位元操作，取代不可攜的 compiler intrinsic 或容易寫錯的 bit hack；`std::source_location` 則讓 logging/assertion API 取得呼叫端檔名、行號與函式名稱，不必再用 `__FILE__`、`__LINE__` 巨集包裝。這些更新不一定醒目，但能讓基礎設施程式碼更安全、更可攜。',
  },
  deepDive: [
    {
      heading: 'chrono calendar 讓日期成為型別',
      body: 'C++20 前的 `std::chrono` 強在 duration 與 time_point，但日曆日期支援不足。C++20 加入 `year`、`month`、`day`、`year_month_day` 等型別，並提供可讀的建構語法。`year_month_day` 可檢查 `ok()`，讓無效日期不再只是未命名的整數組合。\n\n對需要排程、報表、資料分區的系統，這能減少自製日期型別與字串解析邏輯。若牽涉時區，還需確認目標標準庫是否完整實作 C++20 time zone database。',
    },
    {
      heading: '<bit> 把常見位元技巧標準化',
      body: '低階程式常需要判斷數字是否為 2 的冪、計算 bit width、對齊到下一個 power of two、統計 set bits。C++20 `<bit>` 將這些操作標準化，語意清楚且讓編譯器可直接映射到硬體指令。\n\n相較手寫 `x & (x - 1)` 等技巧，標準函式更不容易在零值、型別寬度或 signed/unsigned 轉換上犯錯；團隊成員也不必猜測 bit hack 的意圖。',
    },
    {
      heading: 'source_location 取代 logging 巨集',
      body: '`std::source_location::current()` 作為預設參數時，會在呼叫端捕捉位置資訊，而不是在被呼叫函式內捕捉。這讓 logging、contract check、trace event API 可寫成普通函式，同時保留呼叫端的檔名、行號與函式名稱。\n\n它不能完全取代所有巨集，例如需要字串化表達式本身的 assert 仍可能需要 macro；但對大多數「記錄呼叫位置」用途，`source_location` 更型別安全也更容易測試。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <bit>
#include <chrono>
#include <cstdint>
#include <iostream>
#include <source_location>
#include <string_view>

void log(std::string_view message,
         const std::source_location location = std::source_location::current()) {  // [1]
    std::cout << location.function_name() << ':' << location.line() << " - " << message << '\\n';
}

int main() {
    using namespace std::chrono;

    constexpr year_month_day release_day = 2026y / July / 6;  // [2]
    static_assert(release_day.ok());

    constexpr std::uint32_t workers = 16;
    static_assert(std::has_single_bit(workers));              // [3]

    std::cout << "date = " << int(release_day.year()) << '-'
              << unsigned(release_day.month()) << '-' << unsigned(release_day.day()) << '\\n';
    std::cout << "bit width = " << std::bit_width(workers) << '\\n';
    std::cout << "set bits = " << std::popcount(0b10110100u) << '\\n';

    log("startup complete");                                  // [4]
}`,
    callouts: [
      {
        n: 1,
        text: '`source_location::current()` 作為預設參數時，捕捉的是呼叫端位置。',
      },
      {
        n: 2,
        text: 'C++20 calendar 型別讓年月日有明確型別與 `ok()` 驗證。',
      },
      {
        n: 3,
        text: '`std::has_single_bit` 清楚表達「是否為 2 的冪」，比手寫 bit hack 更可讀。',
      },
      {
        n: 4,
        text: '呼叫普通函式即可取得呼叫端函式名稱與行號，不需要 logging macro。',
      },
    ],
  },
  pitfalls: [
    '假設所有 C++20 標準庫都完整支援 chrono time zone database；不同工具鏈落地進度可能不同。',
    '對 signed integer 使用低階位元技巧，忽略符號與提升規則；`<bit>` 多數工具要求 unsigned integer。',
    '在被呼叫函式內手動呼叫 `source_location::current()`，導致記錄到 logging 函式本身的位置。',
    '用 `source_location` 取代需要字串化表達式的 assert 巨集，結果失去原始條件文字。',
  ],
  bestPractices: [
    '日期處理優先使用 chrono calendar 型別，並在接收外部輸入後檢查 `ok()`。',
    '常見位元操作用 `<bit>` 標準函式，讓意圖與邊界情況都更明確。',
    'logging API 將 `std::source_location` 放在最後一個預設參數，呼叫端不必手動傳入。',
    '跨平台專案針對 chrono time zone 與 `<bit>` intrinsic 效能做工具鏈驗證。',
    'enum class 轉底層整數一律用 std::to_underlying(C++23)，取代容易寫錯型別的 static_cast。',
    '在邏輯上不可能到達的分支使用 std::unreachable() 幫助編譯器優化，但切勿在可能執行的路徑上使用。',
    '跨平台位元組序轉換用 std::byteswap 配合 std::endian，取代手寫的位元組反轉邏輯。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '`std::source_location::current()` 放在函式預設參數中的效果是什麼？',
      options: [
        { id: 'a', text: '捕捉呼叫端的位置資訊' },
        { id: 'b', text: '只能捕捉 logging 函式自己的位置' },
        { id: 'c', text: '在執行期掃描整個 stack trace' },
        { id: 'd', text: '必須搭配巨集才能編譯' },
      ],
      correctOptionId: 'a',
      explanation:
        '作為預設參數時，`source_location::current()` 會在呼叫點求值，因此可取得呼叫端檔名、行號與函式名稱。',
    },
    {
      id: 'q2',
      stem: '`std::has_single_bit(x)` 表達的語意是什麼？',
      options: [
        { id: 'a', text: 'x 是否剛好只有一個 bit 被設為 1，也就是是否為 2 的冪' },
        { id: 'b', text: 'x 是否為奇數' },
        { id: 'c', text: 'x 是否超過硬體 word size' },
        { id: 'd', text: 'x 是否為負數' },
      ],
      correctOptionId: 'a',
      explanation:
        '`has_single_bit` 是 C++20 `<bit>` 的標準函式，用來判斷 unsigned integer 是否只有一個 set bit。',
    },
    {
      id: 'q3',
      stem: '下列哪個工具在 C++23 才被標準化？',
      options: [
        { id: 'a', text: 'std::to_underlying' },
        { id: 'b', text: 'std::source_location' },
        { id: 'c', text: 'std::has_single_bit' },
        { id: 'd', text: 'std::chrono::year_month_day' },
      ],
      correctOptionId: 'a',
      explanation:
        'std::to_underlying 是 C++23 新增的工具，用於把 enum class 安全轉換為底層整數值；其餘皆為 C++20 特性。',
    },
    {
      id: 'q4',
      stem: 'C++20 chrono calendar 型別的主要好處是什麼？',
      options: [
        { id: 'a', text: '用具名型別表達年月日，並可檢查日期組合是否有效' },
        { id: 'b', text: '讓所有日期都自動轉成 UTC 字串' },
        { id: 'c', text: '移除 time_point 與 duration' },
        { id: 'd', text: '保證所有標準庫都有完整時區資料庫' },
      ],
      correctOptionId: 'a',
      explanation: '`year_month_day` 等型別讓日期不再只是整數組合，並提供 `ok()` 驗證基本有效性。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['chrono 日期', '<bit> 操作', 'source_location', '基礎設施 API'],
    caption:
      'C++20 工具庫更新將常見平台技巧標準化，讓日期、位元與呼叫位置資訊都有型別安全的標準介面。',
  },
  tryIt: {
    code: `#include <bit>
#include <chrono>
#include <iostream>
#include <source_location>

void trace(const std::source_location where = std::source_location::current()) {
    std::cout << "trace from line " << where.line() << '\\n';
}

int main() {
    using namespace std::chrono;
    year_month_day day = 2026y / July / 6;

    std::cout << "valid date = " << std::boolalpha << day.ok() << '\\n';
    std::cout << "bit floor = " << std::bit_floor(20u) << '\\n';
    trace();
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Date and time utilities - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/chrono',
      description: 'C++20 chrono calendar、time point、duration 與時區相關工具。',
    },
    {
      title: 'Bit manipulation - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/numeric/bit',
      description: '`<bit>` 標準函式，如 `has_single_bit`、`bit_width`、`popcount`。',
    },
    {
      title: 'std::source_location - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/utility/source_location',
      description: 'C++20 呼叫端位置資訊工具，常用於 logging 與診斷。',
    },
  ],
};

export default ind35Cpp20UtilityUpdates;
