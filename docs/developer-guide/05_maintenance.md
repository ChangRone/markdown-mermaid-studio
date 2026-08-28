# 長期維護與疑難排解

## Windows 桌機長期維護

修改任何一份來源 MD 後，HTML 不會自行更新。從 PowerShell 執行：

```powershell
.\scripts\build-guide.ps1
```

腳本會確認 Node.js 與 Pandoc，接著產生新的 `all.md` 和 `developer_guide.html`。正式提交前應一併執行 `npm test`。

## 沒有 Pandoc

Windows 可執行：

```powershell
winget install --source winget --exact --id JohnMacFarlane.Pandoc
pandoc --version
```

若沒有管理員權限，可將 Pandoc Portable 解壓到：

```text
tools/pandoc/pandoc.exe
```

PowerShell 建置腳本會優先使用這個可攜版本。Linux 或 macOS 可安裝 Pandoc，或用 `PANDOC` 環境變數指定執行檔後執行 `./scripts/build-guide.sh`。

## 沒有 Node.js 或不能安裝軟體

開發環境需要 Node.js 22.13.0 以上。若維護電腦不能安裝 Node.js 或 Pandoc，應由 CI 執行相同的 `npm run guide:build`，維護者只提交五份 MD，再下載通過驗證的 `developer_guide.html`。

閱讀端不需要 Node.js、Pandoc、Web Server 或網路，只需要一般瀏覽器。

## 常見建置錯誤

| 訊息 | 原因 | 處理方式 |
|---|---|---|
| 必須正好列出 5 份 Markdown | `guide-order.txt` 數量不正確 | 補齊或移除清單項目 |
| 跨文件連結未納入 | 連到清單外的 MD | 修正路徑或將正確文件列入清單 |
| 找不到頁內目標 | 標題改名但連結未更新 | 更新 `#Anchor` 目標 |
| Mermaid 圖渲染失敗 | Mermaid 語法錯誤 | 回到 Studio 查看精確錯誤行 |
| 找不到 Pandoc | 未安裝或路徑未設定 | 安裝、放入可攜版或設定 `PANDOC` |

## 發布前檢查

1. 執行 `npm test`。
2. 執行 `npm run guide:build`。
3. 關閉網路後開啟 `dist/developer_guide.html`。
4. 點選目錄及跨章節連結。
5. 檢查 [長文字 Mermaid 範例](03_mermaid.md#長文字與中文換行)。
6. 以瀏覽器測試列印預覽。

