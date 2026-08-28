import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "out");
const htmlPath = path.join(output, "index.html");
const guidePath = path.join(output, "developer_guide.html");

test("Pages export contains the v0.5.3 snapshot workspace shell", () => {
  assert.ok(existsSync(htmlPath), "out/index.html should exist after next build");
  const html = readFileSync(htmlPath, "utf8");
  assert.match(html, /<title>Markdown Mermaid Studio<\/title>/);
  assert.match(html, /v(?:<!-- -->)?0\.5\.3/);
  assert.match(html, /雙向定位/);
  assert.match(html, /完整語法/);
  assert.match(html, /文件健檢/);
  assert.match(html, /管理版本快照/);
  assert.match(html, /favicon\.svg/);
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
