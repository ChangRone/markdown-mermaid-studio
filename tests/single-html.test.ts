import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSingleHtml,
  MAX_MERGE_TOTAL_BYTES,
  prepareSingleHtml,
  type MergeSource,
} from "../lib/single-html";

const sources: MergeSource[] = [
  {
    name: "01_overview.md",
    content: "# 總覽\n\n前往[部署](03_deploy.md#安裝步驟)。\n",
  },
  {
    name: "02_architecture.md",
    content: "# 系統架構\n\n返回[總覽](01_overview.md)。\n",
  },
  {
    name: "03_deploy.md",
    content: "# 部署\n\n## 安裝步驟\n\n請執行。\n",
  },
  {
    name: "04_operations.md",
    content: "# 維運\n\n參考[同頁說明](#啟動方式)。\n\n## 啟動方式\n",
  },
  {
    name: "05_troubleshooting.md",
    content: "# 疑難排解\n",
  },
];

test("prepares five ordered documents with stable anchors and rewritten links", () => {
  const result = prepareSingleHtml(sources);
  assert.deepEqual(result.errors, []);
  assert.equal(result.summary.fileCount, 5);
  assert.equal(result.summary.rewrittenLinks, 3);
  assert.equal(result.headings.filter((heading) => heading.depth === 1).length, 5);
  assert.match(result.markdown, /<a id="doc-01-01-overview"><\/a>/u);
  assert.match(result.markdown, /\]\(#doc-03-03-deploy--安裝步驟\)/u);
  assert.match(result.markdown, /\]\(#doc-04-04-operations--啟動方式\)/u);
});

test("reports missing cross-document files and anchors with source evidence", () => {
  const result = prepareSingleHtml([
    { name: "a.md", content: "# A\n\n[缺檔](missing.md)\n\n[缺段](#missing)" },
  ]);
  assert.equal(result.errors.length, 2);
  assert.match(result.errors.join("\n"), /跨文件連結未納入合併清單.*a\.md/u);
  assert.match(result.errors.join("\n"), /找不到頁內目標.*a\.md/u);
});

test("rejects duplicate basenames because browser file selection has no trusted directory path", () => {
  const result = prepareSingleHtml([
    { name: "same.md", path: "a/same.md", content: "# A" },
    { name: "same.md", path: "b/same.md", content: "# B" },
  ]);
  assert.match(result.errors.join("\n"), /檔名重複/u);
});

test("rejects a batch larger than the browser memory safety limit", () => {
  const result = prepareSingleHtml([
    { name: "large.md", content: "# Large", size: MAX_MERGE_TOTAL_BYTES + 1 },
  ]);
  assert.match(result.errors.join("\n"), /不可超過 20 MB/u);
});

test("builds a standalone HTML page with inline Mermaid and safe link behavior", async () => {
  const result = await buildSingleHtml([
    {
      name: "guide.md",
      content: "# 指南\n\n<script>alert('x')</script>\n\n[本頁](#指南) [外部](https://example.com)\n\n```mermaid\nflowchart LR\nA-->B\n```\n\n![本機](images/a.png)",
    },
  ], {
    title: "開發指南",
    renderMermaid: async () => '<svg viewBox="0 0 10 10"><text>圖</text></svg>',
  });

  assert.match(result.html, /<!doctype html>/u);
  assert.match(result.html, /<title>開發指南<\/title>/u);
  assert.match(result.html, /<svg viewBox="0 0 10 10">/u);
  assert.match(result.html, /href="#doc-01-guide"/u);
  assert.doesNotMatch(result.html, /href="#doc-01-guide"[^>]*target=/u);
  assert.match(result.html, /href="https:\/\/example\.com" target="_blank"/u);
  assert.doesNotMatch(result.html, /<script>alert/u);
  assert.match(result.html, /&#x3C;script>alert/u);
  assert.match(result.warnings.join("\n"), /本機圖片未嵌入/u);
  assert.equal(result.summary.mermaidCount, 1);
});

test("browser renderer embeds a real Mermaid SVG with complete long CJK labels", async () => {
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test" });
  const previous: Record<string, PropertyDescriptor | undefined> = {};
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    SVGElement: dom.window.SVGElement,
    Node: dom.window.Node,
    CSSStyleSheet: dom.window.CSSStyleSheet,
  })) {
    previous[key] = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  Object.defineProperty(dom.window.HTMLElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value() {
      const width = Math.min(200, (this.textContent ?? "").length * 8);
      return { x: 0, y: 0, top: 0, left: 0, right: width, bottom: 24, width, height: 24, toJSON() { return this; } };
    },
  });
  Object.defineProperty(dom.window.SVGElement.prototype, "getComputedTextLength", {
    configurable: true,
    value() { return (this.textContent ?? "").length * 8; },
  });
  Object.defineProperty(dom.window.SVGElement.prototype, "getBBox", {
    configurable: true,
    value() {
      const width = Math.max(40, (this.textContent ?? "").length * 8);
      return { x: 0, y: 0, width, height: 32 };
    },
  });

  const result = await buildSingleHtml([{
    name: "flow.md",
    content: `# 流程\n\n\`\`\`mermaid\nflowchart LR\n  A["Gitea：Tag、Commit、Manifest"] --> B["控制程式：platform_checker.sh"]\n\`\`\``,
  }]);
  assert.match(result.html, /<svg/u);
  assert.match(result.html, /Gitea：Tag、Commit、Manifest/u);
  assert.match(result.html, /控制程式：platform_checker\.sh/u);

  dom.window.close();
  for (const [key, descriptor] of Object.entries(previous)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});
