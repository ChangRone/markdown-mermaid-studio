import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import MultiDocumentExportDialog from "../components/MultiDocumentExportDialog";

test("batch file input validates, reorders and removes selected Markdown files", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    url: "https://example.test",
  });
  const previous: Record<string, PropertyDescriptor | undefined> = {};
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Event: dom.window.Event,
    File: dom.window.File,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous[key] = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }

  const container = dom.window.document.getElementById("root");
  assert.ok(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<MultiDocumentExportDialog open dark={false} onClose={() => undefined} onNotify={() => undefined} />);
  });

  const first = new dom.window.File(["# 第一份\n\n[第二份](second.md#第二份)"], "first.md", { type: "text/markdown" });
  const second = new dom.window.File(["# 第二份"], "second.md", { type: "text/markdown" });
  Object.defineProperty(first, "text", { value: async () => "# 第一份\n\n[第二份](second.md#第二份)" });
  Object.defineProperty(second, "text", { value: async () => "# 第二份" });
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  assert.ok(input);
  Object.defineProperty(input, "files", { value: [first, second], configurable: true });
  await act(async () => {
    input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    await Promise.resolve();
  });

  assert.match(container.textContent || "", /2 份文件/u);
  assert.match(container.textContent || "", /連結檢查通過/u);
  assert.match(container.textContent || "", /改寫 1 個跨檔／頁內連結/u);

  const down = container.querySelector<HTMLButtonElement>('button[aria-label="下移 first.md"]');
  assert.ok(down);
  await act(async () => down.click());
  const namesAfterMove = [...container.querySelectorAll(".merge-source-item strong")].map((node) => node.textContent);
  assert.deepEqual(namesAfterMove, ["second.md", "first.md"]);

  const remove = container.querySelector<HTMLButtonElement>('button[aria-label="移除 first.md"]');
  assert.ok(remove);
  await act(async () => remove.click());
  assert.match(container.textContent || "", /1 份文件/u);
  assert.doesNotMatch(container.textContent || "", /first\.md/u);

  await act(async () => root.unmount());
  dom.window.close();
  for (const [key, descriptor] of Object.entries(previous)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});
