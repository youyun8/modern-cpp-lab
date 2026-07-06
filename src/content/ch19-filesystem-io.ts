import type { ChapterContent } from '@/types/ChapterContent';

const ch19FilesystemIo: ChapterContent = {
  slug: 'ch19-filesystem-io',
  chapterLabel: '第 19.2 章',
  title: 'Filesystem 與檔案 I/O',
  group: '第 4 部：STL 與工具庫',
  description:
    'std::filesystem、path、directory_iterator、file_status、fstream 與二進位 I/O：可攜地處理路徑、目錄、檔案與錯誤。',
  concept: {
    standard: 'C++17',
    body: '`std::filesystem` 將路徑與檔案系統操作標準化：`std::filesystem::path` 表示平台原生路徑，能用 `/` 組合路徑並處理 Windows／POSIX 分隔差異；`exists`、`is_regular_file`、`file_size`、`last_write_time` 查詢狀態；`directory_iterator` 與 `recursive_directory_iterator` 遍歷目錄。檔案內容 I/O 仍主要靠 `std::ifstream`／`std::ofstream`／`std::fstream`，文字模式適合行導向資料，二進位模式要搭配 `std::ios::binary` 並明確處理位元組數。實務重點是錯誤處理：filesystem API 多數同時提供會丟出 `filesystem_error` 的版本與填入 `std::error_code` 的 non-throwing 版本；批次掃描目錄時通常偏好 error_code 版本避免單一壞檔中斷整個流程。',
  },
  code: {
    lang: 'cpp',
    code: `#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>

namespace fs = std::filesystem;

int main() {
    fs::path root = fs::current_path();      // [1]
    fs::path report = root / "report.txt";  // [2]

    {
        std::ofstream out(report);
        out << "Modern C++\\n";
        if (!out) {
            return 1;                  // [3]
        }
    }

    std::error_code ec;
    if (fs::is_regular_file(report, ec)) {   // [4]
        std::cout << report.filename().string()
                  << " bytes=" << fs::file_size(report, ec) << "\\n";
    }

    for (const fs::directory_entry& entry : fs::directory_iterator(root, ec)) {  // [5]
        if (entry.is_regular_file(ec)) {
            std::cout << "file: " << entry.path().filename().string() << "\\n";
        }
    }
}`,
    callouts: [
      { n: 1, text: '`std::filesystem::path` 保存平台原生路徑表示，不應用字串手動拼接分隔符。' },
      { n: 2, text: '`operator/` 組合路徑，會使用平台正確的分隔語意。' },
      { n: 3, text: 'stream I/O 的錯誤預設不丟例外，需檢查 stream 狀態或自行啟用 exceptions。' },
      { n: 4, text: '帶 `std::error_code` 的 overload 不丟例外，適合掃描大量檔案時逐項處理錯誤。' },
      {
        n: 5,
        text: '`directory_iterator` 只走一層；需要遞迴時改用 `recursive_directory_iterator`。',
      },
    ],
  },
  deepDive: [
    {
      heading: 'path 不是普通字串',
      body: '`std::filesystem::path` 的 native encoding 與分隔符依平台而異；在 Windows 上路徑本質上常與寬字元 API 互動，在 POSIX 上通常是位元組序列。用 `path` 組合與正規化路徑，最後才在邊界轉成 `string()`、`u8string()` 或 `wstring()`。\n\n`lexically_normal` 只做字面正規化，不查檔案系統；`canonical` 會解析 symlink 並要求路徑存在；`weakly_canonical` 可處理部分不存在的路徑。安全敏感程式要小心 symlink 與 TOCTOU 競爭。',
    },
    {
      heading: 'stream 狀態、文字模式與二進位模式',
      body: '`ifstream`／`ofstream` 預設以狀態位元回報錯誤：`eofbit`、`failbit`、`badbit`。讀檔迴圈應以讀取操作本身作條件，例如 `while (std::getline(in, line))`，不要先問 `eof()`。\n\n二進位檔必須用 `std::ios::binary`，並以 `read`／`write` 處理位元組；直接 dump struct 只適合同一 ABI、同一 endian、無 padding 風險的內部暫存格式。跨平台格式應明確序列化欄位。',
    },
    {
      heading: '例外與 error_code 的選擇',
      body: '一次性工具或建立必要檔案時，丟出 `std::filesystem::filesystem_error` 的版本很直觀；檔案索引器、清理器、備份工具等批次任務則應使用 `std::error_code` overload，記錄錯誤後繼續。\n\n`directory_iterator` 建構與遞增都可能失敗；處理權限不足、檔案被刪除、symlink loop 時，程式必須決定是跳過、重試還是中止。',
    },
  ],
  pitfalls: [
    '用字串手動拼接 `/` 或 `\\`，在跨平台路徑、根目錄與 UNC path 上出錯。',
    '用 `while (!in.eof())` 讀檔，導致最後一筆資料被重複或錯誤處理。',
    '假設 `path.string()` 永遠是 UTF-8；不同平台與 locale 下不一定成立。',
    '掃描目錄時使用會丟例外的 API，單一權限錯誤就中斷整個批次。',
  ],
  bestPractices: [
    '用 `std::filesystem::path` 與 `/` 組合路徑，避免手動處理分隔符。',
    '讀檔迴圈以讀取操作本身為條件；寫檔後檢查 stream 狀態。',
    '批次檔案處理優先使用 `std::error_code` overload 並記錄錯誤。',
    '跨平台二進位格式要明確序列化，不要直接寫出含 padding 的 struct。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '組合兩段檔案路徑時，建議使用什麼？',
      options: [
        { id: 'a', text: '字串相加並手動插入 `/`' },
        { id: 'b', text: '`std::filesystem::path` 的 `/` 運算子' },
        { id: 'c', text: '把所有路徑轉成 int' },
        { id: 'd', text: '只支援目前作業系統的分隔符' },
      ],
      correctOptionId: 'b',
      explanation:
        '`path / child` 會依平台路徑語意組合，不會把分隔符、root path 與原生表示散落在字串操作中。',
    },
    {
      id: 'q2',
      stem: '讀文字檔逐行處理時，哪個迴圈條件較正確？',
      options: [
        { id: 'a', text: '`while (!in.eof())`' },
        { id: 'b', text: '`while (std::getline(in, line))`' },
        { id: 'c', text: '`while (true)` 且永不檢查狀態' },
        { id: 'd', text: '`while (line.size() >= 0)`' },
      ],
      correctOptionId: 'b',
      explanation:
        '讀取操作本身會同時嘗試讀取並回報成功與否；`eof()` 只有在讀取失敗後才可靠反映結尾。',
    },
    {
      id: 'q3',
      stem: '為何大量掃描目錄時常用帶 `std::error_code` 的 filesystem overload？',
      options: [
        { id: 'a', text: '它完全忽略錯誤' },
        { id: 'b', text: '它不丟例外，能讓程式逐項記錄錯誤並繼續處理' },
        { id: 'c', text: '它會自動刪除壞檔案' },
        { id: 'd', text: '它只能在 Windows 使用' },
      ],
      correctOptionId: 'b',
      explanation:
        '批次任務通常不希望單一權限或競爭錯誤中止整個掃描，error_code 版本讓錯誤處理更局部。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['path', 'status', 'iterator', 'fstream'],
    caption: '檔案處理流程：path 表示位置，status 查詢狀態，iterator 走訪目錄，fstream 讀寫內容。',
  },
  tryIt: {
    code: `#include <filesystem>
#include <iostream>

int main() {
    namespace fs = std::filesystem;
    for (const auto& entry : fs::directory_iterator(fs::current_path())) {
        std::cout << entry.path().filename().string() << '\\n';
    }
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'Filesystem library - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/filesystem',
      description: 'path、directory_iterator、file_status 與檔案系統操作。',
    },
    {
      title: 'std::basic_ifstream - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/io/basic_ifstream',
      description: '檔案輸入 stream 的狀態與讀取介面。',
    },
    {
      title: 'std::error_code - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/error/error_code',
      description: '非例外式錯誤回報的標準型別。',
    },
  ],
};

export default ch19FilesystemIo;
