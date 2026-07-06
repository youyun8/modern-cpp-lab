import type { ChapterContent } from '@/types/ChapterContent';

const ch16Attributes: ChapterContent = {
  slug: 'ch16-attributes',
  chapterLabel: '第 16.1 章',
  title: '標準屬性 Attributes',
  group: '第 3 部：建置系統與慣例',
  description:
    '`[[nodiscard]]`、`[[maybe_unused]]`、`[[deprecated]]`、`[[likely]]` 等標準屬性，讓你以可攜的語法向編譯器與讀者傳達意圖、強化警告並協助最佳化。',
  concept: {
    standard: 'C++17',
    body: 'C++11 引入了統一的屬性語法 `[[attribute]]`，取代各家編譯器五花八門的 `__attribute__` 與 `__declspec`。屬性是附加在宣告、敘述或型別上的標準化標註，用來向編譯器表達額外語意：`[[nodiscard]]` 要求呼叫端不得忽略回傳值，`[[maybe_unused]]` 壓下「未使用」警告，`[[deprecated]]` 標記即將淘汰的 API，`[[fallthrough]]` 表明 switch 的貫穿是刻意的，`[[likely]]`／`[[unlikely]]`（C++20）則提示分支機率。屬性的精神是「不改變程式意義，只補充意圖」：即使編譯器忽略某個未知屬性，程式行為也應維持不變。善用它們能把口頭約定變成編譯器能檢查的規則。',
  },
  deepDive: [
    {
      heading: '[[nodiscard]]：把「別忽略回傳值」變成編譯錯誤',
      body: '`[[nodiscard]]` 是實務上最有價值的屬性。標在函式上時，忽略其回傳值會產生警告；標在型別（如 `struct [[nodiscard]] Error {}`）上時，任何回傳該型別而被忽略的呼叫都會被警告。\n\n它非常適合三類函式：回傳錯誤碼或狀態的函式（忽略等於吞掉錯誤）、沒有副作用的純查詢函式（忽略代表呼叫毫無意義，如 `empty()` 被誤當成 `clear()`）、以及回傳需要接手管理之資源的工廠函式。C++20 起還能附上原因字串：`[[nodiscard("忽略會洩漏 handle")]]`。',
    },
    {
      heading: '[[likely]] / [[unlikely]] 與最佳化屬性',
      body: '`[[likely]]` 與 `[[unlikely]]`（C++20）標在敘述或 case 標籤上，提示某條執行路徑較常／較少發生，讓編譯器據此安排指令佈局與分支預測友善的程式碼。它們主要用在效能敏感的熱路徑，例如錯誤處理分支標成 `[[unlikely]]`。\n\n要留意的是：這只是「提示」，用錯反而可能拖慢速度，應以剖析數據佐證，不要憑感覺灑。相對地 `[[assume]]`（C++23）更激進，它讓編譯器「假設某條件恆真」以利最佳化；一旦假設不成立即為未定義行為，必須極度謹慎。',
    },
    {
      heading: '其餘常用屬性',
      body: '`[[maybe_unused]]` 可標在變數、參數或函式上，抑制未使用警告，特別適合只在 `assert` 或特定編譯組態下才用到的變數。`[[fallthrough]]` 放在 switch 的 case 結尾，明確告訴編譯器與讀者「這裡刻意不 break」。`[[deprecated("改用 X")]]` 在呼叫舊 API 時發出警告並附遷移指引，是逐步淘汰介面的利器。\n\n這些屬性的共通好處是「自我文件化」：它們把原本寫在註解裡、無法被機器檢查的意圖，變成編譯器能驗證與提醒的訊號。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `#include <iostream>

// Type-level nodiscard: any ignored return value triggers a warning
struct [[nodiscard]] Status {
    bool ok;
};

[[nodiscard("ignoring the error code causes silent failure")]]  // [1]
Status write_all(const char* data);

[[deprecated("use write_all() instead")]]                // [2]
void legacy_write(const char* data);

int classify(int x) {
    switch (x) {
        case 0:
            std::cout << "zero\\n";
            [[fallthrough]];                             // [3]
        case 1:
            return 1;
        default:
            [[unlikely]] return -1;                      // [4]
    }
}

int main([[maybe_unused]] int argc, char**) {           // [5]
    write_all("hi");   // warning: [[nodiscard]] return value ignored
    return classify(0);
}`,
    callouts: [
      {
        n: 1,
        text: '函式層級 `[[nodiscard]]` 並附原因字串（C++20）；忽略回傳值會被警告。',
      },
      {
        n: 2,
        text: '`[[deprecated]]` 在呼叫處發出警告並提供遷移建議。',
      },
      {
        n: 3,
        text: '`[[fallthrough]]` 明示此處刻意貫穿到下一個 case，消除編譯器警告。',
      },
      {
        n: 4,
        text: '`[[unlikely]]`（C++20）提示 default 分支很少發生，協助分支佈局最佳化。',
      },
      {
        n: 5,
        text: '`[[maybe_unused]]` 抑制未使用參數的警告，不必再用 `(void)argc` 這類技巧。',
      },
    ],
  },
  pitfalls: [
    '屬性是「提示」而非命令：編譯器可合法忽略未知或不支援的屬性，別依賴它改變程式語意。',
    '`[[likely]]`／`[[unlikely]]` 用錯方向可能讓熱路徑變慢；請以剖析數據佐證，而非憑直覺。',
    '`[[assume]]`（C++23）若假設條件在執行期不成立即為未定義行為，風險遠高於一般提示型屬性。',
    '屬性的擺放位置有規則（作用於宣告、敘述或型別），放錯位置會編不過或作用到非預期的實體。',
  ],
  bestPractices: [
    '對回傳錯誤碼、狀態或需接手之資源的函式一律加上 `[[nodiscard]]`，把「別忽略」變成編譯期檢查。',
    '用 `[[deprecated("改用…")]]` 搭配遷移訊息，讓 API 淘汰過程對呼叫端友善且可追蹤。',
    '以 `[[maybe_unused]]` 取代 `(void)x;` 慣用法，處理只在特定組態下使用的變數。',
    '效能提示屬性（`[[likely]]`、`[[assume]]`）只用在經量測確認的熱路徑，並保守使用。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '下列關於標準屬性的敘述，何者最正確？',
      options: [
        { id: 'a', text: '`[[nodiscard]]` 可標在函式或型別上，用來在回傳值被忽略時產生警告' },
        { id: 'b', text: '編譯器必須對所有屬性採取行動，不能忽略' },
        { id: 'c', text: '`[[likely]]` 一定能加速程式，因此應盡量在每個分支使用' },
        { id: 'd', text: '`[[assume]]` 的條件即使在執行期為假也完全安全' },
      ],
      correctOptionId: 'a',
      explanation:
        '`[[nodiscard]]` 可作用於函式或型別。屬性原則上是提示，編譯器可忽略未知屬性；`[[likely]]` 用錯會拖慢速度，而 `[[assume]]` 假設不成立即為未定義行為。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['標註意圖', '[[nodiscard]]/[[deprecated]]', '編譯器檢查與警告', '更安全的 API'],
    caption: '標準屬性把口頭約定轉為編譯器可驗證的訊號，兼顧正確性、可讀性與最佳化。',
  },
  tryIt: {
    code: `#include <iostream>

[[nodiscard]] int compute() { return 42; }

int main() {
    // Try uncommenting the next line to see the compiler warn about the ignored return value
    // compute();
    int result = compute();
    std::cout << result << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Attribute specifier sequence - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/attributes',
      description: '所有標準屬性的完整清單、適用位置與各版本引入情況。',
    },
    {
      title: '[[nodiscard]] - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/attributes/nodiscard',
      description: 'nodiscard 的語意、型別層級用法與 C++20 的原因字串。',
    },
  ],
};

export default ch16Attributes;
