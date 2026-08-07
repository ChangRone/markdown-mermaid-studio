import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "out");
const htmlPath = path.join(output, "index.html");

test("Pages export contains the v0.4 productivity shell", () => {
  assert.ok(existsSync(htmlPath), "out/index.html should exist after next build");
  const html = readFileSync(htmlPath, "utf8");
  assert.match(html, /<title>Markdown Mermaid Studio<\/title>/);
  assert.match(html, /雙向定位/);
  assert.match(html, /完整語法/);
  assert.match(html, /文件健檢/);
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
