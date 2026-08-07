"use client";

import { BookOpen, ExternalLink, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DIAGRAM_TEMPLATES,
  templateDocsUrl,
  templateMarkdown,
} from "@/lib/templates";

const MARKDOWN_SNIPPETS = [
  { id: "heading", label: "標題結構", detail: "H1–H3 標準階層", code: "\n# 主標題\n\n## 第二層標題\n\n### 第三層標題\n" },
  { id: "emphasis", label: "文字強調", detail: "粗體、斜體與刪除線", code: "\n**粗體**、*斜體*、~~刪除線~~\n" },
  { id: "checklist", label: "核取清單", detail: "GitHub Flavored Markdown", code: "\n- [x] 已完成\n- [ ] 待處理\n" },
  { id: "table", label: "表格", detail: "含欄位對齊", code: "\n| 項目 | 狀態 | 說明 |\n|:---|:---:|---:|\n| 範例 | 完成 | 100 |\n" },
  { id: "link", label: "連結與圖片", detail: "安全連結與替代文字", code: "\n[連結文字](https://example.com)\n\n![圖片替代文字](https://example.com/image.png)\n" },
  { id: "footnote", label: "註腳 Footnote", detail: "GFM 註腳", code: "\n這是一段需要來源的內容。[^1]\n\n[^1]: 在這裡補充來源或說明。\n" },
  { id: "frontmatter", label: "YAML Frontmatter", detail: "文件 metadata", code: "---\ntitle: 文件標題\nstatus: draft\ntags: [markdown, mermaid]\n---\n\n" },
  { id: "math", label: "數學公式", detail: "KaTeX 行內與區塊公式", code: "\n行內公式：$E = mc^2$\n\n$$\nscore = \\frac{completed}{total} \\times 100\n$$\n" },
  { id: "code", label: "程式碼區塊", detail: "指定語言", code: "\n```typescript\nconst status = \"ready\";\n```\n" },
  { id: "quote", label: "引用與提示", detail: "安全、通用的提示區塊", code: "\n> **注意：** 在這裡加入重要說明。\n" },
];

type SyntaxCatalogProps = {
  open: boolean;
  onClose: () => void;
  onInsert: (text: string) => void;
};

export default function SyntaxCatalog({ open, onClose, onInsert }: SyntaxCatalogProps) {
  const [tab, setTab] = useState<"mermaid" | "markdown">("mermaid");
  const [query, setQuery] = useState("");
  const diagrams = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return DIAGRAM_TEMPLATES;
    return DIAGRAM_TEMPLATES.filter((template) =>
      `${template.label} ${template.category} ${template.id}`.toLocaleLowerCase().includes(needle),
    );
  }, [query]);
  const snippets = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return MARKDOWN_SNIPPETS;
    return MARKDOWN_SNIPPETS.filter((snippet) =>
      `${snippet.label} ${snippet.detail}`.toLocaleLowerCase().includes(needle),
    );
  }, [query]);

  if (!open) return null;
  return (
    <div className="catalog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="syntax-catalog"
        role="dialog"
        aria-modal="true"
        aria-label="Markdown 與 Mermaid 語法目錄"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div><BookOpen size={19} /><span><strong>語法與圖表目錄</strong><small>可搜尋並插入目前支援的語法</small></span></div>
          <button type="button" onClick={onClose} aria-label="關閉語法目錄"><X size={18} /></button>
        </header>
        <div className="catalog-controls">
          <div className="catalog-tabs">
            <button type="button" className={tab === "mermaid" ? "active" : ""} onClick={() => setTab("mermaid")}>Mermaid ({DIAGRAM_TEMPLATES.length})</button>
            <button type="button" className={tab === "markdown" ? "active" : ""} onClick={() => setTab("markdown")}>Markdown ({MARKDOWN_SNIPPETS.length})</button>
          </div>
          <label><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋語法或圖表" /></label>
        </div>
        <div className="catalog-grid">
          {tab === "mermaid" ? diagrams.map((template) => (
            <article className="catalog-card" key={template.id}>
              <div className="catalog-card-title">
                <span><strong>{template.label}</strong><small>{template.category}{template.minVersion ? ` · v${template.minVersion}+` : ""}</small></span>
                {template.experimental && <em>新語法</em>}
              </div>
              <pre>{template.code.split("\n").slice(0, 4).join("\n")}{template.code.split("\n").length > 4 ? "\n…" : ""}</pre>
              <div>
                <a href={templateDocsUrl(template)} target="_blank" rel="noreferrer">官方文件 <ExternalLink size={12} /></a>
                <button type="button" onClick={() => { onInsert(templateMarkdown(template)); onClose(); }}>插入範本</button>
              </div>
            </article>
          )) : snippets.map((snippet) => (
            <article className="catalog-card" key={snippet.id}>
              <div className="catalog-card-title"><span><strong>{snippet.label}</strong><small>{snippet.detail}</small></span></div>
              <pre>{snippet.code.trim().split("\n").slice(0, 4).join("\n")}{snippet.code.trim().split("\n").length > 4 ? "\n…" : ""}</pre>
              <div><span /><button type="button" onClick={() => { onInsert(snippet.code); onClose(); }}>插入語法</button></div>
            </article>
          ))}
          {((tab === "mermaid" && !diagrams.length) || (tab === "markdown" && !snippets.length)) && <p className="catalog-empty">找不到符合的語法。</p>}
        </div>
      </section>
    </div>
  );
}
