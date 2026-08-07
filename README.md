# Markdown Mermaid Studio

一個本機優先的 Markdown 與 Mermaid 文件工作台。可直接在瀏覽器開啟、匯入及下載 `.md`，並同步預覽文件與檢查 Mermaid 11 語法。

## MVP 功能

- Markdown 原始碼與即時預覽
- `.md`／`.markdown`／`.txt` 匯入與 `.md` 下載
- Mermaid 11.16.1 流程圖、循序圖、狀態圖、類別圖、ER 圖、甘特圖、心智圖及架構圖範本
- Mermaid 語法檢核與錯誤定位
- 文件結構健檢、標題層級與待辦清單建議
- 一鍵複製 AI 完善提示
- 瀏覽器本機自動儲存、淺色／深色模式及響應式介面

## 本機執行

```bash
npm install
npm run dev
```

## 驗證

```bash
npm run lint
npm run build
```

目前版本不會把文件內容傳送至伺服器或外部 AI。瀏覽器儲存只用於保存使用者目前的草稿、檔名與主題偏好。
