import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "out");
const htmlPath = path.join(output, "index.html");
const guidePath = path.join(output, "developer_guide.html");

test("Pages export contains the v0.6.2 multi-document workspace shell", () => {
  assert.ok(existsSync(htmlPath), "out/index.html should exist after next build");
  const html = readFileSync(htmlPath, "utf8");
  assert.match(html, /<title>Markdown Mermaid Studio<\/title>/);
  assert.match(html, /v(?:<!-- -->)?0\.6\.2/);
  assert.match(html, /多檔合併/);
  assert.match(html, /合併多份 MD/);
  assert.match(html, /雙向定位/);
  assert.match(html, /完整語法/);
  assert.match(html, /文件健檢/);
  assert.match(html, /管理版本快照/);
  assert.match(html, /favicon\.svg/);
});

test("mobile Pages assets expose a visible multi-document merge action", () => {
  const html = readFileSync(htmlPath, "utf8");
  const cssRefs = [...html.matchAll(/href="([^"]+\.css)"/g)].map((match) => match[1]);
  const css = cssRefs
    .map((reference) => reference.replace(/^\/markdown-mermaid-studio\//, "").replace(/^\//, ""))
    .map((relative) => readFileSync(path.join(output, relative), "utf8"))
    .join("\n");

  assert.match(html, /aria-label="合併多份 Markdown 文件"/u);
  assert.match(css, /\.mobile-merge-action/u);
  assert.match(css, /min-height:\s*48px/u);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/u);
});

test("every local JavaScript and CSS asset referenced by the page exists", () => {
  const html = readFileSync(htmlPath, "utf8");
  const refs = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => match[1]);
  assert.ok(refs.length > 2, "expected built JavaScript and CSS assets");
  for (const reference of refs) {
    const withoutQuery = reference.split("?")[0];
    const relative = withoutQuery.replace(/^\/markdown-mermaid-studio\//, "").replace(/^\//, "");
    assert.ok(existsSync(path.join(output, relative)), `missing asset: ${reference}`);
  }
});

test("Pages export contains the standalone five-document Developer Guide", () => {
  assert.ok(existsSync(guidePath), "out/developer_guide.html should exist after guide:pages");
  const html = readFileSync(guidePath, "utf8");
  assert.match(html, /<title>Markdown Mermaid Studio Developer Guide<\/title>/u);
  assert.match(html, /<nav id="TOC"/u);
  assert.match(html, /id="doc-01-overview"/u);
  assert.match(html, /id="doc-05-maintenance"/u);
  assert.equal((html.match(/data:image\/svg\+xml;base64,/gu) ?? []).length, 2);
  assert.doesNotMatch(html, /(?:src|href)="(?:generated\/|tools\/developer-guide\/guide\.css)/u);
});
