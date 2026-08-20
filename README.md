# Markdown Mermaid Studio

本機優先的 Markdown／Mermaid 生產力工作台。可直接在瀏覽器管理多份文件、編輯、即時預覽、雙向定位、檢核、管理版本快照並輸出成果。

**線上使用：** [GitHub Pages](https://changrone.github.io/markdown-mermaid-studio/)

## v0.5.1 功能

- `.md`／`.markdown`／`.mdown`／`.mkd`／`.txt` 匯入，統一下載為 UTF-8 `.md`
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
- 流程圖節點／連線與長 `subgraph` 標題自動換行；循序圖參與者／訊息／備註與 Block 長 shape label 自動換行
- 每張 Mermaid 圖可縮放、複製原始碼、下載 SVG 或 PNG
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

驗證包含 ESLint、純函式單元測試、長文字換行與 Block 實際 render 回歸測試、全部 Mermaid 範本解析、雙向定位 source map、GitHub Pages build 與靜態資源 smoke test。

## GitHub Pages 部署

推送到 `main` 後，GitHub Actions 會依序執行 lint、單元測試、靜態 build、Pages smoke test，全部通過後才部署到：

`https://changrone.github.io/markdown-mermaid-studio/`

依賴由 `package-lock.json` 鎖定並使用 `npm ci`。每月排程只更新目前 major 範圍內的相容版本；完整測試成功後才直接更新 `main`，不建立額外發布分支。

詳細狀態與驗收標準請見 [PROJECT_STATUS.md](./PROJECT_STATUS.md)，版本變更請見 [CHANGELOG.md](./CHANGELOG.md)。
