import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_DIAGRAM_ENGINE, renderDiagram, themePeleSvg } from "../lib/diagram-renderer";

test("Pele trial renderer produces a themed SVG", async () => {
  assert.equal(DEFAULT_DIAGRAM_ENGINE, "pele");
  const result = await renderDiagram("flowchart LR\nA[開始] --> B[完成]", false, "pele", "trial-flow");
  assert.equal(result.usedEngine, "pele");
  assert.match(result.svg, /<svg\b/u);
  assert.match(result.svg, /開始/u);
  assert.match(result.svg, /完成/u);
  assert.match(result.svg, /--pele-fg:/u);
});

test("Pele dark SVG has self-contained colors for exports", () => {
  const svg = themePeleSvg('<svg viewBox="0 0 20 20"></svg>', true);
  assert.match(svg, /--pele-bg:#191c20/u);
  assert.match(svg, /--pele-fg:#edf0f3/u);
  assert.throws(() => themePeleSvg("not an svg", false), /有效 SVG/u);
});

test("the original Mermaid renderer remains callable explicitly", async () => {
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test" });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    SVGElement: dom.window.SVGElement,
    Node: dom.window.Node,
    CSSStyleSheet: dom.window.CSSStyleSheet,
  };
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
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
    value() { return { x: 0, y: 0, width: 120, height: 32 }; },
  });
  try {
    const result = await renderDiagram("flowchart LR\nA[One] --> B[Two]", false, "mermaid", "trial-original");
    assert.equal(result.usedEngine, "mermaid");
    assert.match(result.svg, /<svg\b/u);
  } finally {
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
