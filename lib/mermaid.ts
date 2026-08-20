import type { MermaidConfig } from "mermaid";

export const MERMAID_LABEL_WRAP_WIDTH = 200;
export const MERMAID_FONT_FAMILY =
  "Inter, Noto Sans TC, PingFang TC, Microsoft JhengHei, system-ui, sans-serif";

const LONG_GROUP_LABEL_WIDTH = 32;
const LONG_BLOCK_LABEL_WIDTH = 24;

function visualTextWidth(value: string) {
  return Array.from(value).reduce((width, character) => {
    if (/\s/u.test(character)) return width + 0.5;
    return width + (/[^\u0000-\u00ff]/u.test(character) ? 2 : 1);
  }, 0);
}

function prepareSubgraphLabel(line: string) {
  if (!/^\s*subgraph\b/iu.test(line)) return line;

  const openBracket = line.indexOf("[");
  const closeBracket = line.lastIndexOf("]");
  if (openBracket < 0 || closeBracket <= openBracket) return line;

  const rawLabel = line.slice(openBracket + 1, closeBracket).trim();
  const quoted = rawLabel.startsWith('"') && rawLabel.endsWith('"');
  const label = quoted ? rawLabel.slice(1, -1) : rawLabel;

  if (
    visualTextWidth(label) <= LONG_GROUP_LABEL_WIDTH ||
    label.includes("`") ||
    label.includes('"') ||
    /<br\s*\/?>|\\n/iu.test(label)
  ) {
    return line;
  }

  // Mermaid 目前不會把一般 flowchart subgraph 標題套用 wrappingWidth。
  // Render-only 地轉成 Markdown string，可讓 Mermaid 依群組實際寬度換行；
  // 不插入來源行，因此錯誤行號與 Source ↔ Preview 定位仍保持一致。
  return `${line.slice(0, openBracket)}["\`${label}\`"]${line.slice(closeBracket + 1)}`;
}

function wrapVisualText(value: string, maxWidth: number) {
  const lines: string[] = [];
  let current: string[] = [];
  let currentWidth = 0;
  let lastWhitespace = -1;

  const recalculateCurrent = () => {
    while (current.length && /\s/u.test(current[0])) current.shift();
    currentWidth = visualTextWidth(current.join(""));
    lastWhitespace = -1;
    current.forEach((character, index) => {
      if (/\s/u.test(character)) lastWhitespace = index;
    });
  };

  for (const character of Array.from(value)) {
    const characterWidth = visualTextWidth(character);
    while (current.length && currentWidth + characterWidth > maxWidth) {
      if (lastWhitespace > 0) {
        lines.push(current.slice(0, lastWhitespace).join("").trimEnd());
        current = current.slice(lastWhitespace + 1);
      } else {
        lines.push(current.join("").trimEnd());
        current = [];
      }
      recalculateCurrent();
    }
    if (!current.length && /\s/u.test(character)) continue;
    current.push(character);
    currentWidth += characterWidth;
    if (/\s/u.test(character)) lastWhitespace = current.length - 1;
  }

  if (current.length) lines.push(current.join("").trimEnd());
  return lines.filter(Boolean).join("<br/>");
}

function prepareBlockLabel(line: string) {
  if (/^\s*%%/u.test(line)) return line;

  return line.replace(/"([^"\n]+)"/gu, (match, label: string, offset: number) => {
    const opener = line.slice(0, offset).trimEnd().at(-1);
    if (!opener || !"[({>/\\".includes(opener)) return match;
    if (
      visualTextWidth(label) <= LONG_BLOCK_LABEL_WIDTH ||
      /<|>|`|<br\s*\/?>|\\n|&(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);/iu.test(label)
    ) {
      return match;
    }

    // Block 圖目前沒有 wrappingWidth；在 render-only label 內補安全的換行，
    // 並保留來源行數、原始碼複製與 Source ↔ Preview 定位。
    return `"${wrapVisualText(label, LONG_BLOCK_LABEL_WIDTH)}"`;
  });
}

function isBlockDiagram(lines: string[]) {
  let inFrontmatter = lines[0]?.trim() === "---";
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (inFrontmatter) {
      if (index > 0 && line === "---") inFrontmatter = false;
      continue;
    }
    if (!line || /^%%/u.test(line)) continue;
    return /^block(?:-beta)?(?:\s|$)/iu.test(line);
  }
  return false;
}

export function prepareMermaidCode(code: string) {
  const lines = code.split("\n");
  const blockDiagram = isBlockDiagram(lines);
  return lines
    .map((line) => {
      const prepared = prepareSubgraphLabel(line);
      return blockDiagram ? prepareBlockLabel(prepared) : prepared;
    })
    .join("\n");
}

export function getMermaidConfig(dark: boolean): MermaidConfig {
  return {
    startOnLoad: false,
    securityLevel: "strict",
    suppressErrorRendering: true,
    theme: dark ? "dark" : "neutral",
    fontFamily: MERMAID_FONT_FAMILY,
    htmlLabels: true,
    markdownAutoWrap: true,
    flowchart: {
      useMaxWidth: true,
      wrappingWidth: MERMAID_LABEL_WRAP_WIDTH,
    },
    sequence: {
      useMaxWidth: true,
      wrap: true,
      wrapPadding: 12,
    },
    journey: {
      useMaxWidth: true,
      width: 180,
      height: 72,
      taskFontSize: 14,
    },
    c4: {
      useMaxWidth: true,
      wrap: true,
      wrapPadding: 10,
    },
    mindmap: {
      useMaxWidth: true,
      maxNodeWidth: MERMAID_LABEL_WRAP_WIDTH,
    },
    block: {
      useMaxWidth: true,
    },
  };
}
