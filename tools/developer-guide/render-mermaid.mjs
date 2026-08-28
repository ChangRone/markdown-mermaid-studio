import fs from "node:fs/promises";
import path from "node:path";
import { JSDOM } from "jsdom";
import { getMermaidConfig, prepareMermaidCode } from "../../lib/mermaid.ts";

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://developer-guide.local/",
  });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    SVGElement: dom.window.SVGElement,
    Node: dom.window.Node,
    CSSStyleSheet: dom.window.CSSStyleSheet,
    DOMParser: dom.window.DOMParser,
    XMLSerializer: dom.window.XMLSerializer,
  };
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }

  Object.defineProperty(dom.window.SVGElement.prototype, "getBBox", {
    configurable: true,
    value() {
      const numeric = (name) => Number.parseFloat(this.getAttribute(name) ?? "");
      const ownWidth = numeric("width");
      const ownHeight = numeric("height");
      if (Number.isFinite(ownWidth) && Number.isFinite(ownHeight)) {
        return { x: numeric("x") || 0, y: numeric("y") || 0, width: ownWidth, height: ownHeight };
      }
      const foreignObject = this.querySelector?.("foreignObject");
      const childWidth = Number.parseFloat(foreignObject?.getAttribute("width") ?? "");
      const childHeight = Number.parseFloat(foreignObject?.getAttribute("height") ?? "");
      if (Number.isFinite(childWidth) && Number.isFinite(childHeight)) {
        return { x: 0, y: 0, width: childWidth, height: childHeight };
      }
      const text = this.matches?.("text, tspan") ? (this.textContent ?? "") : "";
      if (text) {
        return { x: 0, y: 0, width: Math.max(40, Array.from(text).length * 8), height: 24 };
      }
      // JSDOM 沒有 SVG layout；大型容器若用全部後代文字估寬，會產生數萬 px 的
      // 錯誤 viewBox。未有實際尺寸的群組使用保守節點框，讓 Mermaid/Dagre
      // 仍可計算可讀且可重現的離線 SVG。
      return { x: 0, y: 0, width: 200, height: 48 };
    },
  });
  Object.defineProperty(dom.window.SVGElement.prototype, "getComputedTextLength", {
    configurable: true,
    value() {
      return Array.from(this.textContent ?? "").length * 8;
    },
  });
  Object.defineProperty(dom.window.HTMLElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value() {
      const textWidth = Array.from(this.textContent ?? "").reduce(
        (width, character) => width + (/[^\u0000-\u00ff]/u.test(character) ? 16 : 8),
        0,
      );
      const configuredWidth = Number.parseFloat(this.style.maxWidth || this.style.width);
      const maxWidth = Number.isFinite(configuredWidth) ? configuredWidth : textWidth;
      const constrained = Number.isFinite(configuredWidth) && textWidth > maxWidth;
      const wrapping = constrained && this.style.whiteSpace !== "nowrap";
      const width = constrained ? maxWidth : Math.max(1, textWidth);
      const measuredWidth = constrained && !wrapping ? maxWidth + 0.0078125 : width;
      const height = wrapping ? Math.ceil(textWidth / maxWidth) * 24 : 24;
      return {
        x: 0,
        y: 0,
        width: measuredWidth,
        height,
        top: 0,
        right: measuredWidth,
        bottom: height,
        left: 0,
        toJSON: () => ({}),
      };
    },
  });
  return dom;
}

function isMermaidCodeBlock(node) {
  return node?.t === "CodeBlock" && node.c?.[0]?.[1]?.includes("mermaid");
}

function imageBlock(target, diagramNumber) {
  return {
    t: "Para",
    c: [{
      t: "Image",
      c: [
        ["", ["mermaid-diagram", "inline-svg"], []],
        [{ t: "Str", c: `Mermaid diagram ${diagramNumber}` }],
        [target, ""],
      ],
    }],
  };
}

function translateOf(element) {
  const match = element.getAttribute("transform")?.match(
    /translate\(\s*([-+\d.e]+)(?:[ ,]+([-+\d.e]+))?\s*\)/iu,
  );
  return match ? [Number(match[1]), Number(match[2] ?? 0)] : [0, 0];
}

function rectBounds(element) {
  const rect = element.querySelector(":scope > rect");
  if (!rect) return null;
  const [offsetX, offsetY] = translateOf(element);
  const x = offsetX + Number(rect.getAttribute("x") ?? 0);
  const y = offsetY + Number(rect.getAttribute("y") ?? 0);
  const width = Number(rect.getAttribute("width"));
  const height = Number(rect.getAttribute("height"));
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  return { x, y, right: x + width, bottom: y + height };
}

function normalizeSvgBounds(svg, dom) {
  const document = new dom.window.DOMParser().parseFromString(svg, "image/svg+xml");
  const root = document.documentElement;
  const bounds = [...document.querySelectorAll(".node, .cluster")]
    .map(rectBounds)
    .filter(Boolean);
  if (!bounds.length) return svg;

  const margin = 20;
  const left = Math.min(...bounds.map((box) => box.x)) - margin;
  const top = Math.min(...bounds.map((box) => box.y)) - margin;
  const right = Math.max(...bounds.map((box) => box.right)) + margin;
  const bottom = Math.max(...bounds.map((box) => box.bottom)) + margin;
  const width = right - left;
  const height = bottom - top;
  if (![left, top, width, height].every(Number.isFinite) || width < 40 || height < 40) {
    throw new Error("Mermaid SVG 邊界計算失敗");
  }
  root.setAttribute("viewBox", `${left} ${top} ${width} ${height}`);
  root.setAttribute("style", `max-width: ${width}px;`);
  root.setAttribute("width", "100%");
  return new dom.window.XMLSerializer().serializeToString(root);
}

async function transformArray(items, context) {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (isMermaidCodeBlock(item)) {
      context.count += 1;
      const number = String(context.count).padStart(3, "0");
      const filename = `mermaid-${number}.svg`;
      const diagramId = `developer-guide-mermaid-${number}`;
      const source = item.c[1];
      try {
        const rendered = await context.mermaid.render(diagramId, prepareMermaidCode(source));
        const svg = normalizeSvgBounds(rendered.svg, context.dom);
        await fs.writeFile(path.join(context.outputDirectory, filename), svg, "utf8");
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Mermaid 圖 ${context.count} 渲染失敗：${detail}`);
      }
      items[index] = imageBlock(`generated/${filename}`, context.count);
      continue;
    }
    await transformValue(item, context);
  }
}

async function transformValue(value, context) {
  if (Array.isArray(value)) {
    await transformArray(value, context);
    return;
  }
  if (!value || typeof value !== "object") return;
  if ("c" in value) await transformValue(value.c, context);
}

export async function renderMermaidBlocks(ast, outputDirectory) {
  await fs.mkdir(outputDirectory, { recursive: true });
  const existing = await fs.readdir(outputDirectory);
  await Promise.all(existing
    .filter((name) => /^mermaid-\d{3}\.svg$/u.test(name))
    .map((name) => fs.unlink(path.join(outputDirectory, name))));

  const dom = installDom();
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize(getMermaidConfig(false));
  const context = { count: 0, mermaid, outputDirectory, dom };
  await transformValue(ast.blocks, context);
  dom.window.close();
  return context.count;
}
