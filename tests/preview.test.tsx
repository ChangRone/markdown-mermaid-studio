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
