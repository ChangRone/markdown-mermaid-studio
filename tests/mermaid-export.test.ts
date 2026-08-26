import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_PNG_DIMENSION,
  getPngSize,
  getSvgSize,
  prepareSvgDataUrl,
  svgToPng,
} from "../lib/mermaid-export";

const SVG_WITH_HTML_LABEL = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 1648.0625 1247">
  <foreignObject width="200" height="48"><div xmlns="http://www.w3.org/1999/xhtml">控制程式：platform_checker.sh</div></foreignObject>
</svg>`;

test("PNG export dimensions follow the SVG viewBox without distortion", () => {
  assert.deepEqual(getSvgSize(SVG_WITH_HTML_LABEL), { width: 1648.0625, height: 1247 });
  assert.deepEqual(getPngSize(SVG_WITH_HTML_LABEL), { width: 3296, height: 2494 });

  const oversized = `<svg viewBox="0 0 10000 2500"></svg>`;
  assert.deepEqual(getPngSize(oversized), { width: MAX_PNG_DIMENSION, height: 1024 });
});

test("SVG raster source is a self-contained data URI with explicit dimensions", () => {
  const dataUrl = prepareSvgDataUrl(SVG_WITH_HTML_LABEL);
  assert.match(dataUrl, /^data:image\/svg\+xml;charset=utf-8,/u);
  assert.doesNotMatch(dataUrl, /^blob:/u);
  const decoded = decodeURIComponent(dataUrl.split(",", 2)[1]);
  assert.match(decoded, /<svg[^>]*width="1648\.0625"[^>]*height="1247"/u);
  assert.match(decoded, /<foreignObject/u);
  assert.match(decoded, /控制程式：platform_checker\.sh/u);
});

test("browser PNG conversion draws a data-URI SVG and returns a PNG blob", async () => {
  const originalImage = globalThis.Image;
  const originalDocument = globalThis.document;
  let imageSource = "";
  const draws: Array<[number, number]> = [];
  const fills: string[] = [];

  class FakeImage {
    decoding = "";
    naturalWidth = 300;
    naturalHeight = 150;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(value: string) {
      imageSource = value;
      queueMicrotask(() => this.onload?.());
    }
  }

  const context = {
    fillStyle: "",
    fillRect() {
      fills.push(this.fillStyle);
    },
    drawImage(_image: unknown, _x: number, _y: number, width: number, height: number) {
      draws.push([width, height]);
    },
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toBlob: (callback: (blob: Blob | null) => void) => {
      callback(new Blob(["png"], { type: "image/png" }));
    },
  };

  Object.defineProperty(globalThis, "Image", { value: FakeImage, configurable: true });
  Object.defineProperty(globalThis, "document", {
    value: { createElement: () => canvas },
    configurable: true,
  });

  try {
    const blob = await svgToPng(SVG_WITH_HTML_LABEL, false);
    assert.equal(blob.type, "image/png");
    assert.match(imageSource, /^data:image\/svg\+xml;charset=utf-8,/u);
    assert.deepEqual(draws, [[3296, 2494]]);
    assert.deepEqual(fills, ["#ffffff"]);
  } finally {
    Object.defineProperty(globalThis, "Image", { value: originalImage, configurable: true });
    Object.defineProperty(globalThis, "document", { value: originalDocument, configurable: true });
  }
});

test("browser PNG conversion reports a friendly security error", async () => {
  const originalImage = globalThis.Image;
  const originalDocument = globalThis.document;

  class FakeImage {
    decoding = "";
    naturalWidth = 300;
    naturalHeight = 150;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  }

  const context = {
    fillStyle: "",
    fillRect() {},
    drawImage() {},
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toBlob: () => {
      throw new DOMException("The canvas has been tainted", "SecurityError");
    },
  };

  Object.defineProperty(globalThis, "Image", { value: FakeImage, configurable: true });
  Object.defineProperty(globalThis, "document", {
    value: { createElement: () => canvas },
    configurable: true,
  });

  try {
    await assert.rejects(
      svgToPng(SVG_WITH_HTML_LABEL, false),
      /PNG 匯出受到瀏覽器安全限制/u,
    );
  } finally {
    Object.defineProperty(globalThis, "Image", { value: originalImage, configurable: true });
    Object.defineProperty(globalThis, "document", { value: originalDocument, configurable: true });
  }
});
