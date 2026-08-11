export const WORKSPACE_STORAGE_KEY = "md-mermaid-studio-workspace-v5";
export const LEGACY_WORKSPACE_STORAGE_KEY = "md-mermaid-studio-workspace-v4";
export const UI_STORAGE_KEY = "md-mermaid-studio-ui-v4";
export const MAX_SNAPSHOTS = 20;
export const MAX_PINNED_SNAPSHOTS = 5;
export const MAX_SNAPSHOT_TAGS = 5;

export const STARTER_DOCUMENT = `---
title: 文件處理與簽核流程
status: draft
---

# 文件處理與簽核流程

這是一份可以直接修改、預覽、定位與匯出的 Markdown 文件。內容只會儲存在目前的瀏覽器。

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

## 公式範例

行內公式：$E = mc^2$；區塊公式：

$$
score = \\frac{completed}{total} \\times 100
$$

> 提示：在並排模式把游標移到來源段落，預覽會定位到對應內容；點選預覽文字則會回到來源行。
`;

export type Snapshot = {
  id: string;
  label: string;
  tags: string[];
  pinned: boolean;
  content: string;
  createdAt: number;
};

export type StudioDocument = {
  id: string;
  filename: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  snapshots: Snapshot[];
};

export type StudioWorkspace = {
  version: 5;
  activeId: string;
  documents: StudioDocument[];
};

export type WorkspaceBackup = {
  format: "markdown-mermaid-studio-backup";
  schemaVersion: 1;
  appVersion: string;
  exportedAt: number;
  workspace: StudioWorkspace;
  preferences?: UiPreferences;
};

export type SnapshotDifference = {
  beforeLines: number;
  afterLines: number;
  commonPrefixLines: number;
  commonSuffixLines: number;
  removedLines: number;
  addedLines: number;
  identical: boolean;
};

export type UiPreferences = {
  dark: boolean;
  splitPercent: number;
  syncPosition: boolean;
  mode: "split" | "editor" | "preview";
};

export type MermaidBlock = {
  index: number;
  code: string;
  fenceLine: number;
  codeLine: number;
  endLine: number;
};

export type MermaidCheck = {
  index: number;
  line: number;
  column?: number;
  ok: boolean;
  message: string;
};

export type QuickFixId =
  | "add-title"
  | "normalize-headings"
  | "add-checklist"
  | "add-image-alt";

export type DocumentIssue = {
  id: string;
  level: "good" | "warn" | "tip";
  title: string;
  detail: string;
  line?: number;
  fixId?: QuickFixId;
  fixLabel?: string;
};

export type SearchMatch = {
  start: number;
  end: number;
  line: number;
};

export function createId(prefix = "item") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createDocument(
  filename = "untitled.md",
  content = "# 未命名文件\n\n在這裡開始編輯。\n",
  now = Date.now(),
): StudioDocument {
  return {
    id: createId("doc"),
    filename: normalizeMarkdownFilename(filename),
    content,
    createdAt: now,
    updatedAt: now,
    snapshots: [],
  };
}

export function createDefaultWorkspace(now = Date.now()): StudioWorkspace {
  const document = createDocument("document-workflow.md", STARTER_DOCUMENT, now);
  return { version: 5, activeId: document.id, documents: [document] };
}

export function normalizeMarkdownFilename(filename: string) {
  const cleaned = filename.trim().replace(/[\\/:*?"<>|]/g, "-") || "document";
  const withoutSupportedExtension = cleaned.replace(/\.(?:md|markdown|mdown|mkd|txt)$/i, "");
  return `${withoutSupportedExtension || "document"}.md`;
}

export function normalizeSnapshotLabel(label: string) {
  const normalized = label.trim().replace(/\s+/g, " ").slice(0, 60);
  return normalized || "未命名快照";
}

export function normalizeSnapshotTags(tags: string[] | string) {
  const values = Array.isArray(tags) ? tags : tags.split(/[,，]/);
  const normalized: string[] = [];
  for (const value of values) {
    const tag = String(value).trim().replace(/^#+/, "").replace(/\s+/g, " ").slice(0, 20);
    if (!tag || normalized.some((item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase())) continue;
    normalized.push(tag);
    if (normalized.length >= MAX_SNAPSHOT_TAGS) break;
  }
  return normalized;
}

function normalizeStoredSnapshots(value: unknown) {
  if (!Array.isArray(value)) return [];
  let pinnedCount = 0;
  const snapshots: Snapshot[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Partial<Snapshot>;
    if (typeof candidate.content !== "string") continue;
    const pinned = candidate.pinned === true && pinnedCount < MAX_PINNED_SNAPSHOTS;
    if (pinned) pinnedCount += 1;
    snapshots.push({
      id: typeof candidate.id === "string" ? candidate.id : createId("snapshot"),
      label: normalizeSnapshotLabel(typeof candidate.label === "string" ? candidate.label : "舊版快照"),
      tags: normalizeSnapshotTags(Array.isArray(candidate.tags) ? candidate.tags : []),
      pinned,
      content: candidate.content,
      createdAt: Number(candidate.createdAt) || Date.now(),
    });
    if (snapshots.length >= MAX_SNAPSHOTS) break;
  }
  return snapshots;
}

export function parseWorkspace(value: string | null): StudioWorkspace | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<StudioWorkspace>;
    if (!Array.isArray(parsed.documents) || !parsed.documents.length) return null;
    const documents = parsed.documents.filter(
      (document): document is StudioDocument =>
        Boolean(
          document &&
            typeof document.id === "string" &&
            typeof document.filename === "string" &&
            typeof document.content === "string",
        ),
    );
    if (!documents.length) return null;
    return {
      version: 5,
      activeId: documents.some((document) => document.id === parsed.activeId)
        ? String(parsed.activeId)
        : documents[0].id,
      documents: documents.map((document) => ({
        ...document,
        filename: normalizeMarkdownFilename(document.filename),
        createdAt: Number(document.createdAt) || Date.now(),
        updatedAt: Number(document.updatedAt) || Date.now(),
        snapshots: normalizeStoredSnapshots(document.snapshots),
      })),
    };
  } catch {
    return null;
  }
}

export function parseUiPreferences(value: string | null): UiPreferences {
  const defaults: UiPreferences = {
    dark: false,
    splitPercent: 48,
    syncPosition: true,
    mode: "split",
  };
  if (!value) return defaults;
  try {
    const parsed = JSON.parse(value) as Partial<UiPreferences>;
    const split = Number(parsed.splitPercent);
    return {
      dark: parsed.dark === true,
      splitPercent: split >= 25 && split <= 75 ? split : defaults.splitPercent,
      syncPosition: parsed.syncPosition !== false,
      mode: ["split", "editor", "preview"].includes(String(parsed.mode))
        ? (parsed.mode as UiPreferences["mode"])
        : defaults.mode,
    };
  } catch {
    return defaults;
  }
}

export function migrateLegacyWorkspace(): StudioWorkspace | null {
  if (typeof window === "undefined") return null;
  const content = window.localStorage.getItem("md-mermaid-studio-document");
  if (!content) return null;
  const filename =
    window.localStorage.getItem("md-mermaid-studio-filename") || "document-workflow.md";
  const document = createDocument(filename, content);
  return { version: 5, activeId: document.id, documents: [document] };
}

function retainSnapshots(snapshots: Snapshot[]) {
  const pinnedIds = new Set(
    snapshots.filter((snapshot) => snapshot.pinned).slice(0, MAX_PINNED_SNAPSHOTS).map((snapshot) => snapshot.id),
  );
  let unpinnedSlots = Math.max(0, MAX_SNAPSHOTS - pinnedIds.size);
  return snapshots.filter((snapshot) => {
    if (pinnedIds.has(snapshot.id)) return true;
    if (unpinnedSlots <= 0) return false;
    unpinnedSlots -= 1;
    return true;
  });
}

export function addSnapshot(
  document: StudioDocument,
  label: string,
  content = document.content,
  now = Date.now(),
  tags: string[] = [],
  updateLatestMetadata = false,
): StudioDocument {
  const latest = document.snapshots[0];
  if (latest?.content === content) {
    if (!updateLatestMetadata) return document;
    const updated = {
      ...latest,
      label: normalizeSnapshotLabel(label),
      tags: normalizeSnapshotTags(tags),
      createdAt: now,
    };
    return { ...document, snapshots: [updated, ...document.snapshots.slice(1)] };
  }
  const snapshot: Snapshot = {
    id: createId("snapshot"),
    label: normalizeSnapshotLabel(label),
    tags: normalizeSnapshotTags(tags),
    pinned: false,
    content,
    createdAt: now,
  };
  return {
    ...document,
    snapshots: retainSnapshots([snapshot, ...document.snapshots]),
  };
}

export function updateSnapshot(
  document: StudioDocument,
  snapshotId: string,
  label: string,
  tags: string[] | string,
): StudioDocument {
  return {
    ...document,
    snapshots: document.snapshots.map((snapshot) =>
      snapshot.id === snapshotId
        ? { ...snapshot, label: normalizeSnapshotLabel(label), tags: normalizeSnapshotTags(tags) }
        : snapshot,
    ),
  };
}

export function deleteSnapshot(document: StudioDocument, snapshotId: string): StudioDocument {
  return {
    ...document,
    snapshots: document.snapshots.filter((snapshot) => snapshot.id !== snapshotId),
  };
}

export function toggleSnapshotPinned(document: StudioDocument, snapshotId: string): StudioDocument {
  const target = document.snapshots.find((snapshot) => snapshot.id === snapshotId);
  if (!target) return document;
  const pinnedCount = document.snapshots.filter((snapshot) => snapshot.pinned).length;
  if (!target.pinned && pinnedCount >= MAX_PINNED_SNAPSHOTS) return document;
  return {
    ...document,
    snapshots: document.snapshots.map((snapshot) =>
      snapshot.id === snapshotId ? { ...snapshot, pinned: !snapshot.pinned } : snapshot,
    ),
  };
}

export function snapshotDifference(before: string, after: string): SnapshotDifference {
  const beforeRows = before.split("\n");
  const afterRows = after.split("\n");
  let prefix = 0;
  while (prefix < beforeRows.length && prefix < afterRows.length && beforeRows[prefix] === afterRows[prefix]) {
    prefix += 1;
  }
  let suffix = 0;
  while (
    suffix < beforeRows.length - prefix &&
    suffix < afterRows.length - prefix &&
    beforeRows[beforeRows.length - 1 - suffix] === afterRows[afterRows.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  return {
    beforeLines: beforeRows.length,
    afterLines: afterRows.length,
    commonPrefixLines: prefix,
    commonSuffixLines: suffix,
    removedLines: Math.max(0, beforeRows.length - prefix - suffix),
    addedLines: Math.max(0, afterRows.length - prefix - suffix),
    identical: before === after,
  };
}

export function createWorkspaceBackup(
  workspace: StudioWorkspace,
  appVersion: string,
  preferences?: UiPreferences,
  now = Date.now(),
) {
  const backup: WorkspaceBackup = {
    format: "markdown-mermaid-studio-backup",
    schemaVersion: 1,
    appVersion,
    exportedAt: now,
    workspace,
    ...(preferences ? { preferences } : {}),
  };
  return JSON.stringify(backup, null, 2);
}

export function parseWorkspaceBackup(value: string) {
  try {
    const parsed = JSON.parse(value) as Partial<WorkspaceBackup> & Partial<StudioWorkspace>;
    const workspaceValue = parsed.workspace || parsed;
    const workspace = parseWorkspace(JSON.stringify(workspaceValue));
    if (!workspace) return null;
    return {
      workspace,
      preferences: parsed.preferences
        ? parseUiPreferences(JSON.stringify(parsed.preferences))
        : undefined,
    };
  } catch {
    return null;
  }
}

export function lineAtOffset(content: string, offset: number) {
  return content.slice(0, Math.max(0, offset)).split("\n").length;
}

export function offsetAtLine(content: string, line: number) {
  if (line <= 1) return 0;
  let offset = 0;
  for (let current = 1; current < line; current += 1) {
    const next = content.indexOf("\n", offset);
    if (next < 0) return content.length;
    offset = next + 1;
  }
  return offset;
}

export function extractMermaidBlocks(markdown: string): MermaidBlock[] {
  const blocks: MermaidBlock[] = [];
  const regex = /(^|\n)[ \t]{0,3}(`{3,}|~{3,})[ \t]*mermaid[^\n]*\r?\n([\s\S]*?)\r?\n[ \t]{0,3}\2[ \t]*(?=\n|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    const fenceOffset = match.index + (match[1] ? 1 : 0);
    const fenceLine = markdown.slice(0, fenceOffset).split("\n").length;
    const code = match[3].trimEnd();
    const codeLine = fenceLine + 1;
    blocks.push({
      index: blocks.length,
      code,
      fenceLine,
      codeLine,
      endLine: codeLine + code.split("\n").length - 1,
    });
  }
  return blocks;
}

export function mermaidErrorDetails(reason: unknown, block: MermaidBlock) {
  const error = reason as {
    message?: string;
    hash?: { loc?: { first_line?: number; first_column?: number } };
  };
  const raw = error?.message || String(reason);
  const message = raw.split("\n").find((line) => line.trim())?.slice(0, 180) || "語法錯誤";
  const hashLine = Number(error?.hash?.loc?.first_line);
  const messageLine = Number(raw.match(/(?:line|第)\s*(\d+)/i)?.[1]);
  const relativeLine = Number.isFinite(hashLine) && hashLine > 0
    ? hashLine
    : Number.isFinite(messageLine) && messageLine > 0
      ? messageLine
      : 1;
  const column = Number(error?.hash?.loc?.first_column);
  return {
    line: block.codeLine + relativeLine - 1,
    column: Number.isFinite(column) ? column + 1 : undefined,
    message,
  };
}

export function countWords(content: string) {
  const latin = content.match(/[A-Za-z0-9_]+/g)?.length ?? 0;
  const cjk = content.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  return latin + cjk;
}

export function findSearchMatches(
  content: string,
  query: string,
  matchCase = false,
): SearchMatch[] {
  if (!query) return [];
  const source = matchCase ? content : content.toLocaleLowerCase();
  const needle = matchCase ? query : query.toLocaleLowerCase();
  const matches: SearchMatch[] = [];
  let cursor = 0;
  while (cursor <= source.length - needle.length) {
    const start = source.indexOf(needle, cursor);
    if (start < 0) break;
    matches.push({ start, end: start + needle.length, line: lineAtOffset(content, start) });
    cursor = start + Math.max(needle.length, 1);
  }
  return matches;
}

export function replaceAllMatches(
  content: string,
  query: string,
  replacement: string,
  matchCase = false,
) {
  const matches = findSearchMatches(content, query, matchCase);
  if (!matches.length) return content;
  let result = "";
  let cursor = 0;
  for (const match of matches) {
    result += content.slice(cursor, match.start) + replacement;
    cursor = match.end;
  }
  return result + content.slice(cursor);
}

export function normalizeHeadingLevels(markdown: string) {
  let previous = 0;
  return markdown
    .split("\n")
    .map((line) => {
      const match = line.match(/^(#{1,6})(\s+.+)$/);
      if (!match) return line;
      let level = match[1].length;
      if (previous === 0 && level > 1) level = 1;
      if (previous > 0 && level > previous + 1) level = previous + 1;
      previous = level;
      return `${"#".repeat(level)}${match[2]}`;
    })
    .join("\n");
}

export function applyQuickFix(
  markdown: string,
  fixId: QuickFixId,
  filename: string,
) {
  switch (fixId) {
    case "add-title": {
      const title = normalizeMarkdownFilename(filename).replace(/\.md$/i, "").replace(/[-_]+/g, " ");
      return `# ${title || "未命名文件"}\n\n${markdown.replace(/^\s+/, "")}`;
    }
    case "normalize-headings":
      return normalizeHeadingLevels(markdown);
    case "add-checklist":
      return `${markdown.trimEnd()}\n\n## 待辦與確認\n\n- [ ] 待確認項目\n`;
    case "add-image-alt":
      return markdown.replace(/!\[\]\(([^)]+)\)/g, "![圖片說明]($1)");
  }
}

export function buildDocumentIssues(
  markdown: string,
  checks: MermaidCheck[],
): DocumentIssue[] {
  const result: DocumentIssue[] = [];
  if (/^#\s+.+/m.test(markdown)) {
    result.push({ id: "title-ok", level: "good", title: "主標題完整", detail: "文件已具有清楚的入口標題。" });
  } else {
    result.push({
      id: "title-missing",
      level: "warn",
      title: "缺少主標題",
      detail: "加入一個 # 主標題，讓文件目的更容易辨識。",
      fixId: "add-title",
      fixLabel: "預覽修正",
    });
  }

  const failed = checks.filter((check) => !check.ok);
  if (failed.length) {
    result.push({
      id: "mermaid-error",
      level: "warn",
      title: `${failed.length} 張 Mermaid 圖需要修正`,
      detail: `最早錯誤位於第 ${failed[0].line} 行，可直接定位到來源。`,
      line: failed[0].line,
    });
  } else if (checks.length) {
    result.push({ id: "mermaid-ok", level: "good", title: `${checks.length} 張 Mermaid 圖正常`, detail: "所有圖表均通過目前 Mermaid 版本檢查。" });
  } else {
    result.push({ id: "mermaid-empty", level: "tip", title: "尚未加入圖表", detail: "可從完整圖表目錄插入適合的 Mermaid 範本。" });
  }

  const headingLevels = [...markdown.matchAll(/^(#{1,6})\s+/gm)].map((match) => match[1].length);
  const hasJump = headingLevels.some(
    (level, index) => index > 0 && level - headingLevels[index - 1] > 1,
  );
  if (hasJump) {
    result.push({
      id: "heading-jump",
      level: "warn",
      title: "標題層級跳號",
      detail: "部分標題一次跨過一層，可安全調整為連續結構。",
      fixId: "normalize-headings",
      fixLabel: "預覽修正",
    });
  } else {
    result.push({ id: "heading-ok", level: "good", title: "標題結構連續", detail: "未發現明顯的標題層級跳號。" });
  }

  if (!/[-*]\s+\[[ xX]\]/.test(markdown)) {
    result.push({
      id: "checklist-missing",
      level: "tip",
      title: "可加入追蹤清單",
      detail: "若文件包含待辦或檢核工作，可加入標準核取清單。",
      fixId: "add-checklist",
      fixLabel: "預覽新增",
    });
  }

  if (/!\[\]\([^)]+\)/.test(markdown)) {
    result.push({
      id: "image-alt",
      level: "warn",
      title: "圖片缺少替代文字",
      detail: "補上替代文字可改善可及性與文件可讀性。",
      fixId: "add-image-alt",
      fixLabel: "預覽修正",
    });
  }

  const duplicateHeadings = [...markdown.matchAll(/^#{1,6}\s+(.+)$/gm)]
    .map((match) => match[1].trim().toLocaleLowerCase())
    .filter((heading, index, all) => all.indexOf(heading) !== index);
  if (duplicateHeadings.length) {
    result.push({
      id: "duplicate-heading",
      level: "tip",
      title: "發現重複標題",
      detail: `「${duplicateHeadings[0]}」出現多次，建議確認是否需要區分。`,
    });
  }

  return result;
}

export function parseFrontmatter(markdown: string) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return [];
  return match[1]
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Za-z0-9_.-]+):\s*(.*)$/))
    .filter((entry): entry is RegExpMatchArray => Boolean(entry))
    .map((entry) => ({ key: entry[1], value: entry[2] || "—" }));
}

export function buildAiPrompt(markdown: string) {
  return `請檢查並完善以下 Markdown 文件。要求：\n1. 保留原意與資訊，不自行補造事實。\n2. 檢查標題層級、表格、清單、連結、frontmatter 與數學公式。\n3. 修正 Mermaid 語法，並維持 Mermaid 11.16.1 相容。\n4. 先列出修改建議與風險，再提供完整修正版。\n5. 使用 diff 摘要說明每一項變更。\n\n---文件開始---\n${markdown}\n---文件結束---`;
}
