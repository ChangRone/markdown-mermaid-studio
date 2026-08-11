"use client";

import { Download, GitCompareArrows, RotateCcw, X } from "lucide-react";
import { snapshotDifference, type Snapshot } from "@/lib/studio";

type SnapshotCompareDialogProps = {
  snapshot: Snapshot | null;
  currentContent: string;
  onClose: () => void;
  onRestore: (snapshotId: string) => void;
  onDownload: (snapshot: Snapshot) => void;
};

export default function SnapshotCompareDialog({
  snapshot,
  currentContent,
  onClose,
  onRestore,
  onDownload,
}: SnapshotCompareDialogProps) {
  if (!snapshot) return null;
  const difference = snapshotDifference(snapshot.content, currentContent);

  return (
    <div className="snapshot-compare-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="snapshot-compare-dialog" role="dialog" aria-modal="true" aria-label="快照與目前內容比較" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><GitCompareArrows size={18} /><span><strong>{snapshot.label}</strong><small>快照與目前內容並排比較</small></span></div>
          <button type="button" onClick={onClose} aria-label="關閉快照比較"><X size={17} /></button>
        </header>
        <div className="compare-stats">
          {difference.identical ? <strong>內容完全相同</strong> : <>
            <span>快照 {difference.beforeLines} 行</span>
            <span>目前 {difference.afterLines} 行</span>
            <span className="removed">變更區移除 {difference.removedLines} 行</span>
            <span className="added">變更區新增 {difference.addedLines} 行</span>
          </>}
        </div>
        <div className="compare-columns">
          <label><span>快照：{snapshot.label}</span><textarea readOnly value={snapshot.content} /></label>
          <label><span>目前文件</span><textarea readOnly value={currentContent} /></label>
        </div>
        <footer>
          <button type="button" onClick={() => onDownload(snapshot)}><Download size={14} />下載快照</button>
          <button type="button" className="button primary" onClick={() => onRestore(snapshot.id)}><RotateCcw size={14} />還原這個版本</button>
        </footer>
      </section>
    </div>
  );
}
