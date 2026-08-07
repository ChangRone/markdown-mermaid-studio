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
