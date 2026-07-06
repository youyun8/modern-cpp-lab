import type { ChapterContent } from '@/types/ChapterContent';

const ch19ChronoCore: ChapterContent = {
  slug: 'ch19.5-chrono-core',
  chapterLabel: '第 19.5 章',
  title: 'Chrono 核心：duration、time_point、clock 與 std::ratio',
  group: '第 4 部：STL 與工具庫',
  description:
    'std::chrono 的根基：duration、time_point、三種 clock 與 std::ratio；量測、排程、timeout 與平行程式中的時間計算。',
  concept: {
    standard: 'C++20',
    body: 'std::chrono 是 C++ 處理時間的型別安全系統。核心是三個概念：duration 表示「一段時間長度」，由數值與 ratio（時間單位比率）組成，例如 std::chrono::seconds 是 duration<int64_t, ratio<1,1>>；time_point 表示「某個 clock 上的某個時刻」，由 clock 型別與 duration 組成；clock 則提供 now() 與時間屬性。system_clock 對應 wall-clock 時間，steady_clock 保證永不倒退，high_resolution_clock 則是系統上最高精度的 clock（可能是前兩者的 alias）。std::ratio 是編譯期有理數，用以定義 duration 的單位比率。chrono 的價值在於「型別安全的時間運算」：不能把 milliseconds 誤當 seconds 用，timeout 設定也不會因單位錯誤而差 1000 倍。',
  },
  code: {
    lang: 'cpp',
    code: `#include <chrono>
#include <iostream>
#include <ratio>
#include <thread>

using namespace std::chrono;

// duration is a compile-time type-safe length of time. [1]
using FrameRate = duration<int64_t, std::ratio<1, 60>>;     // 1/60 second
using SampleRate = duration<int64_t, std::ratio<1, 48000>>;   // 1/48000 second

// time_point binds a specific clock and duration together. [2]
time_point<steady_clock, milliseconds> last_tick;  // used to measure elapsed time with steady_clock

void measureLoop() {
    auto start = steady_clock::now();  // [3]

    std::this_thread::sleep_for(150ms);  // [4] literal operator: 150 milliseconds

    auto end = steady_clock::now();
    auto elapsed = duration_cast<milliseconds>(end - start);  // [5]
    std::cout << "elapsed = " << elapsed.count() << " ms\\n";
}

// ratio is used to define fine-grained custom time units. [6]
template <typename Rep, intmax_t Num, intmax_t Den>
using DurationWithRatio = duration<Rep, ratio<Num, Den>>;

// use system_clock to get wall-clock time. [7]
auto getTimestamp() {
    auto tp = system_clock::now();
    return system_clock::to_time_t(tp);  // convert to time_t
}

// mixing different duration types forces the compiler to require a unit conversion. [8]
void scheduleWork() {
    milliseconds ms{3000};
    seconds sec = duration_cast<seconds>(ms);  // [9]
    nanoseconds ns = ms;                       // [10] implicit widening, no loss of precision
    std::cout << sec.count() << " sec, " << ns.count() << " ns\\n";
}

// compare two time_points. [11]
bool isExpired(time_point<steady_clock> deadline) {
    return steady_clock::now() >= deadline;
}

int main() {
    measureLoop();
    scheduleWork();

    auto now = system_clock::now();
    auto deadline = now + 500ms;  // [12]
    std::cout << "deadline in 500ms: "
              << duration_cast<milliseconds>(deadline - now).count() << " ms\\n";

    // high_resolution_clock is usually finer-grained than steady_clock, but is not guaranteed to never go backwards. [13]
    auto hrc_now = high_resolution_clock::now();
    (void)hrc_now;

    return 0;
}`,
    callouts: [
      {
        n: 1,
        text: 'duration 由 Rep（數值型別）與 Period（ratio 單位）組成；不同 ratio 的 duration 不能隱式混用。',
      },
      {
        n: 2,
        text: 'time_point 的第一個樣板參數是 clock，第二個是 duration；type-safe 的時間點，不會把不同 clock 的時刻搞混。',
      },
      {
        n: 3,
        text: 'steady_clock::now() 回傳 time_point，保證連續呼叫的數值永不倒退，適合量測。',
      },
      {
        n: 4,
        text: '字面值運算子 150ms 是 C++14 起可用的 duration 字面值；三種單位可混用：ms、s、min、ns、us、h。',
      },
      {
        n: 5,
        text: 'duration_cast 強制截斷轉換；若不想截斷可用 floor、ceil、round（C++17）。',
      },
      {
        n: 6,
        text: 'ratio<Num, Den> 是編譯期有理數，自動約分；用於自定義非標準單位（如音訊採樣週期）。',
      },
      {
        n: 7,
        text: 'system_clock 與 steady_clock 可能不同型別；system_clock 可轉為 time_t，適合日誌時間戳。',
      },
      {
        n: 8,
        text: '混用 seconds 與 milliseconds 時編譯器要求顯式轉換（如 duration_cast），防止單位錯誤。',
      },
      {
        n: 9,
        text: 'duration_cast<seconds>(3000ms) 會截斷到小數秒，結果為 3s。',
      },
      {
        n: 10,
        text: '從粗粒度轉到細粒度（ms -> ns）是安全的隱式轉換，不會遺失精度。',
      },
      {
        n: 11,
        text: 'time_point 支援比較與算術運算，前提是使用同一種 clock，否則型別系統會阻擋。',
      },
      {
        n: 12,
        text: 'time_point + duration 的結果仍是同型別 time_point，型別安全地推移時間點。',
      },
      {
        n: 13,
        text: 'high_resolution_clock 不一定是獨立實作，常是 steady_clock 或 system_clock 的 alias。',
      },
    ],
  },
  deepDive: [
    {
      heading: '三種 Clock 的實務選擇',
      body: 'system_clock 對應作業系統的 wall-clock 時間，受 NTP 調校影響，可能前後跳動，適合日誌時間戳與與外部系統對時。steady_clock 保證呼叫間的差值永不倒退（通常用 monotonic clock 實作），適合 timeout、量測與演算法內的時間差計算。high_resolution_clock 未定義是否 steady，在實作上可能是 steady_clock 或 system_clock 的 alias，因此不建議單獨依賴它——量測用 steady_clock，wall-clock 用 system_clock。跨平台程式可用 clock_gettime(CLOCK_MONOTONIC) 作為 steady_clock 的 POSIX 對應。',
    },
    {
      heading: 'duration_cast、floor、ceil、round',
      body: 'duration 轉換時，精度會因截斷而改變。duration_cast 是截斷向零的行為，對於 timeout 計算可能差一秒。C++17 加入 floor、ceil、round，讓數值轉換更精確。例如 floor<seconds>(1500ms) 得 1s，ceil<seconds>(1500ms) 得 2s，round<seconds>(1500ms) 得 2s。在排程系統中，timeout 邊界的處理直接影響正確性，應選用合適的捨入策略而非一概 duration_cast。',
    },
    {
      heading: '並行與 timeout：condition_variable::wait_for',
      body: '條件變數的 wait_for 接受 duration、wait_until 接受 time_point。常見錯誤是用 system_clock 計算時間點——若等待期間 NTP 跳回，wait_until 會永遠等不到。正確做法是用 steady_clock 計算 deadline，再傳入 condition_variable_any（C++20 起支援任意 clock）或把 steady_clock 轉換後使用。std::jthread 與 std::stop_token 的 timeout 版本函式也使用 chrono duration，確保單位正確性。',
    },
    {
      heading: 'std::ratio 與自定義時間單位',
      body: 'chrono 的 duration 建立在 std::ratio 之上，ratio<1, 1000> 表示千分之一。除了標準單位（ratio<1> 為秒、ratio<1,1000> 為毫秒），你可以建立自定義單位：using FrameTick = duration<int64_t, ratio<1, 60>>; 表示 1/60 秒。ratio 會在編譯期約分，因此 ratio<2, 4> 等同 ratio<1, 2>。對於頻率、週期等需要精確有理數轉換的場景，ratio 的編譯期計算能力讓不同單位間的轉換完全型別安全，無需執行期浮點運算。',
    },
  ],
  pitfalls: [
    '用 system_clock 計算 timeout deadline，NTP 調校導致時間倒退，讓 wait_until 永遠等不到。',
    '混用 high_resolution_clock 與 steady_clock 的 time_point，型別系統雖會阻止，但透過 time_since_epoch().count() 強制轉換後失去型別安全與 steady 保證。',
    'duration_cast 截斷導致 timeout 邊界差一個單位；精確排程應用 floor/ceil/round。',
    '以浮點數 ratio（如 duration<double, ratio<1>>）做計算時，累積浮點誤差導致時序錯位。',
    '忘記不同執行緒上 steady_clock 的 now() 可能從不同 epoch 開始，只比較 time_since_epoch().count() 沒有意義。',
    '把 chrono duration 混用 with C 的 time_t 或 timeval，沒有經過明確確轉換，導致單位錯誤（毫秒 vs 微秒 vs 奈秒）。',
  ],
  bestPractices: [
    '量測與 timeout 一律使用 steady_clock，避免 wall-clock 跳動造成邏輯錯誤。',
    '日誌與外部時間戳用 system_clock，可安全轉換為 time_t 或字串。',
    '不要單獨依賴 high_resolution_clock 的穩定語意，它可能是 alias。',
    'timeout 轉換使用 floor/ceil/round 明確指定邊界行為，避免 duration_cast 的截斷誤差。',
    '把 chrono duration 傳入 API（如 condition_variable、sleep_for）而不是裸整數，確保單位有編譯期保護。',
  ],
  quiz: [
    {
      id: 'q1',
      stem: '量測兩點之間的經過時間時，應選用哪一種 clock？',
      options: [
        { id: 'a', text: 'system_clock，因為它對應 wall-clock 時間' },
        { id: 'b', text: 'steady_clock，因為它保證連續呼叫的時間永不倒退' },
        { id: 'c', text: 'high_resolution_clock，因為它的精度總是最高的' },
        { id: 'd', text: '三個完全相同，可以任意互換' },
      ],
      correctOptionId: 'b',
      explanation:
        'steady_clock（通常對應 monotonic clock）保證連續呼叫產生的 time_point 永不倒退，適合量測與 timeout；system_clock 會受 NTP 調校影響。',
    },
    {
      id: 'q2',
      stem: 'seconds sec = duration_cast<seconds>(1500ms); 的結果是什麼？',
      options: [
        { id: 'a', text: '2s，因為四捨五入' },
        { id: 'b', text: '1s，因為 duration_cast 是截斷（向零）' },
        { id: 'c', text: '1500s，因為把整數當成秒' },
        { id: 'd', text: '編譯錯誤，不同 duration 型別不能轉換' },
      ],
      correctOptionId: 'b',
      explanation:
        'duration_cast 是截斷轉換（向零），1500ms = 1.5s 截斷後為 1s；若要四捨五入需用 round<seconds>(1500ms)。',
    },
    {
      id: 'q3',
      stem: '為什麼在多執行緒的 timeout 計算中，不建議使用 system_clock？',
      options: [
        { id: 'a', text: 'system_clock 不支援 std::chrono::time_point' },
        {
          id: 'b',
          text: 'system_clock 對應 wall-clock，可能因 NTP 或其他調校而前後跳動，導致 wait_until 邏輯錯誤',
        },
        { id: 'c', text: 'system_clock 的精度比 steady_clock 低' },
        { id: 'd', text: 'system_clock 不支援 now() 成員函式' },
      ],
      correctOptionId: 'b',
      explanation:
        'system_clock 受作業系統 wall-clock 影響，NTP 校正可能導致時間跳回，造成「明明已過 deadline 卻沒被喚醒」的錯誤；timeout 應使用 steady_clock。',
    },
  ],
  diagram: {
    key: 'generic-flow',
    nodes: ['steady_clock', 'time_point', 'duration', 'timeout/wait'],
    caption:
      'chrono 流程：steady_clock::now() 產生 time_point，duration 表示時間長度，兩者組合形成 timeout 與排程判斷。',
  },
  tryIt: {
    code: `#include <chrono>
#include <iostream>
#include <thread>

using namespace std::chrono;

int main() {
    auto start = steady_clock::now();
    std::this_thread::sleep_for(200ms);
    auto elapsed = duration_cast<milliseconds>(steady_clock::now() - start);
    std::cout << "elapsed = " << elapsed.count() << " ms\\n";

    auto now = steady_clock::now();
    auto deadline = now + 500ms;
    std::cout << "timeout in 500ms = "
              << (now >= deadline ? "expired" : "pending") << "\\n";
    return 0;
}`,
  },
  furtherReading: [
    {
      title: 'std::chrono - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/chrono',
      description: 'duration、time_point、clock 與 calendar 的完整參考。',
    },
    {
      title: 'std::ratio - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/numeric/ratio',
      description: '編譯期有理數，duration 的單位比率基礎。',
    },
    {
      title: 'std::steady_clock - cppreference.com',
      href: 'https://en.cppreference.com/w/cpp/chrono/steady_clock',
      description: ' monotonic clock 的性質、now() 與 timeout 使用建議。',
    },
  ],
};

export default ch19ChronoCore;
