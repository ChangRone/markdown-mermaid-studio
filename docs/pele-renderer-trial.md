# Pele 渲染層試行與還原

- 試行分支：`feat/pele-renderer-trial-20261028`，建立自 main 基準 `b7fa6d16944622e8f07074dc6336dfa30015434c`。
- Pele 固定 `1.12.0`；Mermaid `11.17.0`、相關補丁與原始語法檢查保留。
- **未修改 main；未部署正式網站。**

## 立即切換

上方「渲染」選擇「Mermaid（還原）」即可使用原本的 Mermaid 引擎。
選擇儲存在瀏覽器的 `localStorage["md-mermaid-studio-diagram-engine-v1"]`，重新整理仍有效。
若 Pele 單張圖渲染失敗，自動改用 Mermaid，圖上標示「Mermaid（備援）」。

## Git 還原

未合併前，繼續使用 main 就是原本版本，不必執行 Git reset。
要在本機從試行前的版本重建分支：

```bash
git fetch origin
git switch -c restore-mermaid-baseline b7fa6d16944622e8f07074dc6336dfa30015434c
```

**不要在 main 執行 git reset --hard。** 若日後合併至 main，應針對實際
merge commit 新開 `git revert` PR，經驗證後合併還原。

## 驗證門檻

1. `npm ci && npm test`、lint、Next build 均通過。
2. Flowchart、Sequence、ER、Subgraph、Block、Mindmap、中文長標籤不截字。
3. 跨桌面／手機縮放，Source ↔ Preview 雙向定位、點選、複製文字不受干擾。
4. 切回 Mermaid 後，預覽、SVG、PNG、合併 HTML 維持原有行為。
5. Pele 主題下，獨立開啟 SVG／PNG／HTML 顏色、文字、比例正確。

本階段只切換渲染層。**語法檢查仍使用 Mermaid 11.17.0**，
不等同 Pele 的語法相容檢查；正式採用前必須評估是否更新驗證規則。
