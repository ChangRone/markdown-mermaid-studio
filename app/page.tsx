"use client";

import {
  ArrowLeftRight,
  BookOpen,
  Camera,
  Check,
  Clipboard,
  Download,
  FileCode2,
  Files,
  FileUp,
  Lightbulb,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
  Sun,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import DocumentDrawer from "@/components/DocumentDrawer";
import MarkdownPreview from "@/components/MarkdownPreview";
import SearchPanel from "@/components/SearchPanel";
import SyntaxCatalog from "@/components/SyntaxCatalog";
import packageInfo from "../package.json";
import {
  STARTER_DOCUMENT,
  UI_STORAGE_KEY,
  WORKSPACE_STORAGE_KEY,
  addSnapshot,
  applyQuickFix,
  buildAiPrompt,
  buildDocumentIssues,
  countWords,
  createDefaultWorkspace,
  createDocument,
  extractMermaidBlocks,
  findSearchMatches,
  lineAtOffset,
  mermaidErrorDetails,
  migrateLegacyWorkspace,
  normalizeMarkdownFilename,
  offsetAtLine,
  parseUiPreferences,
  parseWorkspace,
  replaceAllMatches,
  type MermaidCheck,
  type QuickFixId,
  type StudioDocument,
} from "@/lib/studio";

type DisplayMode = "split" | "editor" | "preview";
type FixPreview = { title: string; before: string; after: string } | null;

const MERMAID_VERSION = packageInfo.dependencies.mermaid.replace(/^[^0-9]*/, "");

export default function Home() {
  const [workspace, setWorkspace] = useState(() => createDefaultWorkspace(0));
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [dark, setDark] = useState(false);
  const [mode, setMode] = useState<DisplayMode>("split");
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [splitPercent, setSplitPercent] = useState(48);
  const [syncPosition, setSyncPosition] = useState(true);
  const [uiLoaded, setUiLoaded] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [checks, setChecks] = useState<MermaidCheck[]>([]);
  const [checking, setChecking] = useState(false);
  const [activeSourceLine, setActiveSourceLine] = useState<number>();
  const [toast, setToast] = useState("");
  const [fixPreview, setFixPreview] = useState<FixPreview>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const previewPaneRef = useRef<HTMLDivElement>(null);
  const syncFrameRef = useRef<number | null>(null);

  const activeDocument = useMemo(
    () =>
      workspace.documents.find((document) => document.id === workspace.activeId) ||
      workspace.documents[0],
    [workspace],
  );
  const markdown = activeDocument.content;
  const filename = activeDocument.filename;

  const notify = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedWorkspace = parseWorkspace(window.localStorage.getItem(WORKSPACE_STORAGE_KEY));
      setWorkspace(storedWorkspace || migrateLegacyWorkspace() || createDefaultWorkspace());
      setWorkspaceLoaded(true);

      const savedUi = window.localStorage.getItem(UI_STORAGE_KEY);
      const preferences = parseUiPreferences(savedUi);
      if (!savedUi) {
        preferences.dark = window.localStorage.getItem("md-mermaid-studio-theme") === "dark";
        const legacySplit = Number(window.localStorage.getItem("md-mermaid-studio-split"));
        if (legacySplit >= 25 && legacySplit <= 75) preferences.splitPercent = legacySplit;
      }
      setDark(preferences.dark);
      setSplitPercent(preferences.splitPercent);
      setSyncPosition(preferences.syncPosition);
      setMode(preferences.mode);
      setUiLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!workspaceLoaded) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
      } catch {
        notify("本機儲存空間不足，請下載文件或刪除舊快照");
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [notify, workspace, workspaceLoaded]);

  useEffect(() => {
    if (!uiLoaded) return;
    window.localStorage.setItem(
      UI_STORAGE_KEY,
      JSON.stringify({ dark, splitPercent, syncPosition, mode }),
    );
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark, mode, splitPercent, syncPosition, uiLoaded]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const updateDocument = useCallback(
    (id: string, updater: (document: StudioDocument) => StudioDocument) => {
      setWorkspace((current) => ({
        ...current,
        documents: current.documents.map((document) =>
          document.id === id ? updater(document) : document,
        ),
      }));
    },
    [],
  );

  const updateActiveDocument = useCallback(
    (updater: (document: StudioDocument) => StudioDocument) => {
      updateDocument(workspace.activeId, updater);
    },
    [updateDocument, workspace.activeId],
  );

  const setMarkdown = useCallback(
    (content: string) => {
      updateActiveDocument((document) => ({ ...document, content, updatedAt: Date.now() }));
    },
    [updateActiveDocument],
  );

  const setFilename = useCallback(
    (nextFilename: string) => {
      updateActiveDocument((document) => ({
        ...document,
        filename: nextFilename,
        updatedAt: Date.now(),
      }));
    },
    [updateActiveDocument],
  );

  const snapshotActive = useCallback(
    (label: string) => {
      updateActiveDocument((document) => addSnapshot(document, label));
    },
    [updateActiveDocument],
  );

  const runChecks = useCallback(async () => {
    setChecking(true);
    const blocks = extractMermaidBlocks(markdown);
    if (!blocks.length) {
      setChecks([]);
      setChecking(false);
      return;
    }
    try {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        suppressErrorRendering: true,
      });
      const results: MermaidCheck[] = [];
      for (const block of blocks) {
        try {
          await mermaid.parse(block.code);
          results.push({ index: block.index, line: block.codeLine, ok: true, message: "語法正確" });
        } catch (reason) {
          const details = mermaidErrorDetails(reason, block);
          results.push({ index: block.index, ok: false, ...details });
        }
      }
      setChecks(results);
    } finally {
      setChecking(false);
    }
  }, [markdown]);

  useEffect(() => {
    const timer = window.setTimeout(() => void runChecks(), 600);
    return () => window.clearTimeout(timer);
  }, [runChecks]);

  const issues = useMemo(() => buildDocumentIssues(markdown, checks), [checks, markdown]);
  const mermaidBlocks = useMemo(() => extractMermaidBlocks(markdown), [markdown]);
  const matches = useMemo(
    () => findSearchMatches(markdown, searchQuery, matchCase),
    [markdown, matchCase, searchQuery],
  );
  const activeMatchIndex = Math.min(currentMatch, Math.max(0, matches.length - 1));

  const jumpSource = useCallback(
    (line: number, endLine?: number) => {
      if (mode === "preview") setMode("split");
      setActiveSourceLine(line);
      window.requestAnimationFrame(() => {
        const area = textareaRef.current;
        if (!area) return;
        const start = offsetAtLine(markdown, line);
        const end = endLine
          ? Math.min(markdown.length, offsetAtLine(markdown, endLine + 1) - 1)
          : start;
        area.focus({ preventScroll: true });
        area.setSelectionRange(start, Math.max(start, end));
        const lineHeight = Number.parseFloat(window.getComputedStyle(area).lineHeight) || 21;
        area.scrollTo({ top: Math.max(0, (line - 3) * lineHeight), behavior: "smooth" });
      });
    },
    [markdown, mode],
  );

  const locatePreview = useCallback(
    (line: number) => {
      setActiveSourceLine(line);
      if (!syncPosition || mode !== "split") return;
      if (syncFrameRef.current) window.cancelAnimationFrame(syncFrameRef.current);
      syncFrameRef.current = window.requestAnimationFrame(() => {
        const container = previewPaneRef.current?.querySelector<HTMLElement>(".markdown-body");
        if (!container) return;
        const candidates = [...container.querySelectorAll<HTMLElement>("[data-source-start]")]
          .map((element) => ({
            element,
            start: Number(element.dataset.sourceStart),
            end: Number(element.dataset.sourceEnd || element.dataset.sourceStart),
          }))
          .filter((candidate) => candidate.start > 0);
        const containing = candidates
          .filter((candidate) => line >= candidate.start && line <= candidate.end)
          .sort((a, b) => (a.end - a.start) - (b.end - b.start));
        const target = containing[0] || candidates.sort((a, b) =>
          Math.abs(a.start - line) - Math.abs(b.start - line),
        )[0];
        if (!target) return;
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.element.getBoundingClientRect();
        container.scrollTo({
          top: Math.max(0, container.scrollTop + targetRect.top - containerRect.top - container.clientHeight * 0.24),
          behavior: "smooth",
        });
      });
    },
    [mode, syncPosition],
  );

  useEffect(() => () => {
    if (syncFrameRef.current) window.cancelAnimationFrame(syncFrameRef.current);
  }, []);

  const handleEditorSelection = () => {
    const area = textareaRef.current;
    if (!area) return;
    locatePreview(lineAtOffset(markdown, area.selectionStart));
  };

  const insertText = (text: string) => {
    const area = textareaRef.current;
    if (!area) {
      setMarkdown(markdown + text);
      return;
    }
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const next = markdown.slice(0, start) + text + markdown.slice(end);
    setMarkdown(next);
    window.requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(start + text.length, start + text.length);
      locatePreview(lineAtOffset(next, start + text.length));
    });
  };

  const resizeSplit = useCallback(
    (clientX: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const bounds = stage.getBoundingClientRect();
      const assistantWidth = assistantOpen && window.innerWidth > 1100 ? 306 : 0;
      const availableWidth = bounds.width - assistantWidth - 10;
      const next = ((clientX - bounds.left) / availableWidth) * 100;
      setSplitPercent(Math.min(75, Math.max(25, next)));
    },
    [assistantOpen],
  );

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizing(true);
    resizeSplit(event.clientX);
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    const content = await file.text();
    const document = createDocument(normalizeMarkdownFilename(file.name), content);
    setWorkspace((current) => ({
      ...current,
      activeId: document.id,
      documents: [document, ...current.documents],
    }));
    setMode("split");
    notify(`已匯入 ${file.name}，原文件仍保留`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const download = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = normalizeMarkdownFilename(filename);
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    notify("Markdown 已下載");
  };

  const createNewDocument = () => {
    const document = createDocument();
    setWorkspace((current) => ({
      ...current,
      activeId: document.id,
      documents: [document, ...current.documents],
    }));
    notify("已新增空白文件");
  };

  const duplicateDocument = (id: string) => {
    const source = workspace.documents.find((document) => document.id === id);
    if (!source) return;
    const copy = createDocument(
      source.filename.replace(/\.md$/i, "-copy.md"),
      source.content,
    );
    setWorkspace((current) => ({
      ...current,
      activeId: copy.id,
      documents: [copy, ...current.documents],
    }));
    notify("文件副本已建立");
  };

  const deleteDocument = (id: string) => {
    const target = workspace.documents.find((document) => document.id === id);
    if (!target || !window.confirm(`確定刪除「${target.filename}」？此動作無法復原。`)) return;
    setWorkspace((current) => {
      let documents = current.documents.filter((document) => document.id !== id);
      if (!documents.length) documents = [createDocument()];
      return {
        ...current,
        documents,
        activeId: current.activeId === id ? documents[0].id : current.activeId,
      };
    });
    notify("文件已刪除");
  };

  const restoreSnapshot = (snapshotId: string) => {
    const snapshot = activeDocument.snapshots.find((item) => item.id === snapshotId);
    if (!snapshot || !window.confirm(`還原「${snapshot.label}」？目前內容會先建立備份。`)) return;
    updateActiveDocument((document) => ({
      ...addSnapshot(document, "還原前自動備份"),
      content: snapshot.content,
      updatedAt: Date.now(),
    }));
    notify("快照已還原");
  };

  const previewQuickFix = (fixId: QuickFixId, title: string) => {
    const after = applyQuickFix(markdown, fixId, filename);
    if (after === markdown) {
      notify("目前內容不需要此修正");
      return;
    }
    setFixPreview({ title, before: markdown, after });
  };

  const applyPreviewedFix = () => {
    if (!fixPreview) return;
    snapshotActive(`套用「${fixPreview.title}」前`);
    setMarkdown(fixPreview.after);
    setFixPreview(null);
    notify("修正已套用，可從版本快照還原");
  };

  const selectMatch = useCallback(
    (index: number) => {
      if (!matches.length) return;
      const normalized = (index + matches.length) % matches.length;
      setCurrentMatch(normalized);
      const match = matches[normalized];
      if (mode === "preview") setMode("split");
      window.requestAnimationFrame(() => {
        const area = textareaRef.current;
        if (!area) return;
        area.focus();
        area.setSelectionRange(match.start, match.end);
        const lineHeight = Number.parseFloat(window.getComputedStyle(area).lineHeight) || 21;
        area.scrollTo({ top: Math.max(0, (match.line - 3) * lineHeight), behavior: "smooth" });
        locatePreview(match.line);
      });
    },
    [locatePreview, matches, mode],
  );

  const replaceCurrent = () => {
    const match = matches[activeMatchIndex];
    if (!match) return;
    snapshotActive("搜尋取代前");
    setMarkdown(markdown.slice(0, match.start) + replacement + markdown.slice(match.end));
    notify("已取代目前結果");
  };

  const replaceEveryMatch = () => {
    if (!matches.length || !window.confirm(`確定取代全部 ${matches.length} 筆結果？`)) return;
    snapshotActive("全部取代前");
    setMarkdown(replaceAllMatches(markdown, searchQuery, replacement, matchCase));
    notify(`已取代 ${matches.length} 筆結果`);
  };

  const copyAiPrompt = async () => {
    await navigator.clipboard.writeText(buildAiPrompt(markdown));
    notify("AI 協作提示已複製");
  };

  const resetExample = () => {
    if (!window.confirm("確定還原 v0.4 範例文件？目前內容會先建立版本快照。")) return;
    snapshotActive("還原範例前");
    setMarkdown(STARTER_DOCUMENT);
    setFilename("document-workflow.md");
    notify("已還原範例文件");
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><FileCode2 size={19} /></div>
          <div>
            <strong>Markdown Mermaid Studio</strong>
            <span>v{packageInfo.version} · 本機優先生產力工作台</span>
          </div>
        </div>
        <div className="top-actions">
          <span className="version-badge">Mermaid {MERMAID_VERSION}</span>
          <button className="icon-button" onClick={() => setDark((value) => !value)} aria-label={dark ? "切換淺色模式" : "切換深色模式"}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="button secondary" onClick={() => fileInputRef.current?.click()}><FileUp size={17} />匯入 MD</button>
          <button className="button primary" onClick={download}><Download size={17} />下載 MD</button>
          <input ref={fileInputRef} type="file" accept=".md,.markdown,.mdown,.mkd,.txt,text/markdown,text/plain" hidden onChange={(event) => void handleFile(event.target.files?.[0])} />
        </div>
      </header>

      <section className="document-bar">
        <div className="filename-wrap">
          <button className="document-manager-button" type="button" onClick={() => setDocumentsOpen(true)}><Files size={16} /><span>{workspace.documents.length}</span></button>
          <span className="saved-dot" />
          <input value={filename} onChange={(event) => setFilename(event.target.value)} onBlur={() => setFilename(normalizeMarkdownFilename(filename))} aria-label="檔案名稱" />
          <span className="saved-label">已儲存於本機</span>
        </div>
        <div className="document-tools">
          <button type="button" className={`sync-button ${syncPosition ? "active" : ""}`} onClick={() => setSyncPosition((value) => !value)} aria-pressed={syncPosition} title="游標與預覽雙向定位">
            <ArrowLeftRight size={15} /><span>{syncPosition ? "雙向定位" : "定位關閉"}</span>
          </button>
          <button type="button" className="utility-button" onClick={() => setSearchOpen((value) => !value)} title="搜尋與取代"><Search size={15} /><span>搜尋</span></button>
          <button type="button" className="utility-button" onClick={() => setCatalogOpen(true)} title="語法目錄"><BookOpen size={15} /><span>語法</span></button>
        </div>
        <div className="mode-switch" aria-label="顯示模式">
          <button className={mode === "editor" ? "active" : ""} onClick={() => setMode("editor")}>編輯</button>
          <button className={mode === "split" ? "active" : ""} onClick={() => setMode("split")}>並排</button>
          <button className={mode === "preview" ? "active" : ""} onClick={() => setMode("preview")}>預覽</button>
        </div>
        <button className={`assistant-toggle ${assistantOpen ? "active" : ""}`} onClick={() => setAssistantOpen((value) => !value)} aria-expanded={assistantOpen}>
          <Sparkles size={16} />文件健檢 {assistantOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
      </section>

      <section className="workspace">
        <div
          ref={stageRef}
          className={`main-stage mode-${mode} ${assistantOpen ? "with-assistant" : ""} ${resizing ? "is-resizing" : ""}`}
          style={{
            "--editor-fr": `${splitPercent}fr`,
            "--preview-fr": `${100 - splitPercent}fr`,
          } as CSSProperties}
        >
          <div className={`editor-pane ${mode === "preview" ? "hidden-pane" : ""}`}>
            <div className="pane-heading">
              <div><span className="eyebrow">SOURCE</span><strong>Markdown</strong></div>
              <div className="editor-tools">
                <button onClick={() => insertText("\n## 新段落\n\n在這裡輸入內容。\n")} title="插入標題">H2</button>
                <button onClick={() => insertText("\n- [ ] 待確認項目\n")} title="插入核取清單">☑</button>
                <button onClick={() => insertText("\n| 項目 | 說明 |\n|---|---|\n| 範例 | 內容 |\n")} title="插入表格">▦</button>
                <button className="catalog-trigger" onClick={() => setCatalogOpen(true)} title="開啟完整 Mermaid 與 Markdown 語法目錄"><BookOpen size={14} /><span>完整語法</span></button>
              </div>
            </div>
            <SearchPanel
              open={searchOpen}
              query={searchQuery}
              replacement={replacement}
              matchCase={matchCase}
              current={activeMatchIndex}
              total={matches.length}
              onQuery={(value) => { setSearchQuery(value); setCurrentMatch(0); }}
              onReplacement={setReplacement}
              onMatchCase={setMatchCase}
              onNext={() => selectMatch(activeMatchIndex + 1)}
              onPrevious={() => selectMatch(activeMatchIndex - 1)}
              onReplace={replaceCurrent}
              onReplaceAll={replaceEveryMatch}
              onClose={() => setSearchOpen(false)}
            />
            <textarea
              ref={textareaRef}
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
              onClick={handleEditorSelection}
              onKeyUp={handleEditorSelection}
              onSelect={handleEditorSelection}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "s") {
                  event.preventDefault();
                  download();
                }
                if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "f") {
                  event.preventDefault();
                  setSearchOpen(true);
                }
              }}
              spellCheck={false}
              aria-label="Markdown 編輯器"
            />
            <div className="pane-status">
              <span>{markdown.split("\n").length} 行</span>
              <span>{countWords(markdown)} 字詞</span>
              <span>{mermaidBlocks.length} 張圖</span>
              <span>UTF-8</span>
              {activeSourceLine && <span className="located-line">定位第 {activeSourceLine} 行</span>}
            </div>
          </div>

          {mode === "split" && (
            <div
              className="split-resizer"
              role="separator"
              aria-label="調整編輯區與預覽區寬度"
              aria-orientation="vertical"
              aria-valuemin={25}
              aria-valuemax={75}
              aria-valuenow={Math.round(splitPercent)}
              title="拖曳調整寬度；雙擊恢復平均"
              tabIndex={0}
              onPointerDown={handleResizeStart}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) resizeSplit(event.clientX);
              }}
              onPointerUp={(event) => {
                event.currentTarget.releasePointerCapture(event.pointerId);
                setResizing(false);
              }}
              onPointerCancel={() => setResizing(false)}
              onDoubleClick={() => setSplitPercent(50)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                const direction = event.key === "ArrowLeft" ? -1 : 1;
                setSplitPercent((value) => Math.min(75, Math.max(25, value + direction * (event.shiftKey ? 5 : 2))));
              }}
            >
              <span className="split-resizer-handle" aria-hidden="true"><i /><i /><i /></span>
            </div>
          )}

          <div ref={previewPaneRef} className={`preview-pane ${mode === "editor" ? "hidden-pane" : ""}`}>
            <div className="pane-heading preview-heading">
              <div><span className="eyebrow">PREVIEW</span><strong>即時預覽</strong></div>
              <div className="validation-state">
                {checking ? <><span className="pulse-dot" />檢查中</> : checks.some((item) => !item.ok) ? (
                  <button type="button" onClick={() => jumpSource(checks.find((item) => !item.ok)?.line || 1)}><span className="error-dot" />需要修正</button>
                ) : <><Check size={15} />語法正常</>}
              </div>
            </div>
            <MarkdownPreview
              markdown={markdown}
              dark={dark}
              activeLine={activeSourceLine}
              onJumpSource={jumpSource}
              onNotify={notify}
            />
          </div>

          {assistantOpen && (
            <aside className="assistant-pane">
              <div className="assistant-heading">
                <div className="assistant-icon"><Sparkles size={17} /></div>
                <div><span className="eyebrow">DOCUMENT COACH</span><strong>完善建議</strong></div>
              </div>
              <p className="assistant-intro">先用可驗證規則檢查並直接修正；需要語意改寫時，再帶著完整提示交給 AI。</p>
              <div className="score-card">
                <div><span>文件狀態</span><strong>{issues.some((issue) => issue.level === "warn") ? "可再改善" : "結構良好"}</strong></div>
                <div className="score-ring">{issues.filter((issue) => issue.level !== "warn").length}/{issues.length}</div>
              </div>
              <div className="suggestion-list">
                {issues.map((issue) => (
                  <div className={`suggestion ${issue.level}`} key={issue.id}>
                    <span className="suggestion-mark">{issue.level === "good" ? <Check size={14} /> : <Lightbulb size={14} />}</span>
                    <div><strong>{issue.title}</strong><p>{issue.detail}</p>
                      {(issue.line || issue.fixId) && <div className="suggestion-actions">
                        {issue.line && <button type="button" onClick={() => jumpSource(issue.line || 1)}>定位來源</button>}
                        {issue.fixId && <button type="button" onClick={() => previewQuickFix(issue.fixId as QuickFixId, issue.title)}>{issue.fixLabel}</button>}
                      </div>}
                    </div>
                  </div>
                ))}
              </div>
              <button className="button assistant-action" onClick={() => void copyAiPrompt()}><Clipboard size={16} />複製 AI 完善提示</button>
              <button className="text-action" onClick={() => { snapshotActive("手動快照"); notify("版本快照已建立"); }}><Camera size={14} />建立目前版本快照</button>
              <button className="text-action" onClick={resetExample}><FileCode2 size={14} />還原 v0.4 範例文件</button>
              <div className="privacy-note"><span>●</span> 文件不會上傳；多文件與快照只保存在這台裝置。</div>
            </aside>
          )}
        </div>
      </section>

      <DocumentDrawer
        open={documentsOpen}
        workspace={workspace}
        onClose={() => setDocumentsOpen(false)}
        onCreate={createNewDocument}
        onActivate={(id) => { setWorkspace((current) => ({ ...current, activeId: id })); setMode("split"); }}
        onDuplicate={duplicateDocument}
        onDelete={deleteDocument}
        onSnapshot={() => { snapshotActive("手動快照"); notify("版本快照已建立"); }}
        onRestore={restoreSnapshot}
      />
      <SyntaxCatalog open={catalogOpen} onClose={() => setCatalogOpen(false)} onInsert={insertText} />

      {fixPreview && (
        <div className="fix-backdrop" role="presentation" onMouseDown={() => setFixPreview(null)}>
          <section className="fix-dialog" role="dialog" aria-modal="true" aria-label="修正前後比較" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><Sparkles size={17} /><span><strong>{fixPreview.title}</strong><small>確認差異後再套用，原始內容會建立快照</small></span></div><button type="button" onClick={() => setFixPreview(null)}>取消</button></header>
            <div className="fix-columns">
              <label><span>修改前</span><textarea readOnly value={fixPreview.before} /></label>
              <label><span>修改後</span><textarea readOnly value={fixPreview.after} /></label>
            </div>
            <footer><button type="button" onClick={() => setFixPreview(null)}>保留原文</button><button type="button" className="button primary" onClick={applyPreviewedFix}><Check size={15} />套用修正</button></footer>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
    </main>
  );
}
