import assert from "node:assert/strict";
import test from "node:test";
import {
  MERMAID_LABEL_WRAP_WIDTH,
  getMermaidConfig,
  prepareMermaidCode,
} from "../lib/mermaid";

test("production Mermaid config enables supported long-label wrapping", () => {
  const light = getMermaidConfig(false);
  const dark = getMermaidConfig(true);

  assert.equal(light.markdownAutoWrap, true);
  assert.equal(light.htmlLabels, true);
  assert.equal(light.flowchart?.wrappingWidth, MERMAID_LABEL_WRAP_WIDTH);
  assert.equal(light.sequence?.wrap, true);
  assert.equal(light.sequence?.wrapPadding, 12);
  assert.equal(light.c4?.wrap, true);
  assert.equal(light.mindmap?.maxNodeWidth, MERMAID_LABEL_WRAP_WIDTH);
  assert.equal(light.theme, "neutral");
  assert.equal(dark.theme, "dark");
});

test("long flowchart subgraph labels become auto-wrapping Markdown strings", () => {
  const source = `flowchart TD
  subgraph short[短標題]
    A[內容]
  end
  subgraph review["這是一段很長的群組標題，用來確認流程圖能依照群組寬度自動換行並完整顯示"]
    B[內容]
  end`;
  const prepared = prepareMermaidCode(source);

  assert.match(
    prepared,
    /subgraph review\["`這是一段很長的群組標題，用來確認流程圖能依照群組寬度自動換行並完整顯示`"\]/,
  );
  assert.match(prepared, /subgraph short\[短標題\]/);
  assert.equal(prepared.split("\n").length, source.split("\n").length);
});

test("explicit wrapping and existing Markdown labels are preserved", () => {
  const source = `flowchart TD
  subgraph manual["這是一段很長的群組標題<br/>作者已經指定換行位置"]
    A[內容]
  end
  subgraph markdown["\`**這是一段很長的群組標題並已使用 Markdown**\`"]
    B[內容]
  end`;

  assert.equal(prepareMermaidCode(source), source);
});

test("prepared long-label diagrams remain valid Mermaid", async () => {
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
  mermaid.initialize(getMermaidConfig(false));

  const diagrams = [
    `flowchart TD
      subgraph review["這是一段很長的群組標題，用來確認流程圖能依照群組寬度自動換行並完整顯示"]
        A[這是一段很長的節點文字，用來確認節點也能自動換行並完整顯示]
      end`,
    `sequenceDiagram
      participant A as 這是一個名稱很長的申請端系統需要自動換行
      participant B as 這是一個名稱很長的審核端系統需要自動換行
      A->>B: 這是一段很長的訊息內容需要自動換行而不是撐寬整張圖`,
  ];

  for (const diagram of diagrams) {
    await assert.doesNotReject(() => mermaid.parse(prepareMermaidCode(diagram)));
  }
});

test("Block diagrams render without serializing circular DOM nodes", async () => {
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
    Node: dom.window.Node,
    CSSStyleSheet: dom.window.CSSStyleSheet,
  })) {
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  Object.defineProperty(dom.window.SVGElement.prototype, "getBBox", {
    configurable: true,
    value(this: SVGElement) {
      const text = this.textContent ?? "";
      return { x: 0, y: 0, width: Math.max(40, text.length * 8), height: 32 };
    },
  });
  Object.defineProperty(dom.window.SVGElement.prototype, "getComputedTextLength", {
    configurable: true,
    value(this: SVGElement) {
      return (this.textContent ?? "").length * 8;
    },
  });

  const mermaid = (await import("mermaid")).default;
  mermaid.initialize(getMermaidConfig(false));
  const rendered = await mermaid.render(
    "block-long-label-regression",
    `block-beta
      columns 3
      source["這是一個很長的資料來源區塊需要完整換行顯示"] --> parser["這是一個很長的解析器區塊需要完整換行顯示"] --> preview["這是一個很長的預覽區塊需要完整換行顯示"]`,
  );

  assert.match(rendered.svg, /<svg/);
  assert.match(rendered.svg, /class="block"/);
});
