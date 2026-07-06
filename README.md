# 現代 C++ 平行程式設計學習網站

> Modern C++ Programming — an interactive learning site focused on parallelism, concurrency & performance optimization.

以 [Federico Busato 的「Modern C++ Programming」課程](https://github.com/federico-busato/Modern-CPP-Programming)
為藍本的互動式繁體中文學習網站。課程完整保留原始的 29 章編號，並以**平行化、並行與效能最佳化**作為編輯重心。

網站以 Next.js 14（App Router、TypeScript、Tailwind CSS）建置，透過 `output: 'export'`
產生純靜態網頁並部署至 GitHub Pages，執行期不需任何後端或 API 呼叫。

---

## 專案簡介

- **課程對應**：29 章依主題分為 7 個側邊欄群組（基礎概念、物件導向與泛型、建置系統與慣例、STL 與工具庫、進階 C++、效能最佳化、軟體設計與工具）。每頁保留原始章節編號（如 `Ch.22`），方便對照課程 PDF 投影片。
- **平行化實驗室**：另有五個深入專頁（記憶體模型、無鎖資料結構、平行 STL、協程、CPU–GPU 橋接）。
- **六面板版面**：每頁包含「概念卡片、程式碼區塊、互動測驗、視覺圖表、試試看、延伸閱讀」。
- **互動視覺化**：全部以 React SVG/Canvas 元件實作，包括執行緒時間軸、記憶體階層階梯、快取行視覺化，以及可拖曳滑桿的 Amdahl 定律加速曲線。
- **完整實作頁面**：`Ch.22 並行程式設計`、`Ch.23 架構與記憶體階層`、`/lab/parallel-stl`、`/lab/memory-model`。其餘章節與實驗室頁面為佔位頁（路由與版面已就緒）。

技術堆疊：Next.js 14、TypeScript（strict）、Tailwind CSS（class 深色模式）、
Zustand（`quizSlice` + `uiSlice`）、shiki（語法高亮）、CodeMirror 6（唯讀編輯器）。

---

## 本地開發

需求：Node.js 20 以上。

```bash
npm install      # 安裝相依套件
npm run dev      # 啟動開發伺服器（http://localhost:3000）
```

側邊欄可切換章節，右上角可切換深色／淺色主題。

---

## 靜態建置

```bash
npm run validate # 驗證內容檔中的所有連結
npm run build    # 產生靜態網站至 out/
```

建置產物位於 `out/`。若要在本機預覽，可用任意靜態伺服器（例如 `npx serve out`）。

> 網站預設以 GitHub Pages 的子路徑 `/cpp-parallel-lab` 為 `basePath`。
> 若部署到不同的儲存庫名稱，請以環境變數覆寫：
>
> ```bash
> NEXT_PUBLIC_BASE_PATH=/your-repo npm run build
> ```

---

## 部署至 GitHub Pages

本專案內附 GitHub Actions 工作流程 `.github/workflows/deploy.yml`，
於推送至 `main` 分支時自動執行「安裝 → 驗證連結 → 建置 → 部署至 `gh-pages` 分支」。

首次啟用步驟：

1. 於 GitHub 儲存庫 **Settings → Pages** 將來源設定為 `gh-pages` 分支。
2. 確認 `NEXT_PUBLIC_BASE_PATH` 與儲存庫名稱一致（預設 `/cpp-parallel-lab`）。
3. 推送到 `main`，等待 Actions 完成後即可透過 `https://<帳號>.github.io/<儲存庫>/` 瀏覽。

也可在本機手動建置：

```bash
npm run deploy   # 等同於 build，並額外建立 out/.nojekyll
```

---

## 內容貢獻指南

所有面向使用者的文字皆須為**繁體中文**；程式碼片段、行內 `code`、程式碼註解（維持英文）
與標準名稱（如 `std::atomic`、`Amdahl's Law`、`RAII`）則不翻譯。

要補齊佔位頁面或新增章節：

1. 編輯或新增 `src/content/<slug>.ts`，匯出一個 `ChapterContent` 物件。
   - 六個面板：`concept`、`code`（含 `// [n]` 標註對應 `callouts`）、`quiz`、`diagram`、`tryIt`、`furtherReading`。
   - 移除 `isStub: true` 以脫離佔位狀態。
2. 若需要新的視覺化，於 `src/components/diagrams/` 新增元件，並在 `src/components/diagrams/index.ts` 的登錄表註冊其 `DiagramKey`。
3. 章節結構定義於 `src/nav.ts`；新增項目後路由會自動由 `[chapter]` / `[lab]` 動態路由產生。
4. 執行 `npm run validate` 確認連結無誤，再送出 Pull Request。

程式碼風格：元件用 PascalCase、hooks 與工具函式用 camelCase、常數用 `kCamelCase`；
僅使用函式型元件與 hooks，樣式一律透過 Tailwind 工具類別與 CSS 變數。
