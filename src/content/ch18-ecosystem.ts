import type { ChapterContent } from '@/types/ChapterContent';

const ch18Ecosystem: ChapterContent = {
  slug: 'ch18-ecosystem',
  chapterLabel: '第 18 章',
  title: '生態系與工具',
  group: '第 3 部：建置系統與慣例',
  description:
    'CMake 建置、doxygen 文件與各式線上開發工具：如何用現代工具鏈組織、建置、文件化並分享 C++ 專案。',
  concept: {
    standard: 'C++23',
    body: 'C++ 沒有內建套件管理，因此工具生態格外重要。CMake 是事實上的跨平台建置系統：以 CMakeLists.txt 宣告目標（target）、相依與編譯選項，透過 target_link_libraries 等指令組織相依關係，並產生 Make／Ninja／IDE 專案。套件管理器 vcpkg 與 Conan 解決第三方相依取得與版本。品質工具包含 clang-format（自動排版）、clang-tidy（靜態分析與現代化建議）。文件方面，Doxygen 由註解生成 API 文件。線上工具則有 Compiler Explorer（觀察組語）、Wandbox／Quick-bench（快速實驗與微基準）。掌握這套工具鏈能讓專案可重現、可維護、易於協作。',
  },
  code: {
    lang: 'bash',
    code: `# ---- CMakeLists.txt (excerpt) ----
# cmake_minimum_required(VERSION 3.20)
# project(myproject LANGUAGES CXX)
# set(CMAKE_CXX_STANDARD 23)              # [1] specify the language standard
# add_executable(app src/main.cpp)       # [2] declare an executable target
# target_include_directories(app PUBLIC include)  # [3] header search path
# target_link_libraries(app PRIVATE fmt::fmt)     # [4] link dependencies

# ---- configure and build (out-of-source build) ----
cmake -S . -B build -G Ninja             # [5] generate the build system
cmake --build build -j                    # build in parallel

# auto-format and static analysis
clang-format -i src/*.cpp
clang-tidy src/main.cpp -- -std=c++23`,
    callouts: [
      { n: 1, text: 'CMAKE_CXX_STANDARD 設定專案的 C++ 標準版本，取代手動維護 -std 旗標。' },
      { n: 2, text: 'add_executable 定義一個可執行目標；函式庫則用 add_library。' },
      { n: 3, text: 'target_include_directories 以 PUBLIC／PRIVATE 控制標頭路徑的傳遞性。' },
      { n: 4, text: 'target_link_libraries 宣告相依；現代 CMake 以目標為中心自動傳遞相依屬性。' },
      { n: 5, text: 'cmake -S . -B build 採 out-of-source 建置，將產物與原始碼分離，保持乾淨。' },
    ],
  },
  deepDive: [
    {
      heading: '現代 CMake 的核心觀念',
      body: '現代 CMake 圍繞 target 與「使用需求」：以 `target_*` 指令設定屬性，並以 `PUBLIC`／`PRIVATE`／`INTERFACE` 決定屬性是否傳遞給下游。generator expressions（`$<...>`）可依組態／編譯器條件化設定。\n\n`FetchContent` 與 presets 讓相依取得與組態可重現。應避免全域的 `include_directories`／`add_definitions`，改用 target 範圍設定。',
    },
    {
      heading: '相依管理與可重現建置',
      body: 'vcpkg 與 Conan 以 manifest 模式（`vcpkg.json`／`conanfile`）宣告相依與版本，達成可重現、可鎖定的相依樹，取代手動下載或系統套件的版本漂移。\n\n配合容器固定工具鏈，可讓「在我機器上能跑」變成整個團隊與 CI 一致的結果。',
    },
    {
      heading: '品質工具鏈與自動化',
      body: '`clang-format` 統一排版、`clang-tidy` 做靜態分析與現代化建議（需要 `compile_commands.json`）。以 pre-commit hook 與 CI 強制執行，避免風格與品質漂移。\n\n文件可用 Doxygen（API）搭配 Sphinx／MkDocs（敘事文件）。把格式化、靜態分析、sanitizer 測試與文件生成全部納入 CI，是工業級專案的基本盤。',
    },
  ],
  pitfalls: [
    '使用全域 `include_directories`／`add_definitions` 而非 target 範圍設定，污染整個專案。',
    '相依未鎖定版本，造成跨機器與時間的版本漂移。',
    '未在 CI 強制 `clang-format`／`clang-tidy`，程式風格與品質逐漸漂移。',
    '執行 `clang-tidy` 卻沒有 `compile_commands.json`，分析不完整或失敗。',
  ],
  bestPractices: [
    '以 target 為中心撰寫 CMake，善用 generator expressions 與 presets。',
    '以 vcpkg／Conan 的 manifest 模式鎖定相依版本；容器固定工具鏈。',
    '在 CI 強制格式化與靜態分析，並產生 `compile_commands.json`。',
    '自動化文件生成（Doxygen + Sphinx／MkDocs）並納入 CI。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '在現代 CMake 中，target_link_libraries 的 PUBLIC／PRIVATE 關鍵字控制什麼？',
      options: [
        { id: 'a', text: '函式庫的執行速度' },
        { id: 'b', text: '相依屬性（如標頭路徑、巨集）是否傳遞給使用該目標的其他目標' },
        { id: 'c', text: '原始碼的存取權限' },
        { id: 'd', text: '可執行檔的檔名' },
      ],
      correctOptionId: 'b',
      explanation:
        'PUBLIC 讓相依屬性同時作用於目標本身與其使用者，PRIVATE 僅作用於目標自身，這是現代 CMake 的核心概念。參見 Ch.18 PDF 第 24 頁。',
    },
    {
      id: 'q2',
      stem: 'Doxygen 的主要用途是什麼？',
      options: [
        { id: 'a', text: '編譯 C++ 程式' },
        { id: 'b', text: '由原始碼中的註解自動生成 API 文件' },
        { id: 'c', text: '偵測記憶體洩漏' },
        { id: 'd', text: '管理第三方套件' },
      ],
      correctOptionId: 'b',
      explanation:
        'Doxygen 解析特定格式的註解，生成 HTML／PDF 等 API 參考文件。參見 Ch.18 PDF 第 38 頁。',
    },
    {
      id: 'q3',
      stem: 'clang-tidy 屬於哪一類工具？',
      options: [
        { id: 'a', text: '連結器' },
        { id: 'b', text: '靜態分析與現代化建議工具' },
        { id: 'c', text: '執行期除錯器' },
        { id: 'd', text: '套件管理器' },
      ],
      correctOptionId: 'b',
      explanation:
        'clang-tidy 做靜態分析，指出潛在錯誤與不符現代慣例之處，並能自動套用部分修正。參見 Ch.18 PDF 第 31 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['CMake', '編譯', '文件', '部署'],
    caption: 'C++ 工具鏈流程：以 CMake 組織建置、編譯產生產物，再以 Doxygen 生成文件並部署。',
  },
  tryIt: {
    code: `#include <iostream>

/// \\brief Compute a factorial (Doxygen-style comment).
/// \\param n a non-negative integer
/// \\return n!
unsigned long long factorial(int n) {
    unsigned long long r = 1;
    for (int i = 2; i <= n; ++i) {
        r *= i;
    }
    return r;
}

int main() {
    std::cout << "10! = " << factorial(10) << '\\n';
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'CMake Documentation',
      href: 'https://cmake.org/cmake/help/latest/',
      description: 'CMake 官方文件，涵蓋指令、目標與產生器。',
    },
    {
      title: 'vcpkg — C/C++ package manager',
      href: 'https://learn.microsoft.com/en-us/vcpkg/',
      description: '跨平台 C++ 套件管理器，簡化第三方相依取得。',
    },
    {
      title: 'Modern C++ Programming — Ecosystem (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/18.Ecosystem.html',
      description: 'Busato 課程第 18 章 HTML 投影片，涵蓋工具生態原文。',
    },
  ],
};

export default ch18Ecosystem;
