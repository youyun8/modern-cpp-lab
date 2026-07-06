import type { ChapterContent } from '@/types/ChapterContent';

const appendixDReferences: ChapterContent = {
  slug: 'appendix-d-references',
  chapterLabel: '附錄 D',
  title: '參考書目與標準提案',
  group: '附錄',
  description: '延伸閱讀書目與關鍵標準提案（P2300、P1673、P1928、P0019 等）的索引。',
  concept: {
    standard: 'C++26',
    body: '本書涵蓋的許多主題並非只存在於教科書式的穩定敘述中，而是仍在 WG21（C++ 標準委員會）逐版修訂的提案（paper）。要成為工業強度的 C++ 平行程式設計者，除了理解語意，還必須具備「查證權威來源」的能力：知道一項語法或型別出自哪一份提案、該提案目前的狀態（尚在審議、已投票併入標準、或已經定案）、以及該去哪裡查最新版本。本附錄整理全書引用過的關鍵標準提案編號、經典延伸閱讀書目，以及應長期追蹤的線上參考資源，並提供一份跨章節的查閱索引，方便讀者在忘記某個構造出自哪份提案時快速回頭查證，而不是依賴記憶或未經查證的網路文章。',
  },
  deepDive: [
    {
      heading: '關鍵標準提案索引：本書引用的四份核心 paper',
      body: '`std::execution`（senders/receivers，第 45 章）對應 P2300，這是目前 WG21 內部討論份量最大、修訂版本也最多的提案之一，讀者查閱時務必確認版本號（如 P2300R10），因為早期版本與最終併入 C++26 的版本在 API 細節上可能有落差。\n\n`std::linalg`（第 55 章，矩陣與線性代數運算）對應 P1673，目標是把 BLAS 風格的稠密矩陣運算標準化為 `std::linalg` 命名空間下的一組演算法。\n\n`std::simd`（第 46 章，資料平行型別）對應 P1928，其前身是 Parallelism TS2 中的 `std::experimental::simd`（源自 Vc 函式庫），P1928 的工作是把它「扶正」為標準命名空間下的 `std::simd`。\n\n`std::atomic_ref`（涉及對非 atomic 物件做原子存取的章節）對應 P0019，這是四份提案中定案最早、也最穩定的一份，已隨 C++20 併入標準，語意上不會再有重大變動。\n\n除了以上四份確定編號的提案，書中偶爾提及的較新構造（例如 `std::generator` 這類協程輔助設施）可能仍在編號與內容上持續調整，**若讀者對某個提案編號不完全確定，最保險的作法是直接到 wg21.link 的論文索引查詢最新版本，而不是照抄可能已過時或記錯的編號**——本書寧可誠實標註「請以 wg21.link 最新清單為準」，也不願為了看似完整而給出未經查證、可能錯誤的編號。',
    },
    {
      heading: '經典書籍：兩本奠基性的並行程式設計專書',
      body: '《C++ Concurrency in Action》（Anthony Williams 著，Manning 出版，目前為第二版）是 C++ 標準函式庫並行工具（`std::thread`、`std::mutex`、`std::atomic`、`std::future` 等）最權威、最完整的實務指南，作者本人是 Boost.Thread 與 C++11 執行緒函式庫標準化過程的核心貢獻者之一。適合用來補強本書第 9 部到第 11 部（記憶體模型、執行緒基礎、鎖與同步原語）的細節，尤其是記憶體順序（memory order）與無鎖資料結構章節，書中有大量本書篇幅無法涵蓋的邊角案例分析。\n\n《The Art of Multiprocessor Programming》（Maurice Herlihy 與 Nir Shavit 合著）則是理論導向的並行演算法經典，涵蓋共識問題（consensus）、線性化（linearizability）、無鎖與無等待（lock-free／wait-free）資料結構的正確性證明，語言無關（書中範例以 Java 偽碼為主，但概念完全適用於 C++）。適合在理解本書的鎖、無鎖佇列、記憶體順序等章節之後，進一步深入演算法正確性與理論基礎，尤其對想要自行設計無鎖資料結構的讀者是必讀。',
    },
    {
      heading: '線上參考：應長期追蹤而非一次性閱讀的資源',
      body: 'cppreference.com 是目前社群公認最準確、更新最即時的 C++ 標準函式庫線上參考，每個頁面通常會標註該構造自哪個標準版本引入、各主要編譯器（GCC／Clang／MSVC）的實作支援狀態，這對追蹤本書提到的 C++26 新提案（尚未在所有編譯器落地）特別重要。\n\nisocpp.org 是 C++ 標準委員會的官方入口網站，除了新聞與部落格文章，也連結到委員會的會議紀錄與提案索引，適合追蹤標準演進的「大局」（哪些提案即將投票、哪個標準版本預計何時定案）。\n\nwg21.link 則是查閱單一提案原文最快的捷徑：只要知道提案編號（如 `p2300`、`p1673`），在網址後面加上編號即可直接跳轉到該提案在 WG21 官方文件庫中最新版本的頁面，是本附錄與全書「延伸閱讀」連結最常用的來源格式。',
    },
    {
      heading: '閱讀順序建議：把參考資料對應回全書章節',
      body: '若讀者是循序讀完全書後想做系統性複習，建議的延伸閱讀順序是：先讀《C++ Concurrency in Action》對應第 9 部到第 11 部（記憶體模型、執行緒、鎖與同步原語）的章節，鞏固基礎工具的實務細節；接著查閱 P0019（`atomic_ref`）與 cppreference 上的記憶體順序頁面，加深對第 11 部無鎖與原子操作章節的理解。\n\n進入第 12 部（高階平行抽象）與第 45 章 senders/receivers 時，直接對照 P2300 原文與 stdexec 參考實作的原始碼，會比任何二手教學文章更貼近實際語意；第 13 部資料平行與向量化（第 46 章 `std::simd`）則對照 P1928 與 cppreference 的 `std::experimental::simd` 頁面。第 55 章矩陣與線性代數運算（`std::linalg`）建議直接查閱 P1673，其提案文件本身就包含大量與現有 BLAS 介面對照的範例，比教材更適合作為 API 速查表。最後，《The Art of Multiprocessor Programming》適合在讀完全書、對並行程式設計的實務工具已有整體概念後再讀，作為從「怎麼用」轉向「為什麼正確」的理論補完。',
    },
  ],
  code: {
    lang: 'cpp',
    code: `// The code in this appendix is not a runnable example but a
// lookup table: it maps standard library constructs used throughout the book
// back to their WG21 proposal numbers.
#include <atomic>
// #include <execution>   // std::execution (senders/receivers)
// #include <linalg>      // std::linalg (matrix/linear algebra)
// #include <simd>        // std::simd (data-parallel types)

void referenceLookupTable() {
    // [1] std::execution::sender / receiver / schedule / then / when_all
    //     see: P2300 -- std::execution (Chapter 45)
    //     Still under revision as of this writing; check wg21.link/p2300 for the latest version.

    // [2] std::linalg::matrix_product and other dense matrix operations
    //     see: P1673 -- std::linalg (Chapter 55)
    //     The proposal document itself contains many examples compared against the traditional BLAS interface.

    // [3] std::simd<T, N> data-parallel type and simd_mask
    //     see: P1928 -- std::simd (Chapter 46)
    //     Formerly std::experimental::simd from Parallelism TS2.

    // [4] std::atomic_ref<T>: atomic access to an existing (non-atomic) object
    //     see: P0019 -- Atomic Ref (chapters covering atomic operations and memory order)
    std::atomic_ref<int> counter_ref(*(new int(0)));  // illustrative only, not a complete example
    counter_ref.fetch_add(1, std::memory_order_relaxed);

    // [5] Proposal numbers get revised with new revision suffixes as review progresses (e.g. P2300R10);
    //     always check the revision number alongside the proposal number to avoid relying on outdated content.

    // [6] If unsure of the exact proposal number for a construct, check the wg21.link paper index first,
    //     rather than citing an unverified number from memory or secondhand articles.
}`,
    callouts: [
      {
        n: 1,
        text: 'P2300 涵蓋 sender/receiver 與 std::execution，是全書引用份量最重、修訂也最頻繁的提案，查閱時務必連版本號一起確認。',
      },
      {
        n: 2,
        text: 'P1673 定義 std::linalg，提案文件本身即附帶大量與傳統 BLAS API 對照的範例，可當 API 速查表使用。',
      },
      {
        n: 3,
        text: 'P1928 把 Parallelism TS2 的 std::experimental::simd 扶正為標準 std::simd，兩者語意大致延續但命名空間不同。',
      },
      {
        n: 4,
        text: 'P0019 定義 std::atomic_ref，是本表中最早定案、語意最穩定的一份提案，已隨 C++20 併入標準。',
      },
      {
        n: 5,
        text: '提案編號後常跟著修訂版本（RN），同一編號不同版本的 API 細節可能不同，只寫編號不寫版本容易誤用過時內容。',
      },
      {
        n: 6,
        text: '對不確定的提案編號誠實標註「請查 wg21.link 最新清單」，遠比給出一個看似精確卻可能錯誤的編號更負責任。',
      },
    ],
  },
  pitfalls: [
    '把某編譯器的實驗性命名空間（如 `std::experimental::simd`）誤當成最終標準化的 API：實驗性命名空間往往先於標準定案存在，介面細節可能在提案定案前持續調整，兩者不能直接劃上等號。',
    '引用一份提案編號時不附版本號（如只寫「P2300」而不寫「P2300R10」），導致讀者查到的是早期、已被大幅修改甚至語意不同的版本內容。',
    '假設所有 WG21 提案都會維持原本的編號與範疇：提案在審議過程中可能被拆分、合併或改編號，若只憑記憶轉述而不重新查證，容易散播過時資訊。',
    '把部落格文章或社群問答當作某提案「目前狀態」的權威來源：這些文章往往反映撰寫當下的快照，提案審議進度變動後未必會更新，應以 wg21.link 與 cppreference 的即時內容為準。',
    '誤以為提案「已提交」等同「已成為標準的一部分」：提案生命週期包含提出、多輪修訂、委員會投票，只有投票通過併入標準草案後才算真正定案，讀者應留意提案文件中標註的狀態。',
  ],
  bestPractices: [
    '引用任何標準提案時，同時查閱 wg21.link 上對應編號的最新修訂版本，並在筆記中記下查閱當下的版本號（如 R10），避免日後對照時發生版本混淆。',
    '判斷某個新語法或型別能否在目前工具鏈使用時，優先查 cppreference 的「編譯器支援」表格，而不是依賴部落格文章或社群討論的印象——支援表格通常會逐版更新且附上明確的編譯器版本號。',
    '學習尚未定案的提案（如仍在 senders/receivers 審議中的細節）時，搭配官方參考實作（如 stdexec）閱讀原始碼，比只讀提案文字更能掌握實際語意與邊界案例。',
    '把經典書籍（如《C++ Concurrency in Action》）當作打基礎與查閱實務細節的來源，把 wg21.link 與 cppreference 當作追蹤最新語法與提案狀態的來源，兩者角色互補而非互相取代。',
    '在自己的專案文件或程式碼註解中引用標準提案時，附上完整連結（如 `https://wg21.link/p2300`）而非僅寫編號，方便未來的維護者或自己快速查證。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '想確認某個 C++ 標準提案（例如 P2300）目前最新的修訂內容，最可靠的作法是什麼？',
      options: [
        { id: 'a', text: '搜尋任何提及該提案編號的部落格文章，內容通常都是最新的' },
        {
          id: 'b',
          text: '直接到 wg21.link 加上該提案編號（如 wg21.link/p2300），查看官方文件庫中最新版本的原文',
        },
        { id: 'c', text: '只要記得提案編號就不需要再查閱，內容不會隨版本變動' },
        { id: 'd', text: '以最早聽說這個提案時的印象為準即可' },
      ],
      correctOptionId: 'b',
      explanation:
        'wg21.link 是查閱 WG21 提案原文最直接可靠的入口，加上提案編號即可跳轉到官方文件庫中該提案的最新版本；提案內容常隨審議進度修訂，僅憑印象或部落格轉述容易得到過時或不準確的資訊。',
    },
    {
      id: 'q2',
      stem: '判斷某個 C++26 新語法目前是否能在自己使用的編譯器上實際編譯，最適合查閱的資源是？',
      options: [
        { id: 'a', text: '該語法對應提案文件裡的動機（motivation）章節' },
        {
          id: 'b',
          text: 'cppreference.com 上該功能頁面的「編譯器支援」表格，並對照自己使用的編譯器版本',
        },
        { id: 'c', text: '任何搜尋引擎排名第一的文章，不需要看發布日期' },
        { id: 'd', text: '猜測所有主流編譯器進度一致，不需要個別查證' },
      ],
      correctOptionId: 'b',
      explanation:
        'cppreference 的編譯器支援表格會逐版更新並列出各編譯器（GCC/Clang/MSVC）開始支援某功能的具體版本號，是判斷「此刻能不能用」最直接可靠的依據；提案文件的動機章節說明的是設計理由而非實作進度。',
    },
    {
      id: 'q3',
      stem: '如果不確定某個構造（例如某個協程輔助設施）的確切提案編號，較負責任的作法是什麼？',
      options: [
        { id: 'a', text: '直接寫出一個記憶中相似的編號，反正讀者不會查證' },
        {
          id: 'b',
          text: '誠實標註「確切編號請查閱 wg21.link 最新論文清單」，並鼓勵讀者自行查證，而不是給出未經確認的編號',
        },
        { id: 'c', text: '略過提案編號不談，也不建議任何查證方式' },
        { id: 'd', text: '直接假設它與最相近的另一個提案共用編號' },
      ],
      correctOptionId: 'b',
      explanation:
        '在不確定精確編號時，誠實引導讀者到 wg21.link 的最新論文索引自行查證，遠比給出一個可能錯誤的編號更負責任；捏造或猜測編號會誤導讀者，且可能因提案拆分、改號而完全失效。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['標準提案', '經典書籍', '線上參考', '延伸閱讀'],
    caption:
      '四類參考資料互為補充：標準提案定義精確語意與狀態，經典書籍打基礎與補理論，線上參考追蹤最新支援狀況，延伸閱讀連回全書各章節對應主題。',
  },
  tryIt: {
    code: `// A simplified lookup table: a small utility function that maps construct names to proposal numbers.
#include <iostream>
#include <string>
#include <unordered_map>

int main() {
    const std::unordered_map<std::string, std::string> paperOf{
        {"std::execution", "P2300"},
        {"std::linalg", "P1673"},
        {"std::simd", "P1928"},
        {"std::atomic_ref", "P0019"},
    };

    for (const auto& construct : {"std::execution", "std::simd", "std::atomic_ref"}) {
        auto it = paperOf.find(construct);
        if (it != paperOf.end()) {
            std::cout << construct << " -> " << it->second << " (see wg21.link/" << it->second
                      << ")\\n";
        }
    }
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'P2300 — std::execution',
      href: 'https://wg21.link/p2300',
      description: 'senders/receivers 與 std::execution 的正式提案文件，第 45 章的主要標準依據。',
    },
    {
      title: 'P1673 — A free function linear algebra interface based on the BLAS',
      href: 'https://wg21.link/p1673',
      description: 'std::linalg 的正式提案文件，第 55 章矩陣／線性代數運算的主要標準依據。',
    },
    {
      title: 'P1928 — std::simd — Merge data-parallel types from the Parallelism TS2',
      href: 'https://wg21.link/p1928',
      description: 'std::simd 的正式提案文件，第 46 章資料平行型別的主要標準依據。',
    },
    {
      title: 'cppreference.com — C++ reference',
      href: 'https://en.cppreference.com/w/cpp',
      description: '社群維護的標準函式庫線上參考，含逐版更新的編譯器支援狀態表格。',
    },
    {
      title: 'isocpp.org — Standard C++ Foundation',
      href: 'https://isocpp.org/',
      description: 'C++ 標準委員會官方入口，追蹤標準演進大局與委員會動態的起點。',
    },
  ],
};

export default appendixDReferences;
