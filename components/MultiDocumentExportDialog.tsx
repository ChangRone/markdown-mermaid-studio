"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  Eye,
  FileStack,
  FileUp,
  LoaderCircle,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  buildSingleHtml,
  MAX_MERGE_FILES,
  MAX_MERGE_TOTAL_BYTES,
  prepareSingleHtml,
  type MergeSource,
  type SingleHtmlBuild,
} from "@/lib/single-html";

type SelectedSource = MergeSource & { id: string };

type MultiDocumentExportDialogProps = {
  open: boolean;
  dark: boolean;
  onClose: () => void;
  onNotify: (message: string) => void;
};

function normalizeHtmlFilename(value: string) {
  const clean = value.trim().replace(/[\\/:*?"<>|]/g, "-").replace(/\.html?$/iu, "");
  return `${clean || "developer_guide"}.html`;
}

function downloadContent(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function formatSize(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

export default function MultiDocumentExportDialog({
  open,
  dark,
  onClose,
  onNotify,
}: MultiDocumentExportDialogProps) {
  const [sources, setSources] = useState<SelectedSource[]>([]);
  const [title, setTitle] = useState("合併文件指南");
  const [filename, setFilename] = useState("developer_guide.html");
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<{ key: string; message: string } | null>(null);
  const [resultState, setResultState] = useState<{ key: string; build: SingleHtmlBuild } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const prepared = useMemo(
    () => sources.length ? prepareSingleHtml(sources) : null,
    [sources],
  );
  const buildKey = `${dark ? "dark" : "light"}|${title}|${sources.map((source) => source.id).join("|")}`;
  const result = resultState?.key === buildKey ? resultState.build : null;
  const visibleBuildError = buildError?.key === buildKey ? buildError.message : "";

  if (!open) return null;

  const selectFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    if (files.length > MAX_MERGE_FILES) {
      onNotify(`一次最多選擇 ${MAX_MERGE_FILES} 份文件`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const totalSize = [...files].reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_MERGE_TOTAL_BYTES) {
      onNotify("全部文件合計不可超過 20 MB");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    try {
      const selected = await Promise.all([...files].map(async (file, index) => {
        const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
        return {
          id: `${file.name}-${file.lastModified}-${index}`,
          name: file.name,
          path: relativePath || file.name,
          size: file.size,
          content: await file.text(),
        };
      }));
      setSources(selected);
      onNotify(`已選擇 ${selected.length} 份文件，可調整合併順序`);
    } catch (reason) {
      onNotify(`無法讀取文件：${reason instanceof Error ? reason.message : String(reason)}`);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sources.length) return;
    setSources((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const preview = async () => {
    if (!sources.length || prepared?.errors.length) return;
    setBuilding(true);
    setBuildError(null);
    try {
      const next = await buildSingleHtml(sources, { title, dark });
      setResultState({ key: buildKey, build: next });
      onNotify(`單頁預覽完成：${next.summary.fileCount} 份文件、${next.summary.anchorCount} 個 Anchor`);
    } catch (reason) {
      setBuildError({ key: buildKey, message: reason instanceof Error ? reason.message : String(reason) });
    } finally {
      setBuilding(false);
    }
  };

  const canBuild = Boolean(sources.length && prepared && !prepared.errors.length && !building);

  return (
    <div className="merge-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="merge-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="多份 Markdown 合併成單頁 HTML"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div><FileStack size={18} /><span><strong>多檔合併</strong><small>在瀏覽器內建立 Anchor、預覽並下載單一 HTML</small></span></div>
          <button type="button" onClick={onClose} aria-label="關閉多檔合併"><X size={18} /></button>
        </header>

        <div className="merge-layout">
          <aside className="merge-controls">
            <button className="merge-file-picker" type="button" onClick={() => fileRef.current?.click()}>
              <FileUp size={16} />選擇多份 MD
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".md,.markdown,.mdown,.mkd,.txt,text/markdown,text/plain"
              multiple
              hidden
              onChange={(event) => void selectFiles(event.currentTarget.files)}
            />

            <div className="merge-fields">
              <label><span>網頁標題</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
              <label><span>HTML 檔名</span><input value={filename} onChange={(event) => setFilename(event.target.value)} onBlur={() => setFilename(normalizeHtmlFilename(filename))} /></label>
            </div>

            <div className="merge-source-heading">
              <strong>合併順序</strong><span>{sources.length} 份文件</span>
            </div>
            <div className="merge-source-list">
              {!sources.length && <p>按「選擇多份 MD」後，文件會依這裡的順序合併。</p>}
              {sources.map((source, index) => (
                <div className="merge-source-item" key={source.id}>
                  <span className="merge-order">{index + 1}</span>
                  <div><strong>{source.name}</strong><small>{formatSize(source.size || 0)}</small></div>
                  <div className="merge-source-actions">
                    <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`上移 ${source.name}`}><ArrowUp size={13} /></button>
                    <button type="button" disabled={index === sources.length - 1} onClick={() => move(index, 1)} aria-label={`下移 ${source.name}`}><ArrowDown size={13} /></button>
                    <button type="button" onClick={() => setSources((current) => current.filter((item) => item.id !== source.id))} aria-label={`移除 ${source.name}`}><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>

            {prepared && (
              <div className={`merge-validation ${prepared.errors.length ? "invalid" : "valid"}`}>
                <div>{prepared.errors.length ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}<strong>{prepared.errors.length ? "需要修正" : "連結檢查通過"}</strong></div>
                {!prepared.errors.length && <p>{prepared.summary.anchorCount} 個 Anchor · 改寫 {prepared.summary.rewrittenLinks} 個跨檔／頁內連結 · {prepared.summary.mermaidCount} 張 Mermaid</p>}
                {prepared.errors.map((error) => <p key={error}>{error}</p>)}
                {prepared.warnings.map((warning) => <p className="warning" key={warning}>{warning}</p>)}
              </div>
            )}
            {visibleBuildError && <div className="merge-build-error" role="alert">{visibleBuildError}</div>}

            <div className="merge-primary-actions">
              <button type="button" disabled={!canBuild} onClick={() => void preview()}>
                {building ? <LoaderCircle className="spin" size={15} /> : <Eye size={15} />}
                {building ? "產生中" : "檢查連結並預覽"}
              </button>
              <button type="button" disabled={!prepared || prepared.errors.length > 0} onClick={() => {
                if (!prepared) return;
                downloadContent(prepared.markdown, "all.md", "text/markdown;charset=utf-8");
                onNotify("合併 Markdown 已下載");
              }}><Download size={14} />下載合併 MD</button>
              <button type="button" disabled={!result} onClick={() => {
                if (!result) return;
                downloadContent(result.html, normalizeHtmlFilename(filename), "text/html;charset=utf-8");
                onNotify("單頁 HTML 已下載");
              }}><Download size={14} />下載單頁 HTML</button>
            </div>
          </aside>

          <div className="merge-preview">
            {result ? (
              <iframe title="單頁 HTML 預覽" sandbox="" srcDoc={result.html} />
            ) : (
              <div className="merge-preview-empty"><FileStack size={34} /><strong>單頁預覽</strong><p>選擇文件並通過連結檢查後，預覽會顯示在這裡。</p></div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
