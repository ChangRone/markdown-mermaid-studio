"use client";

import {
  Camera,
  Copy,
  FilePlus2,
  Files,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import type { StudioWorkspace } from "@/lib/studio";

type DocumentDrawerProps = {
  open: boolean;
  workspace: StudioWorkspace;
  onClose: () => void;
  onCreate: () => void;
  onActivate: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onSnapshot: () => void;
  onRestore: (snapshotId: string) => void;
};

function formatTime(value: number) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function DocumentDrawer({
  open,
  workspace,
  onClose,
  onCreate,
  onActivate,
  onDuplicate,
  onDelete,
  onSnapshot,
  onRestore,
}: DocumentDrawerProps) {
  if (!open) return null;
  const active =
    workspace.documents.find((document) => document.id === workspace.activeId) ||
    workspace.documents[0];

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
                <button type="button" title="複製文件" onClick={() => onDuplicate(document.id)}><Copy size={13} /></button>
                <button type="button" title="刪除文件" onClick={() => onDelete(document.id)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="snapshot-heading">
          <div><Camera size={15} /><span><strong>版本快照</strong><small>最多保留 20 份</small></span></div>
          <button type="button" onClick={onSnapshot}>建立快照</button>
        </div>
        <div className="snapshot-list">
          {active.snapshots.length ? active.snapshots.map((snapshot) => (
            <div className="snapshot-item" key={snapshot.id}>
              <div><strong>{snapshot.label}</strong><span>{formatTime(snapshot.createdAt)}</span></div>
              <button type="button" onClick={() => onRestore(snapshot.id)}><RotateCcw size={13} />還原</button>
            </div>
          )) : <p>尚未建立快照。套用快速修正或還原範例前，系統也會自動建立快照。</p>}
        </div>
      </aside>
    </div>
  );
}
