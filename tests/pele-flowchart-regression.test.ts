import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { JSDOM } from "jsdom";
import { preserveFlowchartLayout, renderDiagram } from "../lib/diagram-renderer";
import { getSvgSize, prepareSvgDataUrl } from "../lib/mermaid-export";

const diagram = readFileSync(new URL("./fixtures/flowchart-is33-regression.mmd", import.meta.url), "utf8");

function parseSvg(svg: string) {
  const dom = new JSDOM(svg, { contentType: "image/svg+xml" });
  return dom.window.document.documentElement;
}

test("dense six-group flowchart preserves natural layout, original arrows and valid SVG", async () => {
  assert.equal(preserveFlowchartLayout(diagram), true);
  assert.equal(preserveFlowchartLayout("flowchart LR\nA-->B"), false);
  const actual = await renderDiagram(diagram, false, "pele", "is33-limited", 320);
  assert.equal(actual.usedEngine, "pele", actual.fallbackReason || "unexpected Mermaid fallback");
  const svg = actual.svg;
  const root = parseSvg(svg);
  assert.equal(root.localName, "svg");
  assert.equal(root.getAttribute("class")?.includes("pele-flowchart"), true);
  const css = root.getAttribute("style") || "";
  assert.ok(css.includes("--_bg:var(--pele-bg"), "Pele background alias must remain");
  assert.ok(css.includes("--_l:var(--pele-line"), "Pele edge alias must remain");
  assert.ok(css.includes("--pele-bg:#ffffff"), "light palette must be explicit");
  assert.ok(css.includes("--pele-fg:#202328"), "text palette must be explicit");
  assert.ok(!css.includes("max-width:100%"), "do not shrink the entire SVG into the narrow editor pane");
  assert.equal(svg.split(' style="').length - 1 >= 1, true);
  assert.equal(root.querySelectorAll(".pele-cluster").length, 6, "all six business stages must render");
  assert.ok(root.querySelectorAll(".pele-node").length >= 16, "all process and decision nodes must render");
  assert.ok(root.querySelectorAll(".pele-edge").length >= 21, "all directed connections including backward links must render");
  assert.ok(root.querySelectorAll(".pele-marker").length >= 21, "arrow markers must be retained");
  assert.ok(root.querySelector('[data-id="ExecuteHotfixBatch"]'), "hotfix path should exist");
  assert.ok(root.querySelector('[data-id="CheckSHotfix"]'), "reverse/approval path should exist");
  assert.ok(svg.includes("緊急事件型") && svg.includes("產出執行"), "CJK labels must be retained");

  const natural = await renderDiagram(diagram, false, "pele", "is33-natural");
  assert.equal(natural.usedEngine, "pele");
  assert.deepEqual(getSvgSize(svg), getSvgSize(natural.svg), "editor width cannot reflow this complex topology");
  const data = prepareSvgDataUrl(svg);
  assert.ok(data.startsWith("data:image/svg+xml;"), "SVG remains exportable");
  const decoded = decodeURIComponent(data.split(",")[1]);
  assert.equal(parseSvg(decoded).localName, "svg", "exported SVG must remain XML-well-formed");
});

test("dark mode retains edge color variables and original SVG styles", async () => {
  const result = await renderDiagram(diagram, true, "pele", "is33-dark", 400);
  assert.equal(result.usedEngine, "pele", result.fallbackReason || "unexpected fallback");
  const root = parseSvg(result.svg);
  const css = root.getAttribute("style") || "";
  assert.ok(css.includes("--_bg:var(--pele-bg"));
  assert.ok(css.includes("--_l:var(--pele-line"));
  assert.ok(css.includes("--pele-bg:#191c20"));
  assert.ok(css.includes("--pele-line:#d8dee6"));
  assert.equal(root.querySelectorAll(".pele-cluster").length, 6);
});
