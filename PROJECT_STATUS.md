# Project Status

更新日期：2026-08-20
目前版本：v0.5.2
發布分支：`main`
正式路徑：`/markdown-mermaid-studio/`

## 完成狀態

| 範圍 | 狀態 | 驗收標準 |
|---|---|---|
| Markdown 匯入／輸出 | DONE | 支援常用文字副檔名，輸出單一 `.md` |
| 即時編輯與預覽 | DONE | 編輯後立即更新 CommonMark／GFM／數學公式／frontmatter |
| Mermaid 語法與目錄 | DONE | Mermaid 11.17.0 核心 29 種範本全部通過 production parser |
| Mermaid 長文字 | DONE | Flowchart／Sequence 長文字換行；檔名、底線與中英混合標點具跨瀏覽器斷行 fallback；State、Mindmap、Kanban、Journey、Architecture、C4 與 Block 長標籤完成正式瀏覽器壓力測試 |
| Mermaid Block 相容性 | DONE | Mermaid 11.17.0 循環 DOM 序列化已修補，基準與長標籤 Block 圖可實際 render |
| Mermaid 錯誤定位 | DONE | 顯示實際來源行並能直接跳轉 |
| Mermaid 輸出 | DONE | 每張圖可輸出 SVG、PNG及複製原始碼 |
| 雙向定位 | DONE | Source 游標→Preview；Preview 點選→Source 精確行 |
| 多文件與版本 | DONE | 本機多文件、複製、刪除、20 份快照、還原前備份 |
| 快照管理 | DONE | 名稱、標籤、搜尋、重新命名、釘選、刪除、下載與目前內容比較 |
| 工作區備份 | DONE | 全部文件、快照與偏好可匯出／匯入 JSON；v4 自動遷移 |
| 本機保存透明度 | DONE | 顯示 localStorage 位置、約略占用量、保存期限與遺失風險 |
| 搜尋與取代 | DONE | 上下筆、大小寫、逐筆與全部取代 |
| 文件完善輔助 | DONE | 規則健檢、修改前後比較、選擇套用、AI 提示複製 |
| 深淺色與版面偏好 | DONE | 重新整理後保留主題、模式、欄寬與定位開關 |
| 行動裝置 | DONE | 小螢幕並排模式改為上下配置，工具列可操作 |
| 隱私與安全 | DONE | 無登入／DB／自動外傳；raw HTML 關閉；Mermaid strict |
| 可重現部署 | DONE | lockfile、`npm ci`、Node 24 Actions |
| 品質關卡 | DONE | lint、unit、Block render、29 Mermaid templates、source map、Pages smoke |
| 自動發布 | DONE | `main` 通過全部關卡後自動發布 GitHub Pages |
| 相容更新 | DONE | 每月更新相容依賴，測試成功後才更新 `main` |

## 有意保留的邊界

- 文件只存在目前瀏覽器；清除瀏覽器資料前應匯出完整工作區 JSON 或下載重要 `.md`。
- 不執行 Markdown 內嵌 raw HTML，以避免 XSS 與不可預期腳本。
- ZenUML 需要額外外部 Mermaid plug-in，因此不列入目前 29 種核心內建圖表。
- AI 語意改寫採「複製提示後由使用者選擇工具」，不在網站內保存 API Key 或自動上傳文件。
- 多人雲端協作、帳號同步與伺服器資料庫不屬於本機優先 v0.5 範圍。

## Definition of Done

功能只有同時符合下列條件才標示 DONE：

1. 功能已實作且具有可操作介面。
2. TypeScript build 與 ESLint 通過。
3. 對應單元或靜態驗證通過。
4. GitHub Pages workflow 成功。
5. 正式網址載入成功且主要資源回應 HTTP 200。
