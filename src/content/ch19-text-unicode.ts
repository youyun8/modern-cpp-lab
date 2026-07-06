import type { ChapterContent } from '@/types/ChapterContent';

const ch19TextUnicode: ChapterContent = {
  slug: 'ch19-text-unicode',
  chapterLabel: '第 19.3 章',
  title: '文字、Unicode 與編碼',
  group: '第 4 部：STL 與工具庫',
  description:
    'char、char8_t、UTF-8、u8string、locale、路徑編碼與 Unicode 陷阱：在 byte-oriented 的 C++ 中安全處理文字。',
  concept: {
    standard: 'C++20',
    body: 'C++ 的字串型別本質上是字元單位的序列，不等於「人類文字」。`std::string` 通常承載 UTF-8 位元組，但標準不保證其內容編碼；C++20 引入 `char8_t` 與 `std::u8string`，讓 UTF-8 文字在型別上與一般 `char` 位元組區分。Unicode 中一個使用者看見的字（grapheme cluster）可能由多個 code point 組成，而 UTF-8 的一個 code point 又可能佔 1 到 4 個位元組；因此 `size()` 是 code unit 數，不是字數。`std::locale` 只處理部分傳統本地化問題，標準庫沒有完整 Unicode 正規化、斷詞、大小寫折疊與 grapheme 切分工具；實務上常在邊界明確採用 UTF-8，複雜文字處理交給 ICU 等專門函式庫。',
  },
  code: {
    lang: 'cpp',
    code: `#include <cstddef>
#include <iostream>
#include <string>
#include <string_view>

std::size_t count_utf8_code_points(std::string_view bytes) {  // [1]
    std::size_t count = 0;
    for (unsigned char c : bytes) {
        if ((c & 0b1100'0000) != 0b1000'0000) {  // [2]
            ++count;
        }
    }
    return count;
}

int main() {
    std::u8string typed = u8"cafe 世界";  // [3]
    std::string text;
    text.reserve(typed.size());
    for (char8_t unit : typed) {
        text.push_back(static_cast<char>(unit));  // [4]
    }

    std::cout << "bytes=" << text.size()
              << " code_points=" << count_utf8_code_points(text) << "\\n";

    std::string_view view{text};
    std::cout << view.substr(0, 4) << "\\n";  // [5]
    std::cout << "u8 code units=" << typed.size() << "\\n";
}`,
    callouts: [
      { n: 1, text: '此函式只計算 UTF-8 code point 數，不等於使用者看見的字元數。' },
      {
        n: 2,
        text: 'UTF-8 continuation byte 形式為 `10xxxxxx`；非 continuation byte 代表新 code point 起點。',
      },
      { n: 3, text: '`std::u8string` 使用 `char8_t` code unit，能在型別上表達 UTF-8。' },
      {
        n: 4,
        text: '需要呼叫舊式 `char` API 時，應在邊界明確轉成 UTF-8 bytes，而不是假裝型別相同。',
      },
      { n: 5, text: '依 byte 切 `substr` 可能切在 code point 中間；範例剛好取 ASCII 前綴才安全。' },
    ],
  },
  deepDive: [
    {
      heading: 'code unit、code point、grapheme',
      body: 'UTF-8 的 code unit 是 8-bit byte；一個 Unicode code point 需要 1 到 4 個 code unit；一個使用者感知的字元（grapheme cluster）可能由多個 code point 組成，例如基本字母加 combining mark，或 emoji 加膚色修飾與 ZWJ 序列。\n\n因此 `std::string::size()` 只告訴你 byte 數。UI 游標移動、截斷顯示、欄寬計算都不應直接用 byte index。',
    },
    {
      heading: 'char8_t 與 API 邊界',
      body: 'C++20 的 `char8_t` 讓 UTF-8 不再只是 `char` 的慣例。這提升型別安全，但也讓舊 API 需要轉接：很多函式仍接受 `std::string` 或 `char*`。在邊界轉換時應明確標註「這是 UTF-8 bytes」，避免無意間把本地編碼、二進位資料與 UTF-8 混在同一型別。\n\n跨平台程式可在內部統一使用 UTF-8，進出 OS API、filesystem path、GUI 或網路協定時集中做轉換。',
    },
    {
      heading: 'locale 與標準庫限制',
      body: '`std::locale`、iostream facets 與 `std::ctype` 能處理部分傳統本地化格式，但不是完整 Unicode 函式庫。標準庫缺少 normalization（NFC/NFD）、locale-aware case folding、grapheme segmentation 與 collation 的完整現代支援。\n\n需要可靠國際化時，應引入 ICU、Boost.Text 或平台文字 API；標準庫層級則負責保存 bytes、檢查基本合法性與清楚標示編碼。',
    },
  ],
  pitfalls: [
    '把 `std::string::size()` 當成畫面上的字元數。',
    '用 `substr` 任意切 UTF-8 字串，可能切斷 code point 產生無效 UTF-8。',
    '假設 `std::string` 永遠是 UTF-8；標準只規定它是 char 序列。',
    '以 ASCII 的大小寫轉換邏輯處理 Unicode，造成錯誤或安全漏洞。',
  ],
  bestPractices: [
    '在專案邊界明確規定文字編碼，現代新系統通常選 UTF-8。',
    '用 `std::u8string`／`char8_t` 表達真正的 UTF-8 code units，或用清楚命名標示 UTF-8 bytes。',
    '只在 code point 邊界切 UTF-8；UI 級文字操作交給 Unicode 函式庫。',
    '路徑、網路、檔案與 UI 邊界集中處理編碼轉換，不要散落在業務邏輯中。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '`std::string::size()` 對 UTF-8 字串回傳的是什麼？',
      options: [
        { id: 'a', text: '使用者看見的字元數' },
        { id: 'b', text: 'byte/code unit 數' },
        { id: 'c', text: 'Unicode normalization 後的長度' },
        { id: 'd', text: '螢幕欄寬' },
      ],
      correctOptionId: 'b',
      explanation:
        '`std::string` 是 char 序列；在 UTF-8 慣例下 size 仍只是 byte 數，不是 code point 或 grapheme 數。',
    },
    {
      id: 'q2',
      stem: 'C++20 的 `char8_t` 主要解決什麼問題？',
      options: [
        { id: 'a', text: '讓 UTF-8 code unit 有獨立型別，不再只是普通 char 慣例' },
        { id: 'b', text: '自動把所有字串轉成 UTF-16' },
        { id: 'c', text: '提供完整 Unicode normalization' },
        { id: 'd', text: '保證所有檔案路徑都是 ASCII' },
      ],
      correctOptionId: 'a',
      explanation:
        '`char8_t` 是 UTF-8 code unit 的型別，提升 API 邊界的型別安全，但不提供高階 Unicode 演算法。',
    },
    {
      id: 'q3',
      stem: '為何任意 byte index 的 `substr` 對 UTF-8 可能危險？',
      options: [
        { id: 'a', text: '它一定會配置太多記憶體' },
        { id: 'b', text: '它可能切在多位元組 code point 中間，產生無效 UTF-8' },
        { id: 'c', text: '它只能處理空字串' },
        { id: 'd', text: '它會改變原字串內容' },
      ],
      correctOptionId: 'b',
      explanation:
        'UTF-8 code point 可能佔多個 byte，任意切割會破壞編碼結構；UI 字元還可能跨多個 code point。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['bytes', 'code point', 'grapheme', 'locale/API'],
    caption:
      '文字層次：C++ 字串保存 code units；Unicode code point 與使用者感知字元是更高層抽象，需明確處理。',
  },
  tryIt: {
    code: `#include <iostream>
#include <string>

int main() {
    std::u8string text = u8"Hi 世界";
    std::cout << "UTF-8 code units = " << text.size() << '\\n';
    for (char8_t unit : text) {
        auto byte = static_cast<unsigned char>(unit);
        std::cout << std::hex << static_cast<int>(byte) << ' ';
    }
    std::cout << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Character sets and encodings - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/charset',
      description: 'C++ 字元集、字面值與編碼相關規則。',
    },
    {
      title: 'std::basic_string - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/string/basic_string',
      description: '標準字串容器的語意與操作。',
    },
    {
      title: 'ICU User Guide',
      href: 'https://unicode-org.github.io/icu/userguide/',
      description: '實務 Unicode、locale 與國際化處理的常用函式庫。',
    },
  ],
};

export default ch19TextUnicode;
