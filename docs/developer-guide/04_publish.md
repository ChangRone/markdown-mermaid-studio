# 五份文件合併與單頁發布

## 固定文件順序

`guide-order.txt` 必須正好列出五份 Markdown。建置器依清單順序讀取，不使用作業系統的 `*.md` 排序；缺檔、重複路徑或超出專案的路徑都會停止建置。

## Anchor 與跨文件連結

每份文件會取得 `doc-檔名` 根 Anchor，各標題再加上文件前綴。例如：

```text
docs/developer-guide/03_mermaid.md#長文字與中文換行
→ #doc-03-mermaid--長文字與中文換行
```

同檔 Anchor、跨檔連結與 Markdown reference link 都由 Pandoc AST 解析後改寫。外部 `https:`、`mailto:` 及圖片資源不會被誤改。找不到目標 Anchor 時建置直接失敗。

## Mermaid 預先渲染

建置器會使用 Studio 共用的 Mermaid 11.17.0 設定，把 Mermaid code fence 預先渲染成 SVG，再交給 Pandoc 嵌入。因此閱讀端不需要載入 Mermaid JavaScript，也不需要網路。

## 建立單一 HTML

在專案根目錄執行：

```bash
npm run guide:build
```

產物為：

```text
build/developer-guide/all.md
dist/developer_guide.html
```

`all.md` 是可檢查的中間結果；`developer_guide.html` 內含目錄、CSS 及 Mermaid SVG，可直接以瀏覽器離線開啟。

## 單頁閱讀功能

- 固定式左側章節目錄。
- 手機版可捲動目錄及響應式內容。
- 同頁 Anchor 快速跳轉及瀏覽器上一頁紀錄。
- `Ctrl+F` 搜尋全部五份文件。
- 深色系統偏好與列印樣式。
- 瀏覽器列印或另存 PDF。

建置環境與無平台替代方式請看 [長期維護](05_maintenance.md)。

