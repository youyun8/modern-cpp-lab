import type { ChapterContent } from '@/types/ChapterContent';

const ch21AdvancedI: ChapterContent = {
  slug: 'ch21-advanced-i',
  chapterLabel: 'Ch.21',
  title: '進階主題 I：Move 語意',
  group: 'E · 進階 C++',
  description:
    'Move 語意、universal references 與型別推導規則：如何以移動避免不必要複製，並正確做完美轉發。',
  concept: {
    standard: 'C++23',
    body:
      'Move 語意讓資源（如 heap 緩衝區）從一個物件「轉移」到另一個，而非昂貴地複製。右值參考 T&& 可繫結到暫時值；std::move 只是把左值轉型為右值參考，讓移動建構／指定得以被選用，本身不搬移任何東西。在樣板中，T&& 是「轉發參考」（forwarding／universal reference），依引數是左值或右值分別推導為 T& 或 T&&，這就是引數推導與參考塌陷的結果。std::forward<T> 依此保留原本的值類別，達成完美轉發。要點：移動後來源處於「有效但未指定」狀態，不應再依賴其值；移動成員應標記 noexcept，容器才會採用移動；回傳區域變數時編譯器多會 RVO／NRVO 省略複製，不必手動 std::move。',
  },
  code: {
    lang: 'cpp',
    code: `#include <print>
#include <string>
#include <utility>
#include <vector>

// 轉發參考 + std::forward：完美轉發保留左值／右值類別。 [1]
template <typename T>
void addTo(std::vector<std::string>& out, T&& value) {
    out.push_back(std::forward<T>(value));  // [2]
}

std::string makeName() { return std::string(1000, 'x'); }  // 大字串

int main() {
    std::vector<std::string> names;
    std::string lv = "left";
    addTo(names, lv);          // [3] T 推導為 std::string&（左值 → 複製）
    addTo(names, makeName());  // [4] T 推導為 std::string（右值 → 移動）

    std::string a = "hello";
    std::string b = std::move(a);  // [5] a 進入有效但未指定狀態
    std::println("b={}, count={}", b, names.size());
    return 0;
}`,
    callouts: [
      { n: 1, text: '在樣板中，T&& 是轉發參考：依實際引數推導為左值或右值參考（參考塌陷）。' },
      { n: 2, text: 'std::forward<T> 依 T 的推導結果還原原本的值類別，左值仍複製、右值可移動。' },
      { n: 3, text: '傳入具名左值 lv 時，T 推導為 std::string&，push_back 執行複製。' },
      { n: 4, text: '傳入暫時值時，T 推導為 std::string，forward 產生右值，push_back 執行移動。' },
      { n: 5, text: 'std::move 只是轉型；移動後 a 為有效但未指定狀態，除非重新賦值否則不應使用其值。' },
    ],
  },
  deepDive: [
    {
      heading: '值類別、參考塌陷與轉發參考',
      body:
        '運算式分為 lvalue、xvalue、prvalue 三類值類別。在型別推導脈絡中 `T&&` 是轉發參考，透過參考塌陷（`& && -> &`、`&& && -> &&`）依引數推導；非推導脈絡的 `T&&`（如 `std::vector<T>::push_back(T&&)`）則是純右值參考。\n\n區分這兩者是正確使用 `std::forward` 的前提：只有在轉發參考上才該用 `forward`，在具體右值參考上通常用 `std::move`。',
    },
    {
      heading: '複製省略、RVO 與回傳',
      body:
        'C++17 起，回傳 prvalue 的複製省略是強制的（guaranteed copy elision）；NRVO（回傳具名區域變數）則是允許但非強制的最佳化。對 `return local;` 加 `std::move` 通常是反效果——它會阻止 NRVO 並可能變慢。\n\nmove-only 型別（如 `unique_ptr`）依賴移動語意在容器與函式間轉移所有權；設計 API 時以值 + 移動傳遞匯參數，兼顧彈性與效率。',
    },
    {
      heading: 'noexcept、容器與被移動狀態',
      body:
        '移動建構／指定應標 `noexcept`；否則 `std::vector` 擴容時為維持強例外保證會退回複製，喪失移動效益。標準型別被移動後處於「有效但未指定」狀態，可解構或重新賦值，但不應依賴其值。\n\n自我移動（`x = std::move(x)`）對多數標準型別是允許但結果未指定的；自訂型別應確保至少不會損毀。',
    },
  ],
  pitfalls: [
    '對 `return local;` 加 `std::move`，阻止 NRVO 反而變慢。',
    '使用被移動後物件的值（而非重新賦值），得到未指定結果。',
    '移動操作未標 `noexcept`，導致容器擴容時退回複製。',
    '對 `const` 物件呼叫 `std::move`，靜默退回複製（const 無法被移動）。',
  ],
  bestPractices: [
    '移動建構／指定一律標 `noexcept`（若確實不拋）。',
    '回傳區域變數時直接 `return local;`，不要手動 `std::move`。',
    '僅在轉發參考上用 `std::forward`；具體右值參考用 `std::move`。',
    '被移動物件視為僅可重新賦值或解構；API 以值 + 移動傳遞匯參數。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: 'std::move 實際上做了什麼？',
      options: [
        { id: 'a', text: '立即搬移物件的資源' },
        { id: 'b', text: '把左值無條件轉型為右值參考，讓移動操作得以被選用' },
        { id: 'c', text: '複製物件' },
        { id: 'd', text: '釋放物件的記憶體' },
      ],
      correctOptionId: 'b',
      explanation:
        'std::move 本身不搬移任何東西，只是把運算式轉型為右值參考，使得移動建構／指定成為可行的多載。參見 Ch.21 PDF 第 24 頁。',
    },
    {
      id: 'q2',
      stem: '在函式樣板 template<typename T> void f(T&& x) 中，T&& 稱為？',
      options: [
        { id: 'a', text: '固定的右值參考，只能繫結暫時值' },
        { id: 'b', text: '轉發參考（forwarding reference），依引數推導為左值或右值參考' },
        { id: 'c', text: '左值參考' },
        { id: 'd', text: '常數參考' },
      ],
      correctOptionId: 'b',
      explanation:
        '在型別推導脈絡下的 T&& 是轉發參考，透過參考塌陷依引數的值類別推導；配合 std::forward 可完美轉發。參見 Ch.21 PDF 第 38 頁。',
    },
    {
      id: 'q3',
      stem: '一個物件被 move 之後，處於什麼狀態？',
      options: [
        { id: 'a', text: '已被銷毀，任何存取都是 UB' },
        { id: 'b', text: '有效但未指定（valid but unspecified），可重新賦值但不應依賴其原值' },
        { id: 'c', text: '一定變成 nullptr' },
        { id: 'd', text: '與移動前完全相同' },
      ],
      correctOptionId: 'b',
      explanation:
        '標準規定被移動後的物件處於有效但未指定狀態：可安全解構或重新賦值，但不應依賴其具體值。參見 Ch.21 PDF 第 45 頁。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['lvalue', 'rvalue', 'std::move', 'forwarding'],
    caption:
      'Move 與轉發：區分左值與右值，std::move 轉型以啟用移動，std::forward 在樣板中完美保留值類別。',
  },
  tryIt: {
    code: `#include <iostream>
#include <string>
#include <utility>

int main() {
    std::string a = "hello world";
    std::string b = std::move(a);  // 移動而非複製
    std::cout << "b = " << b << '\\n';
    std::cout << "a.size() after move = " << a.size() << " (有效但未指定)\\n";
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::move - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/utility/move',
      description: 'std::move 的語意與正確用法。',
    },
    {
      title: 'std::forward - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/utility/forward',
      description: '完美轉發與轉發參考的規則。',
    },
    {
      title: 'Modern C++ Programming — Advanced Topics I (slides)',
      href: 'https://federico-busato.github.io/Modern-CPP-Programming/htmls/21.Advanced_topics_I.html',
      description: 'Busato 課程第 21 章 HTML 投影片，涵蓋 move 語意原文。',
    },
  ],
};

export default ch21AdvancedI;
