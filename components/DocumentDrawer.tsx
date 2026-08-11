"use client";

import {
  Camera,
  Copy,
  Database,
  Download,
  FileJson,
  FilePlus2,
  Files,
  GitCompareArrows,
  Pencil,
  Pin,
  PinOff,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  MAX_PINNED_SNAPSHOTS,
  MAX_SNAPSHOTS,
  type Snapshot,
  type StudioWorkspace,
} from "@/lib/studio";

type DocumentDrawerProps = {
  open: boolean;
  workspace: StudioWorkspace;
  storageBytes: number;
  onClose: () => void;
  onCreate: () => void;
  onActivate: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onSnapshot: (label: string, tags: string) => void;
  onRestore: (snapshotId: string) => void;
  onUpdateSnapshot: (snapshotId: string, label: string, tags: string) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
  onToggleSnapshotPinned: (snapshotId: string) => void;
  onCompareSnapshot: (snapshot: Snapshot) => void;
  onDownloadSnapshot: (snapshot: Snapshot) => void;
  onExportWorkspace: () => void;
  onImportWorkspace: (file: File) => void;
};

function formatTime(value: number) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

export default function DocumentDrawer({
  open,
  workspace,
  storageBytes,
  onClose,
  onCreate,
  onActivate,
  onDuplicate,
  onDelete,
  onSnapshot,
  onRestore,
  onUpdateSnapshot,
  onDeleteSnapshot,
  onToggleSnapshotPinned,
  onCompareSnapshot,
  onDownloadSnapshot,
  onExportWorkspace,
  onImportWorkspace,
}: DocumentDrawerProps) {
  const [creating, setCreating] = useState(false);
  const [createLabel, setCreateLabel] = useState("");
  const [createTags, setCreateTags] = useState("");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string>();
  const [editLabel, setEditLabel] = useState("");
  const [editTags, setEditTags] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const active =
    workspace.documents.find((document) => document.id === workspace.activeId) ||
    workspace.documents[0];
  const filteredSnapshots = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return [...active.snapshots]
      .filter((snapshot) =>
        !needle ||
        snapshot.label.toLocaleLowerCase().includes(needle) ||
        snapshot.tags.some((tag) => tag.toLocaleLowerCase().includes(needle)),
      )
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt);
  }, [active.snapshots, query]);

  if (!open) return null;

  const createSnapshot = () => {
    onSnapshot(createLabel || "手動快照", createTags);
    setCreateLabel("");
    setCreateTags("");
    setCreating(false);
  };

  const beginEditing = (snapshot: Snapshot) => {
    setEditingId(snapshot.id);
    setEditLabel(snapshot.label);
    setEditTags(snapshot.tags.join(", "));
  };

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="document-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="文件與歷史快照"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="drawer-heading">
          <div><Files size={18} /><span><strong>本機文件</strong><small>{workspace.documents.length} 份文件</small></span></div>
          <button type="button" onClick={onClose} aria-label="關閉文件管理"><X size={18} /></button>
        </div>

        <div className="workspace-backup-actions">
          <button type="button" onClick={onExportWorkspace}><Download size={14} />匯出工作區</button>
          <button type="button" onClick={() => importRef.current?.click()}><FileJson size={14} />匯入備份</button>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImportWorkspace(file);
              event.currentTarget.value = "";
            }}
          />
        </div>

        <div className="storage-card">
          <Database size={15} />
          <div>
            <strong>此瀏覽器 localStorage · 約 {formatBytes(storageBytes)}</strong>
            <span>沒有固定到期日；清除網站資料、無痕視窗關閉、裝置更換或瀏覽器回收空間時可能遺失。重要內容請匯出工作區備份。</span>
          </div>
        </div>

        <button type="button" className="drawer-primary" onClick={onCreate}>
          <FilePlus2 size={16} />新增空白文件
        </button>

        <div className="document-list">
          {workspace.documents.map((document) => (
            <div
              className={`document-item ${document.id === workspace.activeId ? "active" : ""}`}
              key={document.id}
            >
              <button type="button" className="document-main" onClick={() => onActivate(document.id)}>
                <strong>{document.filename}</strong>
                <span>{document.content.split("\n").length} 行 · {formatTime(document.updatedAt)}</span>
              </button>
              <div className="document-item-actions">
                <button type="button" aria-label={`複製 ${document.filename}`} title="複製文件" onClick={() => onDuplicate(document.id)}><Copy size={13} /></button>
                <button type="button" aria-label={`刪除 ${document.filename}`} title="刪除文件" onClick={() => onDelete(document.id)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="snapshot-heading">
          <div><Camera size={15} /><span><strong>版本快照</strong><small>{active.snapshots.length}/{MAX_SNAPSHOTS} · 最多釘選 {MAX_PINNED_SNAPSHOTS} 份</small></span></div>
          <button type="button" onClick={() => setCreating((value) => !value)}>{creating ? "取消" : "建立快照"}</button>
        </div>

        {creating && (
          <div className="snapshot-form">
            <label><span>版本名稱</span><input value={createLabel} onChange={(event) => setCreateLabel(event.target.value)} placeholder="例如：完成初稿" maxLength={60} autoFocus /></label>
            <label><span>標籤</span><input value={createTags} onChange={(event) => setCreateTags(event.target.value)} placeholder="審核, Mermaid（最多 5 個）" /></label>
            <button type="button" onClick={createSnapshot}>儲存目前版本</button>
          </div>
        )}

        {active.snapshots.length > 0 && (
          <label className="snapshot-filter">
            <Search size={13} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋快照名稱或標籤" aria-label="搜尋快照" />
          </label>
        )}

        <div className="snapshot-list">
          {filteredSnapshots.length ? filteredSnapshots.map((snapshot) => (
            <div className={`snapshot-item ${snapshot.pinned ? "pinned" : ""}`} key={snapshot.id}>
              {editingId === snapshot.id ? (
                <div className="snapshot-edit-form">
                  <input value={editLabel} onChange={(event) => setEditLabel(event.target.value)} aria-label="快照名稱" maxLength={60} />
                  <input value={editTags} onChange={(event) => setEditTags(event.target.value)} aria-label="快照標籤" placeholder="標籤以逗號分隔" />
                  <div><button type="button" onClick={() => setEditingId(undefined)}>取消</button><button type="button" onClick={() => { onUpdateSnapshot(snapshot.id, editLabel, editTags); setEditingId(undefined); }}>儲存</button></div>
                </div>
              ) : (
                <>
                  <div className="snapshot-summary">
                    <div><strong>{snapshot.label}</strong>{snapshot.pinned && <Pin size={11} aria-label="已釘選" />}</div>
                    <span>{formatTime(snapshot.createdAt)} · {snapshot.content.split("\n").length} 行</span>
                    {snapshot.tags.length > 0 && <div className="snapshot-tags">{snapshot.tags.map((tag) => <em key={tag}>#{tag}</em>)}</div>}
                  </div>
                  <div className="snapshot-actions">
                    <button type="button" aria-label={snapshot.pinned ? "取消釘選" : "釘選快照"} title={snapshot.pinned ? "取消釘選" : "釘選（避免自動淘汰）"} onClick={() => onToggleSnapshotPinned(snapshot.id)}>{snapshot.pinned ? <PinOff size={12} /> : <Pin size={12} />}</button>
                    <button type="button" aria-label="比較快照" title="與目前內容比較" onClick={() => onCompareSnapshot(snapshot)}><GitCompareArrows size={12} /></button>
                    <button type="button" aria-label="編輯快照資訊" title="編輯名稱與標籤" onClick={() => beginEditing(snapshot)}><Pencil size={12} /></button>
                    <button type="button" aria-label="下載快照" title="下載此快照 MD" onClick={() => onDownloadSnapshot(snapshot)}><Download size={12} /></button>
                    <button type="button" aria-label="還原快照" title="還原" onClick={() => onRestore(snapshot.id)}><RotateCcw size={12} /></button>
                    <button type="button" aria-label="刪除快照" title="刪除" onClick={() => onDeleteSnapshot(snapshot.id)}><Trash2 size={12} /></button>
                  </div>
                </>
              )}
            </div>
          )) : active.snapshots.length ? (
            <p>找不到符合「{query}」的快照。</p>
          ) : (
            <p>尚未建立快照。快速修正、全部取代或還原內容前，系統也會自動建立安全快照。</p>
          )}
        </div>
      </aside>
    </div>
  );
}
