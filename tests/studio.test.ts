import assert from "node:assert/strict";
import test from "node:test";
import { DIAGRAM_TEMPLATES } from "../lib/templates";
import {
  MAX_PINNED_SNAPSHOTS,
  MAX_SNAPSHOTS,
  addSnapshot,
  applyQuickFix,
  buildDocumentIssues,
  createDefaultWorkspace,
  createDocument,
  createWorkspaceBackup,
  deleteSnapshot,
  extractMermaidBlocks,
  findSearchMatches,
  lineAtOffset,
  normalizeMarkdownFilename,
  normalizeSnapshotTags,
  offsetAtLine,
  parseFrontmatter,
  parseWorkspace,
  parseWorkspaceBackup,
  replaceAllMatches,
  snapshotDifference,
  toggleSnapshotPinned,
  updateSnapshot,
} from "../lib/studio";

test("normalizes every accepted text extension to one .md suffix", () => {
  assert.equal(normalizeMarkdownFilename("report.markdown"), "report.md");
  assert.equal(normalizeMarkdownFilename("REPORT.MD"), "REPORT.md");
  assert.equal(normalizeMarkdownFilename("notes.txt"), "notes.md");
  assert.equal(normalizeMarkdownFilename("bad/name?.mkd"), "bad-name-.md");
});

test("extracts backtick and tilde Mermaid fences with source lines", () => {
  const markdown = "# A\n\n```mermaid\nflowchart LR\nA-->B\n```\n\n~~~mermaid\npie\n  \"A\": 1\n~~~\n";
  const blocks = extractMermaidBlocks(markdown);
  assert.equal(blocks.length, 2);
  assert.deepEqual(
    blocks.map(({ fenceLine, codeLine, endLine }) => ({ fenceLine, codeLine, endLine })),
    [
      { fenceLine: 3, codeLine: 4, endLine: 5 },
      { fenceLine: 8, codeLine: 9, endLine: 10 },
    ],
  );
});

test("maps offsets and line numbers in both directions", () => {
  const content = "one\ntwo\nthree";
  assert.equal(lineAtOffset(content, 5), 2);
  assert.equal(offsetAtLine(content, 3), 8);
  assert.equal(offsetAtLine(content, 99), content.length);
});

test("finds and replaces literal search matches", () => {
  const matches = findSearchMatches("Alpha alpha ALPHA", "alpha", false);
  assert.equal(matches.length, 3);
  assert.equal(findSearchMatches("Alpha alpha", "Alpha", true).length, 1);
  assert.equal(replaceAllMatches("A-b-a", "a", "X", false), "X-b-X");
});

test("quick fixes preserve content while repairing structure", () => {
  assert.match(applyQuickFix("內容", "add-title", "my-file.md"), /^# my file\n\n內容$/);
  assert.equal(
    applyQuickFix("# A\n\n#### B\n\n###### C", "normalize-headings", "x.md"),
    "# A\n\n## B\n\n### C",
  );
  assert.match(applyQuickFix("![](a.png)", "add-image-alt", "x.md"), /!\[圖片說明\]/);
});

test("snapshots deduplicate content and enforce the history limit", () => {
  let document = createDocument("a.md", "zero", 1);
  document = addSnapshot(document, "first", "zero", 2);
  document = addSnapshot(document, "duplicate", "zero", 3);
  assert.equal(document.snapshots.length, 1);
  for (let index = 1; index <= MAX_SNAPSHOTS + 5; index += 1) {
    document = addSnapshot(document, `v${index}`, `content-${index}`, index + 3);
  }
  assert.equal(document.snapshots.length, MAX_SNAPSHOTS);
  assert.equal(document.snapshots[0].content, `content-${MAX_SNAPSHOTS + 5}`);
});

test("snapshot metadata supports labels, tags, pinning, editing and deletion", () => {
  let document = createDocument("a.md", "draft", 1);
  document = addSnapshot(document, "  First   draft  ", "draft", 2, ["review", "#Review", " 初稿 "]);
  assert.equal(document.snapshots[0].label, "First draft");
  assert.deepEqual(document.snapshots[0].tags, ["review", "初稿"]);

  const snapshotId = document.snapshots[0].id;
  document = toggleSnapshotPinned(document, snapshotId);
  assert.equal(document.snapshots[0].pinned, true);
  document = updateSnapshot(document, snapshotId, "Approved", "final, 核准");
  assert.equal(document.snapshots[0].label, "Approved");
  assert.deepEqual(document.snapshots[0].tags, ["final", "核准"]);
  document = deleteSnapshot(document, snapshotId);
  assert.equal(document.snapshots.length, 0);
});

test("pinned snapshots survive automatic retention and pin count is bounded", () => {
  let document = createDocument("a.md", "zero", 1);
  for (let index = 1; index <= MAX_SNAPSHOTS; index += 1) {
    document = addSnapshot(document, `v${index}`, `content-${index}`, index + 1);
  }
  const oldestId = document.snapshots.at(-1)?.id || "";
  document = toggleSnapshotPinned(document, oldestId);
  for (let index = MAX_SNAPSHOTS + 1; index <= MAX_SNAPSHOTS + 4; index += 1) {
    document = addSnapshot(document, `v${index}`, `content-${index}`, index + 1);
  }
  assert.equal(document.snapshots.length, MAX_SNAPSHOTS);
  assert.ok(document.snapshots.some((snapshot) => snapshot.id === oldestId && snapshot.pinned));

  for (const snapshot of document.snapshots.filter((item) => !item.pinned).slice(0, MAX_PINNED_SNAPSHOTS + 1)) {
    document = toggleSnapshotPinned(document, snapshot.id);
  }
  assert.equal(document.snapshots.filter((snapshot) => snapshot.pinned).length, MAX_PINNED_SNAPSHOTS);
});

test("v4 workspaces migrate snapshot metadata to the v5 schema", () => {
  const workspace = parseWorkspace(JSON.stringify({
    version: 4,
    activeId: "doc-1",
    documents: [{
      id: "doc-1",
      filename: "legacy.md",
      content: "# Legacy",
      createdAt: 1,
      updatedAt: 2,
      snapshots: [{ id: "snapshot-1", label: "Legacy", content: "old", createdAt: 1 }],
    }],
  }));
  assert.equal(workspace?.version, 5);
  assert.deepEqual(workspace?.documents[0].snapshots[0].tags, []);
  assert.equal(workspace?.documents[0].snapshots[0].pinned, false);
});

test("workspace backup round-trips documents, snapshots and preferences", () => {
  let workspace = createDefaultWorkspace(1);
  workspace = {
    ...workspace,
    documents: [addSnapshot(workspace.documents[0], "release", "# saved", 2, ["final"])],
  };
  const backup = createWorkspaceBackup(
    workspace,
    "0.5.0",
    { dark: true, splitPercent: 55, syncPosition: true, mode: "split" },
    3,
  );
  const restored = parseWorkspaceBackup(backup);
  assert.equal(restored?.workspace.version, 5);
  assert.equal(restored?.workspace.documents[0].snapshots[0].label, "release");
  assert.equal(restored?.preferences?.dark, true);
  assert.equal(restored?.preferences?.splitPercent, 55);
});

test("snapshot helpers normalize tag input and summarize changed ranges", () => {
  assert.deepEqual(normalizeSnapshotTags("#A, a, B，C, D, E, F"), ["A", "B", "C", "D", "E"]);
  assert.deepEqual(snapshotDifference("A\nold\nZ", "A\nnew\nextra\nZ"), {
    beforeLines: 3,
    afterLines: 4,
    commonPrefixLines: 1,
    commonSuffixLines: 1,
    removedLines: 1,
    addedLines: 2,
    identical: false,
  });
});

test("parses simple YAML frontmatter for the preview card", () => {
  assert.deepEqual(parseFrontmatter("---\ntitle: Demo\nstatus: draft\n---\n# Demo"), [
    { key: "title", value: "Demo" },
    { key: "status", value: "draft" },
  ]);
});

test("document checks expose directly applicable repairs", () => {
  const issues = buildDocumentIssues("## A\n\n#### B\n\n![](image.png)", []);
  assert.ok(issues.some((issue) => issue.fixId === "add-title"));
  assert.ok(issues.some((issue) => issue.fixId === "normalize-headings"));
  assert.ok(issues.some((issue) => issue.fixId === "add-image-alt"));
});

test("rejects malformed persisted workspaces", () => {
  assert.equal(parseWorkspace(null), null);
  assert.equal(parseWorkspace("{}"), null);
  assert.equal(parseWorkspace("not-json"), null);
});

test("Mermaid catalog is complete, searchable, and has unique insertable examples", () => {
  assert.ok(DIAGRAM_TEMPLATES.length >= 29);
  assert.equal(new Set(DIAGRAM_TEMPLATES.map((template) => template.id)).size, DIAGRAM_TEMPLATES.length);
  for (const template of DIAGRAM_TEMPLATES) {
    assert.ok(template.label.length > 2);
    assert.ok(template.code.includes("\n") || template.code.length > 5);
    assert.match(template.docs, /\.html$/);
  }
});

test("every Mermaid catalog example passes the production parser", async () => {
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://example.test",
  });
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    SVGElement: dom.window.SVGElement,
  })) {
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    suppressErrorRendering: true,
  });
  for (const template of DIAGRAM_TEMPLATES) {
    await assert.doesNotReject(
      () => mermaid.parse(template.code),
      `invalid Mermaid template: ${template.id}`,
    );
  }
});
