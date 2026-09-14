# Markdown Mermaid Studio

本機優先的 Markdown／Mermaid 生產力工作台。可直接在瀏覽器管理多份文件、編輯、即時預覽、雙向定位、檢核、管理版本快照並輸出成果。

**線上使用：** [GitHub Pages](https://changrone.github.io/markdown-mermaid-studio/)

**完整功能指南：** [Developer Guide](https://changrone.github.io/markdown-mermaid-studio/developer_guide.html)

## v0.6.4 功能

- Markdown 預覽會顯示編號清單、項目符號與巢狀清單 Marker；核取清單維持只顯示 Checkbox，「完整語法」目錄可直接插入正確範例
- 一般「匯入多份 MD」可一次加入最多 50 份 `.md`／`.markdown`／`.mdown`／`.mkd`／`.txt`，立即顯示第一份並保留原工作區文件；其餘文件可由文件管理區切換
- 網頁「多檔合併」可一次選取最多 50 份文件、調整順序、驗證跨 MD Anchor、預覽並下載 `all.md` 或獨立 HTML；合併預覽與重新開啟 `all.md` 都能在同一頁正確跳轉
- 多文件工作區、複製／刪除、每份文件最多 20 份本機版本快照與安全還原
- 快照自訂名稱、最多 5 個標籤、重新命名、搜尋、刪除與單獨下載 Markdown
- 最多釘選 5 份重要快照；達上限自動整理時優先保留
- 快照與目前文件並排比較，顯示變更區新增／移除行數
- 完整工作區 JSON 匯出／匯入，包含所有文件、快照與介面偏好
- 文件管理面板顯示 localStorage 實際占用量與保存風險
- 編輯、並排、預覽模式；可拖曳或用鍵盤調整欄寬並保存比例
- Source ↔ Preview 雙向定位：來源游標定位預覽，點選預覽回到精確來源行
- 文字搜尋、上一筆／下一筆、區分大小寫、逐筆與全部取代
- CommonMark、GFM、frontmatter、註腳、數學公式與安全的外部連結預覽
- Mermaid 11.17.0 即時渲染、精確錯誤行、29 種核心圖表範本與官方文件入口
- 流程圖節點／連線與長 `subgraph` 標題自動換行，包含 HiDPI 與非整數瀏覽器縮放；循序圖參與者／訊息／備註與 Block 長 shape label 自動換行；Journey 長任務不裁切
- 每張 Mermaid 圖可縮放、複製原始碼、下載 SVG 或維持 `viewBox` 比例的 PNG
- 文件結構、標題、圖片替代文字與 Mermaid 健檢
- 規則修正前後比較、選擇套用、自動建立還原快照
- 一鍵複製完整 AI 完善提示，不自動傳送文件
- 淺色／深色模式、桌機／平板／手機響應式介面

原始 HTML 預設不執行，Mermaid 使用 `securityLevel: strict`。文件、多文件工作區、偏好與快照只保存在目前瀏覽器，不需要登入、資料庫或付費 AI API。

## 快照保存位置與期限

- 保存位置：目前瀏覽器、目前 GitHub Pages 網域的 `localStorage`；不會寫入 GitHub 或任何伺服器。
- 保存期限：沒有固定到期日，通常關閉或重新啟動瀏覽器後仍存在。
- 可能遺失：清除網站資料、使用無痕模式後關閉、瀏覽器／裝置更換、瀏覽器儲存空間回收或網址網域變更。
- 容量：受瀏覽器對單一網域的 localStorage 配額限制；工作區面板會顯示目前約略占用量。
- 建議：重要文件定期使用「匯出工作區」下載 JSON；需要時可一次還原所有文件與快照。

## 快捷操作

- `Ctrl/Cmd + S`：下載目前 Markdown
- `Ctrl/Cmd + F`：開啟搜尋與取代
- 並排模式移動來源游標：定位預覽段落
- 點選預覽標題、段落、清單、表格或圖表：回到來源行
- 分隔線 `←`／`→`：調整欄寬；按住 `Shift` 每次調整 5%；雙擊恢復 50%

## 本機執行

```bash
npm ci
npm run dev
```

## 完整驗證

```bash
npm test
```

驗證包含 ESLint、純函式單元測試、小數寬度長文字換行、PNG data URI／比例與 Block 實際 render 回歸測試、全部 Mermaid 範本解析、雙向定位 source map、GitHub Pages build 與靜態資源 smoke test。

## GitHub Pages 部署

推送到 `main` 後，GitHub Actions 會依序安裝鎖定依賴與 Pandoc、執行 lint、單元測試、Studio 靜態 build、Developer Guide 單頁 build 及 Pages smoke test，全部通過後才部署到：

`https://changrone.github.io/markdown-mermaid-studio/`

Developer Guide 同步發布到：

`https://changrone.github.io/markdown-mermaid-studio/developer_guide.html`

依賴由 `package-lock.json` 鎖定並使用 `npm ci`。每月排程只更新目前 major 範圍內的相容版本；完整測試成功後才直接更新 `main`，不建立額外發布分支。

詳細狀態與驗收標準請見 [PROJECT_STATUS.md](./PROJECT_STATUS.md)，版本變更請見 [CHANGELOG.md](./CHANGELOG.md)。

## 在網頁合併多份 Markdown

不需安裝 Node.js 或 Pandoc，直接開啟線上 Studio：

1. 點擊頂端「多檔合併」。
2. 點擊「選擇多份 MD」，一次選取需要合併的文件。
3. 使用上移、下移及移除按鈕確認文件順序。
4. 設定網頁標題與 HTML 檔名。
5. 確認畫面顯示「連結檢查通過」，再點擊「檢查連結並預覽」；左側目錄與內文連結都會在目前預覽頁跳轉，不會重新開啟 Studio 首頁。
6. 下載「合併 MD」或包含目錄、CSS 與 Mermaid SVG 的「單頁 HTML」。

系統會把 `other.md#章節` 改成單頁 Anchor；缺少文件、缺少標題 Anchor 或重複檔名時會阻止輸出。外部網址保持不變。本機圖片不會自動上傳或嵌入，畫面會列出警告。

下載的 `all.md` 也可透過 Studio 的「匯入多份 MD」重新開啟；系統只會還原合併器產生的 `doc-...` 標題 Anchor，其他 raw HTML 仍不執行。頁內 `#Anchor` 留在目前預覽，外部網址則開啟新分頁。

## 專案內固定五份 Markdown 發布

`guide-order.txt` 固定列出五份來源文件。建置器會依序合併、為每份文件建立唯一 Anchor、改寫跨 MD 連結、驗證失效目標，並以目前 Studio 的 Mermaid 11.17.0 設定預先渲染 SVG。Pandoc 最後將目錄、CSS 與圖形嵌入單一網頁：

```bash
npm run guide:build
```

輸出：

- `build/developer-guide/all.md`：可檢查的合併中間檔。
- `dist/developer_guide.html`：可離線開啟的單一網頁。

Windows 可執行 `scripts/build-guide.ps1`；Linux/macOS 可執行 `scripts/build-guide.sh`。Windows 沒有管理員權限時，可把 Pandoc Portable 放在 `tools/pandoc/pandoc.exe`。來源與固定順序請見 [`docs/developer-guide`](./docs/developer-guide) 及 [`guide-order.txt`](./guide-order.txt)。

這是維護專案內建 Developer Guide 的可重現發布管線；一般使用者合併自己的文件，請使用網頁上的「多檔合併」。
