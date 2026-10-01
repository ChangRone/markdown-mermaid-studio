import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { JSDOM } from "jsdom";

test("table click tracks its own source range, while selection and disabled tracking stay untouched", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div><input id='focus'></body></html>", {
    url: "https://example.test",
  });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [name, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
  })) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, value });
  }
  const previousAct = Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT");
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
  const { createRoot } = await import("react-dom/client");
  const { default: MarkdownPreview } = await import("../components/MarkdownPreview");
  const root = createRoot(dom.window.document.getElementById("root")!);
  const markdown = "| A | B |\n|---|---|\n| first | second |";
  const calls: Array<[number, number | undefined, number | undefined, number | undefined]> = [];
  const props = {
    markdown,
    dark: false,
    onJumpSource: () => { throw new Error("automatic click must not navigate or focus the editor"); },
    onTrackSource: (line: number, end?: number, start?: number, finish?: number) => calls.push([line, end, start, finish]),
    onNotify: () => undefined,
  };

  try {
    await act(async () => root.render(<MarkdownPreview {...props} trackingEnabled />));
    const cells = dom.window.document.querySelectorAll("tbody td");
    const second = cells[1] as HTMLElement;
    const input = dom.window.document.getElementById("focus") as HTMLInputElement;
    input.focus();
    second.click();
    assert.deepEqual(calls, [[3, 3, 28, 38]]);
    assert.equal(dom.window.document.activeElement, input);

    const getSelection = dom.window.getSelection;
    Object.defineProperty(dom.window, "getSelection", { configurable: true, value: () => ({ toString: () => "second" }) });
    second.click();
    assert.equal(calls.length, 1);
    Object.defineProperty(dom.window, "getSelection", { configurable: true, value: getSelection });

    await act(async () => root.render(<MarkdownPreview {...props} trackingEnabled={false} />));
    second.click();
    assert.equal(calls.length, 1);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
    if (previousAct) Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", previousAct);
    else Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
  }
});
