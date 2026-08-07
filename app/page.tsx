"use client";

import {
  Check,
  ChevronDown,
  Clipboard,
  Download,
  FileCode2,
  FileUp,
  Lightbulb,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  RotateCcw,
  Sparkles,
  Sun,
} from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const STARTER_DOCUMENT = `# 文件處理與簽核流程

這是一份可以直接修改、預覽與匯出的 Markdown 文件。內容只會儲存在目前的瀏覽器。

## 流程概覽

\`\`\`mermaid
flowchart LR
    A[提出申請] --> B{資料是否完整？}
    B -->|是| C[內容檢核]
    B -->|否| D[退回補件]
    D --> A
    C --> E{是否符合？}
    E -->|符合| F[簽核通過]
    E -->|不符合| G[說明改善事項]
\`\`\`

## 檢核清單

- [x] 已定義申請目的
- [x] 已確認資料範圍
- [ ] 已保存必要佐證紀錄
- [ ] 已確認後續追蹤責任

## 關卡與佐證

| 檢核關卡 | 判斷方式 | 建議佐證 |
|---|---|---|
| 申請完整性 | 是／否 | 申請表與附件 |
| 控制措施 | 符合／不符合 | 檢核紀錄或系統畫面 |
| 最終核准 | 通過／退回 | 簽核歷程 |

> 提示：從上方「插入圖表」可以加入更多 Mermaid 11 圖表範本。
`;

const DIAGRAM_TEMPLATES: Record<string, string> = {
  flowchart: `\n\n\`\`\`mermaid\nflowchart TD\n    A[開始] --> B{判斷條件}\n    B -->|是| C[執行處理]\n    B -->|否| D[回到確認]\n    C --> E[完成]\n    D --> B\n\`\`\`\n`,
  sequence: `\n\n\`\`\`mermaid\nsequenceDiagram\n    actor U as 使用者\n    participant S as 系統\n    participant A as 審核者\n    U->>S: 提交申請\n    S->>A: 發送審核通知\n    A-->>S: 回覆結果\n    S-->>U: 顯示處理狀態\n\`\`\`\n`,
  state: `\n\n\`\`\`mermaid\nstateDiagram-v2\n    [*] --> 草稿\n    草稿 --> 審核中: 提交\n    審核中 --> 已通過: 核准\n    審核中 --> 待補件: 退回\n    待補件 --> 審核中: 重新提交\n    已通過 --> [*]\n\`\`\`\n`,
  class: `\n\n\`\`\`mermaid\nclassDiagram\n    class Document {\n      +String title\n      +String status\n      +submit()\n    }\n    class Review {\n      +String result\n      +approve()\n    }\n    Document "1" --> "many" Review\n\`\`\`\n`,
  er: `\n\n\`\`\`mermaid\nerDiagram\n    DOCUMENT ||--o{ REVIEW : contains\n    USER ||--o{ DOCUMENT : creates\n    DOCUMENT {\n      string title\n      string status\n    }\n    REVIEW {\n      string result\n      datetime reviewed_at\n    }\n\`\`\`\n`,
  gantt: `\n\n\`\`\`mermaid\ngantt\n    title MVP 建置時程\n    dateFormat YYYY-MM-DD\n    section 規劃\n    需求確認 :done, a1, 2026-08-07, 1d\n    section 開發\n    核心功能 :active, a2, after a1, 3d\n    驗證發布 :a3, after a2, 1d\n\`\`\`\n`,
  mindmap: `\n\n\`\`\`mermaid\nmindmap\n  root((文件工作台))\n    編輯\n      Markdown\n      Mermaid\n    檢核\n      語法\n      結構\n    輸出\n      MD\n      可視化預覽\n\`\`\`\n`,
  architecture: `\n\n\`\`\`mermaid\narchitecture-beta\n    group app(cloud)[文件工作台]\n    service editor(server)[Markdown 編輯器] in app\n    service renderer(server)[Mermaid 渲染器] in app\n    service storage(database)[瀏覽器儲存] in app\n    editor:R --> L:renderer\n    editor:B --> T:storage\n\`\`\`\n`,
};

type MermaidCheck = {
  index: number;
  line: number;
  ok: boolean;
  message: string;
};

function extractMermaidBlocks(markdown: string) {
  const blocks: Array<{ code: string; line: number }> = [];
  const regex = /```mermaid\s*\n([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    blocks.push({
      code: match[1].trim(),
      line: markdown.slice(0, match.index).split("\n").length,
    });
  }
  return blocks;
}

function MermaidDiagram({ code, dark }: { code: string; dark: boolean }) {
  const targetRef = useRef<HTMLDivElement>(null);
  const rawId = useId();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const draw = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: dark ? "dark" : "neutral",
          fontFamily: "Inter, Noto Sans TC, system-ui, sans-serif",
        });
        await mermaid.parse(code);
        const id = `diagram-${rawId.replace(/[^a-zA-Z0-9]/g, "")}-${Date.now()}`;
        const { svg } = await mermaid.render(id, code);
        if (active && targetRef.current) {
          targetRef.current.innerHTML = svg;
          setError("");
        }
      } catch (reason) {
        if (active) {
          const message = reason instanceof Error ? reason.message : String(reason);
          setError(message.split("\n").slice(0, 3).join(" "));
        }
      }
    };
    draw();
    return () => {
      active = false;
    };
  }, [code, dark, rawId]);

  if (error) {
    return (
      <div className="diagram-error" role="alert">
        <strong>Mermaid 無法顯示</strong>
        <span>{error}</span>
      </div>
    );
  }

  return <div className="mermaid-canvas" ref={targetRef} aria-label="Mermaid 圖表" />;
}

function countWords(content: string) {
  const latin = content.match(/[A-Za-z0-9_]+/g)?.length ?? 0;
  const cjk = content.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  return latin + cjk;
}

export default function Home() {
  const [markdown, setMarkdown] = useState(STARTER_DOCUMENT);
  const [filename, setFilename] = useState("document-workflow.md");
  const [dark, setDark] = useState(false);
  const [mode, setMode] = useState<"split" | "editor" | "preview">("split");
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [checks, setChecks] = useState<MermaidCheck[]>([]);
  const [checking, setChecking] = useState(false);
  const [toast, setToast] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("md-mermaid-studio-document");
      const savedName = window.localStorage.getItem("md-mermaid-studio-filename");
      const savedTheme = window.localStorage.getItem("md-mermaid-studio-theme");
      if (saved) setMarkdown(saved);
      if (savedName) setFilename(savedName);
      if (savedTheme === "dark") setDark(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem("md-mermaid-studio-document", markdown);
      window.localStorage.setItem("md-mermaid-studio-filename", filename);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [markdown, filename]);

  useEffect(() => {
    window.localStorage.setItem("md-mermaid-studio-theme", dark ? "dark" : "light");
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const runChecks = useCallback(async () => {
    setChecking(true);
    const blocks = extractMermaidBlocks(markdown);
    if (!blocks.length) {
      setChecks([]);
      setChecking(false);
      return;
    }
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
    const results: MermaidCheck[] = [];
    for (let index = 0; index < blocks.length; index += 1) {
      try {
        await mermaid.parse(blocks[index].code);
        results.push({ index, line: blocks[index].line, ok: true, message: "語法正確" });
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : String(reason);
        results.push({
          index,
          line: blocks[index].line,
          ok: false,
          message: message.split("\n").find(Boolean)?.slice(0, 150) ?? "語法錯誤",
        });
      }
    }
    setChecks(results);
    setChecking(false);
  }, [markdown]);

  useEffect(() => {
    const timer = window.setTimeout(runChecks, 700);
    return () => window.clearTimeout(timer);
  }, [runChecks]);

  const insertText = (text: string) => {
    const area = textareaRef.current;
    if (!area) {
      setMarkdown((current) => current + text);
      return;
    }
    const start = area.selectionStart;
    const end = area.selectionEnd;
    setMarkdown((current) => current.slice(0, start) + text + current.slice(end));
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(start + text.length, start + text.length);
    });
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    setMarkdown(text);
    setFilename(file.name.endsWith(".md") ? file.name : `${file.name}.md`);
    setToast(`已開啟 ${file.name}`);
  };

  const download = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.replace(/[^a-zA-Z0-9._\-\u3400-\u9fff]/g, "-") || "document.md";
    link.click();
    URL.revokeObjectURL(url);
    setToast("Markdown 已下載");
  };

  const copyAiPrompt = async () => {
    const prompt = `請檢查並完善以下 Markdown 文件。要求：\n1. 保留原意與資訊，不自行補造事實。\n2. 檢查標題層級、表格、清單與連結。\n3. 修正 Mermaid 語法，並維持 Mermaid 11 相容。\n4. 先列出修改建議，再提供完整修正版。\n\n---文件開始---\n${markdown}\n---文件結束---`;
    await navigator.clipboard.writeText(prompt);
    setToast("AI 協作提示已複製");
  };

  const issues = useMemo(() => {
    const result: Array<{ level: "good" | "warn" | "tip"; title: string; detail: string }> = [];
    if (/^#\s+.+/m.test(markdown)) {
      result.push({ level: "good", title: "主標題完整", detail: "文件已具有單一入口標題。" });
    } else {
      result.push({ level: "warn", title: "缺少主標題", detail: "建議加入一個 # 主標題，方便辨識文件目的。" });
    }
    const failed = checks.filter((check) => !check.ok);
    if (failed.length) {
      result.push({ level: "warn", title: `${failed.length} 張圖需要修正`, detail: `先檢查第 ${failed.map((item) => item.line).join("、")} 行附近。` });
    } else if (checks.length) {
      result.push({ level: "good", title: `${checks.length} 張 Mermaid 圖正常`, detail: "目前所有圖表均通過 Mermaid 11 語法檢查。" });
    } else {
      result.push({ level: "tip", title: "尚未加入圖表", detail: "可用流程圖或狀態圖把複雜段落轉成可視化結構。" });
    }
    const headingLevels = [...markdown.matchAll(/^(#{1,6})\s+/gm)].map((match) => match[1].length);
    const hasJump = headingLevels.some((level, index) => index > 0 && level - headingLevels[index - 1] > 1);
    if (hasJump) result.push({ level: "warn", title: "標題層級跳號", detail: "部分標題跨過一層，可能使目錄結構難以理解。" });
    else result.push({ level: "good", title: "標題結構連續", detail: "目前未發現明顯的標題層級跳號。" });
    if (!/[-*]\s+\[[ xX]\]/.test(markdown)) {
      result.push({ level: "tip", title: "可加入追蹤清單", detail: "若文件包含待辦或檢核工作，可使用 - [ ] 建立核取清單。" });
    }
    return result;
  }, [markdown, checks]);

  const mermaidBlocks = extractMermaidBlocks(markdown).length;
  const markdownComponents = useMemo(
    () => ({
      pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
      code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
        const code = String(children ?? "").replace(/\n$/, "");
        if (className === "language-mermaid") return <MermaidDiagram code={code} dark={dark} />;
        if (!className && !code.includes("\n")) return <code className="inline-code">{children}</code>;
        return (
          <pre className="code-block">
            <code className={className}>{children}</code>
          </pre>
        );
      },
      a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
        <a href={href} target="_blank" rel="noreferrer">{children}</a>
      ),
    }),
    [dark],
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><FileCode2 size={19} /></div>
          <div>
            <strong>Markdown Mermaid Studio</strong>
            <span>本機優先的文件工作台</span>
          </div>
        </div>

        <div className="top-actions">
          <span className="version-badge">Mermaid 11.16.1</span>
          <button className="icon-button" onClick={() => setDark((value) => !value)} aria-label={dark ? "切換淺色模式" : "切換深色模式"}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="button secondary" onClick={() => fileInputRef.current?.click()}><FileUp size={17} />開啟 MD</button>
          <button className="button primary" onClick={download}><Download size={17} />下載 MD</button>
          <input ref={fileInputRef} type="file" accept=".md,.markdown,.mdown,.mkd,.txt,text/markdown,text/plain" hidden onChange={(event) => handleFile(event.target.files?.[0])} />
        </div>
      </header>

      <section className="document-bar">
        <div className="filename-wrap">
          <span className="saved-dot" />
          <input value={filename} onChange={(event) => setFilename(event.target.value)} aria-label="檔案名稱" />
          <span className="saved-label">自動儲存於本機</span>
        </div>
        <div className="mode-switch" aria-label="顯示模式">
          <button className={mode === "editor" ? "active" : ""} onClick={() => setMode("editor")}>編輯</button>
          <button className={mode === "split" ? "active" : ""} onClick={() => setMode("split")}>並排</button>
          <button className={mode === "preview" ? "active" : ""} onClick={() => setMode("preview")}>預覽</button>
        </div>
        <button className={`assistant-toggle ${assistantOpen ? "active" : ""}`} onClick={() => setAssistantOpen((value) => !value)}>
          <Sparkles size={16} />文件健檢 {assistantOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
      </section>

      <section className="workspace">
        <div className={`main-stage mode-${mode} ${assistantOpen ? "with-assistant" : ""}`}>
          <div className={`editor-pane ${mode === "preview" ? "hidden-pane" : ""}`}>
            <div className="pane-heading">
              <div><span className="eyebrow">SOURCE</span><strong>Markdown</strong></div>
              <div className="editor-tools">
                <button onClick={() => insertText("\n## 新段落\n\n在這裡輸入內容。\n")} title="插入標題">H2</button>
                <button onClick={() => insertText("\n- [ ] 待確認項目\n")} title="插入核取清單">☑</button>
                <button onClick={() => insertText("\n| 項目 | 說明 |\n|---|---|\n| 範例 | 內容 |\n")} title="插入表格">▦</button>
                <label className="template-select">
                  <Play size={14} />
                  <select defaultValue="" onChange={(event) => { if (event.target.value) insertText(DIAGRAM_TEMPLATES[event.target.value]); event.target.value = ""; }} aria-label="插入 Mermaid 圖表">
                    <option value="" disabled>插入圖表</option>
                    <option value="flowchart">流程圖 Flowchart</option>
                    <option value="sequence">循序圖 Sequence</option>
                    <option value="state">狀態圖 State</option>
                    <option value="class">類別圖 Class</option>
                    <option value="er">ER 關聯圖</option>
                    <option value="gantt">甘特圖 Gantt</option>
                    <option value="mindmap">心智圖 Mindmap</option>
                    <option value="architecture">架構圖 Architecture</option>
                  </select>
                  <ChevronDown size={13} />
                </label>
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
                  event.preventDefault();
                  download();
                }
              }}
              spellCheck={false}
              aria-label="Markdown 編輯器"
            />
            <div className="pane-status"><span>{markdown.split("\n").length} 行</span><span>{countWords(markdown)} 字詞</span><span>{mermaidBlocks} 張圖</span><span>UTF-8</span></div>
          </div>

          <div className={`preview-pane ${mode === "editor" ? "hidden-pane" : ""}`}>
            <div className="pane-heading preview-heading">
              <div><span className="eyebrow">PREVIEW</span><strong>即時預覽</strong></div>
              <div className="validation-state">
                {checking ? <><span className="pulse-dot" />檢查中</> : checks.some((item) => !item.ok) ? <><span className="error-dot" />需要修正</> : <><Check size={15} />語法正常</>}
              </div>
            </div>
            <article className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{markdown}</ReactMarkdown>
            </article>
          </div>

          {assistantOpen && (
            <aside className="assistant-pane">
              <div className="assistant-heading">
                <div className="assistant-icon"><Sparkles size={17} /></div>
                <div><span className="eyebrow">DOCUMENT COACH</span><strong>完善建議</strong></div>
              </div>
              <p className="assistant-intro">先用可驗證規則檢查結構與 Mermaid；需要語意改寫時，再帶著完整提示交給 AI。</p>
              <div className="score-card">
                <div><span>文件狀態</span><strong>{issues.some((issue) => issue.level === "warn") ? "可再改善" : "結構良好"}</strong></div>
                <div className="score-ring">{issues.filter((issue) => issue.level !== "warn").length}/{issues.length}</div>
              </div>
              <div className="suggestion-list">
                {issues.map((issue, index) => (
                  <div className={`suggestion ${issue.level}`} key={`${issue.title}-${index}`}>
                    <span className="suggestion-mark">{issue.level === "good" ? <Check size={14} /> : <Lightbulb size={14} />}</span>
                    <div><strong>{issue.title}</strong><p>{issue.detail}</p></div>
                  </div>
                ))}
              </div>
              <button className="button assistant-action" onClick={copyAiPrompt}><Clipboard size={16} />複製 AI 完善提示</button>
              <button className="text-action" onClick={() => { setMarkdown(STARTER_DOCUMENT); setFilename("document-workflow.md"); setToast("已還原範例文件"); }}><RotateCcw size={14} />還原範例文件</button>
              <div className="privacy-note"><span>●</span> 文件不會上傳；目前內容只保存在這台裝置。</div>
            </aside>
          )}
        </div>
      </section>

      {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
    </main>
  );
}
