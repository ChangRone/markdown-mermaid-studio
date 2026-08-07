# Changelog

## 0.4.0 - 2026-08-07

### Added

- 本機多文件工作區、複製、刪除與 20 份版本快照。
- Source ↔ Preview 精確雙向定位與作用中區塊提示。
- 搜尋／取代、完整語法目錄與 29 種 Mermaid 核心範本。
- Mermaid SVG／PNG 匯出、縮放與原始碼複製。
- frontmatter、數學公式、註腳與換行延伸語法。
- 文件問題快速修正、修改前後比較與安全套用。
- 自動化 Mermaid 範本解析及雙向定位 source-map 測試。

### Fixed

- 深色模式偏好在重新整理時被預設值覆蓋。
- `.markdown` 等檔名下載時重複附加 `.md`。
- 還原範例會直接覆蓋內容且沒有確認或備份。
- Mermaid 錯誤只能定位到整個 code fence 起點。
- 手機並排模式欄位過窄。

### Changed

- 升級 Next.js 16.3.0 與 Node 24 GitHub Actions。
- 使用 `package-lock.json`／`npm ci` 建立可重現部署。
- 部署前強制執行 lint、單元測試、Pages build 與 smoke test。
- 移除未使用的 Cloudflare、Drizzle、資料庫與範例 scaffold。
