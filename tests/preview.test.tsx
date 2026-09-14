import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import MarkdownPreview from "../components/MarkdownPreview";

test("preview emits source ranges used by bidirectional positioning", () => {
  const markdown = `---
title: Mapping
---

# Heading

Paragraph for positioning.

\`\`\`mermaid
flowchart LR
  A --> B
\`\`\`
`;
  const html = renderToStaticMarkup(
    <MarkdownPreview
      markdown={markdown}
      dark={false}
      activeLine={7}
      onJumpSource={() => undefined}
      onNotify={() => undefined}
    />,
  );
  assert.match(html, /class="frontmatter-card source-positioned"[^>]*data-source-start="1"/);
  assert.match(html, /<h1 data-source-start="5" data-source-end="5"/);
  assert.match(html, /<p data-source-start="7" data-source-end="7"/);
  assert.match(html, /class="diagram-figure source-positioned"[^>]*data-source-start="9"/);
});

test("preview restores generated all.md anchors without enabling arbitrary raw HTML", () => {
  const markdown = `<a id="doc-01-overview"></a>

# 專案總覽

[前往功能](#doc-02-features--功能矩陣)

<script>alert("unsafe")</script>

<a id="doc-02-features--功能矩陣"></a>

## 功能矩陣

[正式網站](https://example.com)
`;
  const html = renderToStaticMarkup(
    <MarkdownPreview
      markdown={markdown}
      dark={false}
      onJumpSource={() => undefined}
      onNotify={() => undefined}
    />,
  );

  assert.match(html, /<h1[^>]*id="doc-01-overview"[^>]*>專案總覽<\/h1>/u);
  assert.match(html, /<h2[^>]*id="doc-02-features--功能矩陣"[^>]*>功能矩陣<\/h2>/u);
  assert.match(html, /<a href="#doc-02-features--%E5%8A%9F%E8%83%BD%E7%9F%A9%E9%99%A3">前往功能<\/a>/u);
  assert.doesNotMatch(html, /href="#doc-02-features--[^>]*target=/u);
  assert.match(html, /<a href="https:\/\/example\.com" target="_blank" rel="noreferrer">正式網站<\/a>/u);
  assert.doesNotMatch(html, /<script|<a id=|node="\[object Object\]"/u);
  assert.match(html, /&lt;script&gt;alert\(&quot;unsafe&quot;\)&lt;\/script&gt;/u);
});

test("preview renders ordered, unordered, nested, and task list structures", () => {
  const markdown = `1. 第一項
2. 第二項
   1. 第二項的子項目

- 第一層
  - 第二層
    - 第三層

- [x] 已完成
- [ ] 待處理
`;
  const html = renderToStaticMarkup(
    <MarkdownPreview
      markdown={markdown}
      dark={false}
      onJumpSource={() => undefined}
      onNotify={() => undefined}
    />,
  );

  assert.match(html, /<ol[^>]*>[\s\S]*第一項[\s\S]*<ol[^>]*>[\s\S]*第二項的子項目[\s\S]*<\/ol>[\s\S]*<\/ol>/u);
  assert.match(html, /<ul[^>]*>[\s\S]*第一層[\s\S]*<ul[^>]*>[\s\S]*第二層[\s\S]*<ul[^>]*>[\s\S]*第三層[\s\S]*<\/ul>[\s\S]*<\/ul>[\s\S]*<\/ul>/u);
  assert.match(html, /<ul[^>]*class="contains-task-list"[^>]*>/u);
  assert.equal((html.match(/class="task-list-item"/gu) ?? []).length, 2);
  assert.equal((html.match(/type="checkbox"/gu) ?? []).length, 2);
});
