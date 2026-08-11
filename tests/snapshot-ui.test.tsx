import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import DocumentDrawer from "../components/DocumentDrawer";
import SnapshotCompareDialog from "../components/SnapshotCompareDialog";
import { addSnapshot, createDefaultWorkspace } from "../lib/studio";

test("snapshot manager exposes backup, metadata and management actions", () => {
  const workspace = createDefaultWorkspace(1);
  workspace.documents[0] = addSnapshot(
    workspace.documents[0],
    "審核版",
    "# 審核版",
    2,
    ["review", "P2"],
  );
  const html = renderToStaticMarkup(
    <DocumentDrawer
      open
      workspace={workspace}
      storageBytes={2048}
      onClose={() => undefined}
      onCreate={() => undefined}
      onActivate={() => undefined}
      onDuplicate={() => undefined}
      onDelete={() => undefined}
      onSnapshot={() => undefined}
      onRestore={() => undefined}
      onUpdateSnapshot={() => undefined}
      onDeleteSnapshot={() => undefined}
      onToggleSnapshotPinned={() => undefined}
      onCompareSnapshot={() => undefined}
      onDownloadSnapshot={() => undefined}
      onExportWorkspace={() => undefined}
      onImportWorkspace={() => undefined}
    />,
  );
  assert.match(html, /匯出工作區/);
  assert.match(html, /匯入備份/);
  assert.match(html, /localStorage/);
  assert.match(html, /審核版/);
  assert.match(html, /#review/);
  assert.match(html, /aria-label="刪除快照"/);
  assert.match(html, /aria-label="比較快照"/);
});

test("snapshot comparison summarizes and renders both versions", () => {
  const workspace = createDefaultWorkspace(1);
  const document = addSnapshot(workspace.documents[0], "v1", "A\nold\nZ", 2);
  const snapshot = document.snapshots[0];
  const html = renderToStaticMarkup(
    <SnapshotCompareDialog
      snapshot={snapshot}
      currentContent={"A\nnew\nextra\nZ"}
      onClose={() => undefined}
      onRestore={() => undefined}
      onDownload={() => undefined}
    />,
  );
  assert.match(html, /變更區移除 1 行/);
  assert.match(html, /變更區新增 2 行/);
  assert.match(html, /還原這個版本/);
});
