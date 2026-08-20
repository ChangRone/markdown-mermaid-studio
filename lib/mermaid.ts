import type { MermaidConfig } from "mermaid";

export const MERMAID_LABEL_WRAP_WIDTH = 200;
export const MERMAID_FONT_FAMILY =
  "Inter, Noto Sans TC, PingFang TC, Microsoft JhengHei, system-ui, sans-serif";

const LONG_GROUP_LABEL_WIDTH = 32;

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

export function prepareMermaidCode(code: string) {
  return code.split("\n").map(prepareSubgraphLabel).join("\n");
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
    c4: {
      useMaxWidth: true,
      wrap: true,
      wrapPadding: 10,
    },
    mindmap: {
      useMaxWidth: true,
      maxNodeWidth: MERMAID_LABEL_WRAP_WIDTH,
    },
  };
}
