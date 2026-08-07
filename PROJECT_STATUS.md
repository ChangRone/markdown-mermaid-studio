# Project Status

更新日期：2026-08-07  
目前版本：v0.4.0  
發布分支：`main`  
正式路徑：`/markdown-mermaid-studio/`

## 完成狀態

| 範圍 | 狀態 | 驗收標準 |
|---|---|---|
| Markdown 匯入／輸出 | DONE | 支援常用文字副檔名，輸出單一 `.md` |
| 即時編輯與預覽 | DONE | 編輯後立即更新 CommonMark／GFM／數學公式／frontmatter |
| Mermaid 語法與目錄 | DONE | Mermaid 11.16.1 核心 29 種範本全部通過 production parser |
| Mermaid 錯誤定位 | DONE | 顯示實際來源行並能直接跳轉 |
| Mermaid 輸出 | DONE | 每張圖可輸出 SVG、PNG及複製原始碼 |
| 雙向定位 | DONE | Source 游標→Preview；Preview 點選→Source 精確行 |
| 多文件與版本 | DONE | 本機多文件、複製、刪除、20 份快照、還原前備份 |
| 搜尋與取代 | DONE | 上下筆、大小寫、逐筆與全部取代 |
| 文件完善輔助 | DONE | 規則健檢、修改前後比較、選擇套用、AI 提示複製 |
| 深淺色與版面偏好 | DONE | 重新整理後保留主題、模式、欄寬與定位開關 |
| 行動裝置 | DONE | 小螢幕並排模式改為上下配置，工具列可操作 |
| 隱私與安全 | DONE | 無登入／DB／自動外傳；raw HTML 關閉；Mermaid strict |
| 可重現部署 | DONE | lockfile、`npm ci`、Node 24 Actions |
| 品質關卡 | DONE | lint、unit、29 Mermaid templates、source map、Pages smoke |
| 自動發布 | DONE | `main` 通過全部關卡後自動發布 GitHub Pages |
| 相容更新 | DONE | 每月更新相容依賴，測試成功後才更新 `main` |

## 有意保留的邊界

- 文件只存在目前瀏覽器；清除瀏覽器資料前應下載重要 `.md`。
- 不執行 Markdown 內嵌 raw HTML，以避免 XSS 與不可預期腳本。
- ZenUML 需要額外外部 Mermaid plug-in，因此不列入目前 29 種核心內建圖表。
- AI 語意改寫採「複製提示後由使用者選擇工具」，不在網站內保存 API Key 或自動上傳文件。
- 多人雲端協作、帳號同步與伺服器資料庫不屬於本機優先 v0.4 範圍。

## Definition of Done

功能只有同時符合下列條件才標示 DONE：

1. 功能已實作且具有可操作介面。
2. TypeScript build 與 ESLint 通過。
3. 對應單元或靜態驗證通過。
4. GitHub Pages workflow 成功。
5. 正式網址載入成功且主要資源回應 HTTP 200。
