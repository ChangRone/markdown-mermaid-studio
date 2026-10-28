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
  const result = await renderDiagram("flowchart LR\nA[One] --> B[Two]", false, "mermaid", "trial-original");
  assert.equal(result.usedEngine, "mermaid");
  assert.match(result.svg, /<svg\b/u);
});
