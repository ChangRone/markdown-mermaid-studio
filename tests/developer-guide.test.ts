import assert from "node:assert/strict";
import test from "node:test";
import { anchorSlug, mergeGuideDocuments } from "../tools/developer-guide/guide-core.mjs";

const apiVersion = [1, 23, 1];
const str = (value: string) => ({ t: "Str", c: value });
const header = (level: number, id: string, title: string) => ({
  t: "Header",
  c: [level, [id, [], []], [str(title)]],
});
const link = (label: string, target: string) => ({
  t: "Para",
  c: [{ t: "Link", c: [["", [], []], [str(label)], [target, ""]] }],
});
const doc = (sourcePath: string, blocks: unknown[]) => ({
  sourcePath,
  ast: { "pandoc-api-version": apiVersion, meta: {}, blocks },
});

test("anchorSlug keeps CJK text and normalizes filenames", () => {
  assert.equal(anchorSlug("控制程式：platform_checker.sh"), "控制程式-platform-checker-sh");
  assert.equal(anchorSlug("03_Deployment Guide"), "03-deployment-guide");
});

test("five ordered documents receive unique anchors and cross-document links", () => {
  const input = [
    doc("docs/01_overview.md", [
      header(1, "overview", "總覽"),
      link("部署", "03_deployment.md#install"),
    ]),
    doc("docs/02_architecture.md", [header(1, "architecture", "架構")]),
    doc("docs/03_deployment.md", [
      header(1, "deployment", "部署"),
      header(2, "install", "安裝"),
      link("本頁安裝", "#install"),
    ]),
    doc("docs/04_operations.md", [header(1, "operations", "操作")]),
    doc("docs/05_troubleshooting.md", [header(1, "troubleshooting", "疑難排解")]),
  ];
  const result = mergeGuideDocuments(input);
  const serialized = JSON.stringify(result.ast);

  assert.equal(result.documents.length, 5);
  assert.equal(result.rewrittenLinks, 2);
  assert.match(serialized, /#doc-03-deployment--install/u);
  assert.match(serialized, /doc-01-overview/u);
  assert.equal(result.ast.blocks.filter((block: { t?: string }) => block.t === "HorizontalRule").length, 4);
});

test("missing Markdown targets fail instead of producing a broken guide", () => {
  assert.throws(
    () => mergeGuideDocuments([
      doc("docs/01_overview.md", [header(1, "overview", "總覽"), link("不存在", "missing.md")]),
    ]),
    /未納入 guide-order\.txt/u,
  );
});

test("missing internal anchors fail with source evidence", () => {
  assert.throws(
    () => mergeGuideDocuments([
      doc("docs/01_overview.md", [header(1, "overview", "總覽"), link("不存在", "#missing")]),
    ]),
    /找不到頁內目標.*docs\/01_overview\.md/u,
  );
});

test("duplicate source files and duplicate document anchors fail", () => {
  const first = doc("docs/01_overview.md", [header(1, "overview", "總覽")]);
  assert.throws(() => mergeGuideDocuments([first, first]), /文件重複列入/u);
  assert.throws(
    () => mergeGuideDocuments([
      first,
      doc("archive/01_overview.md", [header(1, "other", "另一份總覽")]),
    ]),
    /文件 Anchor 重複/u,
  );
});

