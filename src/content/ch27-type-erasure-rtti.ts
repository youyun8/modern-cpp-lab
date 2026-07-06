import type { ChapterContent } from '@/types/ChapterContent';

const ch27TypeErasureRtti: ChapterContent = {
  slug: 'ch27-type-erasure-rtti',
  chapterLabel: '第 27.1 章',
  title: 'Type Erasure 與 RTTI',
  group: '第 7 部：軟體設計與工具',
  description:
    'std::function、std::any、typeid、std::type_index、dynamic_cast 與自製型別抹除：在執行期隱藏型別而保留介面。',
  concept: {
    standard: 'C++20',
    body: 'Type erasure（型別抹除）把具體型別藏在統一介面背後：`std::function` 可保存任何符合簽章的 callable，`std::any` 可保存任意可複製型別，`std::shared_ptr<Base>` 或自製 erased wrapper 可在執行期以虛擬表操作未知型別。它與 template/CRTP 的靜態多型相反：換來 ABI 穩定、較小的公開型別與 runtime 彈性，代價是間接呼叫、可能的 heap 配置與較晚的錯誤。RTTI（`typeid`、`std::type_info`、`dynamic_cast`）提供執行期型別查詢與安全向下轉型；應用在 plugin、序列化、debug 與異質容器時有價值，但不應取代清楚的多型介面或 visitor 設計。',
  },
  code: {
    lang: 'cpp',
    code: `#include <any>
#include <functional>
#include <iostream>
#include <string>
#include <typeindex>
#include <unordered_map>

class EventBus {
    std::unordered_map<std::type_index, std::function<void(const std::any&)>> handlers_;

   public:
    template <typename T, typename F>
    void on(F&& f) {
        handlers_[std::type_index(typeid(T))] =  // [1]
            [fn = std::forward<F>(f)](const std::any& payload) {
                fn(std::any_cast<const T&>(payload));  // [2]
            };
    }

    template <typename T>
    void emit(const T& value) const {
        if (auto it = handlers_.find(std::type_index(typeid(T))); it != handlers_.end()) {
            it->second(std::any{value});  // [3]
        }
    }
};

int main() {
    EventBus bus;
    bus.on<std::string>([](const std::string& s) {
        std::cout << "message: " << s << "\\n";
    });
    bus.emit(std::string{"hello erased world"});
}`,
    callouts: [
      { n: 1, text: '`typeid(T)` 取得型別資訊；`std::type_index` 讓它可作為 unordered_map key。' },
      { n: 2, text: '`std::any_cast` 在執行期檢查 payload 型別，不符會丟 `bad_any_cast`。' },
      { n: 3, text: '`std::any` 抹除事件 payload 的具體型別，但可能配置且需要可複製值。' },
    ],
  },
  deepDive: [
    {
      heading: 'std::function 的成本模型',
      body: '`std::function<R(Args...)>` 以型別抹除保存 callable，呼叫時通常經過間接跳轉；小型 callable 可能放入 small buffer，較大捕獲則 heap 配置。它適合保存回呼、事件處理器與 ABI 邊界，不適合內層熱迴圈的每元素操作。\n\n熱路徑可改用 template 參數、`auto&&` callable、或非擁有 `function_ref` 類型（標準化進度依版本而定）降低間接與配置成本。',
    },
    {
      heading: 'std::any、variant 與虛擬介面',
      body: '`std::any` 適合真正開放集合：型別集合不固定，使用端需在執行期檢查。若可能型別集合封閉，`std::variant` 更安全，因為 visitor 可涵蓋所有情況且不需要 RTTI 查詢。若所有型別共享行為，虛擬基底介面通常比 any 更清楚。\n\n選擇順序可簡化為：封閉資料集合用 variant；共享行為用 virtual/type erasure interface；完全開放且少量使用才用 any。',
    },
    {
      heading: 'RTTI 與 dynamic_cast',
      body: '`dynamic_cast` 在多型階層中做安全向下轉型，指標失敗回傳 `nullptr`，參考失敗丟 `std::bad_cast`。它依賴 RTTI，跨 shared library 邊界時需確保型別資訊可見且 ABI 一致。\n\n頻繁 `dynamic_cast` 通常表示設計想要 visitor、virtual 函式或 variant。RTTI 是工具，不應成為主要控制流程。',
    },
  ],
  pitfalls: [
    '在熱路徑使用 `std::function`，引入間接呼叫與可能配置。',
    '用 `std::any` 表示封閉型別集合，失去 `variant` 的編譯期窮盡檢查。',
    '大量 `dynamic_cast` 分支取代虛擬函式或 visitor，讓設計脆弱。',
    '在關閉 RTTI 的編譯設定下使用 `typeid`／`dynamic_cast`，導致不可攜或無法編譯。',
  ],
  bestPractices: [
    '封閉型別集合用 `std::variant`，開放 callable 用 `std::function`，共享行為用虛擬介面。',
    '熱路徑優先 template/CRTP；模組邊界與 callback registry 才使用 type erasure。',
    '使用 `std::any` 時集中做 type check，避免 `any_cast` 散落各處。',
    '把 RTTI 當作邊界工具或診斷工具，不要讓它取代主要抽象。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '`std::function` 的主要用途是什麼？',
      options: [
        { id: 'a', text: '保存任何符合指定函式簽章的 callable，並抹除其具體型別' },
        { id: 'b', text: '保存任意大小的二進位檔案' },
        { id: 'c', text: '自動把函式改成 constexpr' },
        { id: 'd', text: '取代所有 template' },
      ],
      correctOptionId: 'a',
      explanation: '`std::function<R(Args...)>` 是 callable 的型別抹除容器，適合回呼與延遲呼叫。',
    },
    {
      id: 'q2',
      stem: '封閉的少數幾種型別要做窮盡處理時，通常比 `std::any` 更好的選擇是？',
      options: [
        { id: 'a', text: '`std::variant` 搭配 `std::visit`' },
        { id: 'b', text: 'void*' },
        { id: 'c', text: '全域變數' },
        { id: 'd', text: '`reinterpret_cast`' },
      ],
      correctOptionId: 'a',
      explanation: '`variant` 把可能型別寫進型別系統，visitor 可在編譯期協助涵蓋所有情況。',
    },
    {
      id: 'q3',
      stem: '`dynamic_cast<Derived*>(base)` 失敗時會如何？',
      options: [
        { id: 'a', text: '回傳 nullptr' },
        { id: 'b', text: '未定義行為' },
        { id: 'c', text: '回傳 base 原指標' },
        { id: 'd', text: '自動建立 Derived 物件' },
      ],
      correctOptionId: 'a',
      explanation:
        '對指標使用 `dynamic_cast` 向下轉型失敗時回傳 `nullptr`；對參考失敗則丟 `std::bad_cast`。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['具體型別', 'erased wrapper', 'invoke/cast', '執行期分派'],
    caption: '型別抹除：具體型別被包進統一 wrapper，使用端透過保存的操作表或 RTTI 在執行期分派。',
  },
  tryIt: {
    code: `#include <functional>
#include <iostream>
#include <string>

int main() {
    std::function<void(std::string)> log = [](std::string s) {
        std::cout << s << '\\n';
    };
    log("type erased callable");
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::function - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/utility/functional/function',
      description: '標準 callable 型別抹除包裝器。',
    },
    {
      title: 'std::any - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/utility/any',
      description: '任意可複製型別的型別安全容器。',
    },
    {
      title: 'dynamic_cast - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/language/dynamic_cast',
      description: '多型階層中的執行期安全轉型。',
    },
  ],
};

export default ch27TypeErasureRtti;
