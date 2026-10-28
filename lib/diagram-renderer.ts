import { getMermaidConfig, MERMAID_FONT_FAMILY, prepareMermaidCode } from "./mermaid";

export type DiagramEngine = "pele" | "mermaid";
export const DIAGRAM_ENGINE_STORAGE_KEY = "md-mermaid-studio-diagram-engine-v1";
export const DEFAULT_DIAGRAM_ENGINE: DiagramEngine = "pele";
export type DiagramResult = { svg: string; usedEngine: DiagramEngine; fallbackReason?: string };

// Complex multi-group flowcharts have long back-edges. Tightening them to
// the editor pane makes text and routing hard to read. Keep their natural
// dimensions and let the existing scroll container provide navigation.
export function preserveFlowchartLayout(code: string): boolean {
  if (!/^\s*(?:flowchart|graph)\s+(?:TD|TB|BT|LR|RL)\b/iu.test(code)) return false;
  const groupCount = (code.match(/^\s*subgraph\b/gimu) ?? []).length;
  const edgeCount = (code.match(/(?:-->|-\.->|==>|---)/gu) ?? []).length;
  return groupCount >= 3 || edgeCount >= 16;
}

// Pele already supplies its own root style, including --_bg, --_l,
// font measurement, and marker colors. Adding a second style attribute
// invalidates the SVG and can hide edges or turn label backgrounds black.
// Merge the theme into the existing attribute instead.
export function themePeleSvg(svg: string, dark: boolean): string {
  const root = svg.match(/^<svg\b[^>]*>/u)?.[0];
  if (!root || !svg.trimEnd().endsWith("</svg>")) {
    throw new Error("Pele 沒有產生有效 SVG");
  }
  const styleMatches = [...root.matchAll(/\sstyle="([^"]*)"/gu)];
  if (styleMatches.length !== 1) {
    throw new Error("Pele SVG 根節點的樣式屬性異常");
  }
  const originalStyle = styleMatches[0][1];
  if (!originalStyle.includes("--_bg:") || !originalStyle.includes("--_l:")) {
    throw new Error("Pele SVG 缺少線條及背景必要樣式");
  }
  const palette = dark
    ? ["#191c20", "#edf0f3", "#a6aeb8", "#d8dee6", "#292f35", "#303942", "#717e8b", "#ed7a49"]
    : ["#ffffff", "#202328", "#626c75", "#39444e", "#f4f6f8", "#e8edf2", "#a5afb9", "#d55b2c"];
  const names = ["bg", "fg", "muted", "line", "surface", "surface-alt", "border", "accent"];
  const variables = names.map((name, i) => `--pele-${name}:${palette[i]}`).join(";");
  const merged = `${originalStyle};${variables};--pele-font:${MERMAID_FONT_FAMILY}`;
  return root.replace(styleMatches[0][0], ` style="${merged}"`) + svg.slice(root.length);
}

async function renderWithMermaid(code: string, dark: boolean, id: string): Promise<string> {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize(getMermaidConfig(dark));
  const prepared = prepareMermaidCode(code);
  await mermaid.parse(prepared);
  return (await mermaid.render(id, prepared)).svg;
}

export async function renderDiagram(
  code: string,
  dark: boolean,
  requestedEngine: DiagramEngine,
  id: string,
  availableWidth?: number,
): Promise<DiagramResult> {
  if (requestedEngine === "mermaid") {
    return { svg: await renderWithMermaid(code, dark, id), usedEngine: "mermaid" };
  }
  try {
    const { renderAsync } = await import("pele/lazy");
    const rendered = await renderAsync(code, {
      idPrefix: id.replace(/[^a-zA-Z0-9_-]/gu, "-"),
      fontFamily: MERMAID_FONT_FAMILY,
      // Never scale the entire SVG down: the diagram is scrollable at its
      // actual readable size, even when its natural layout exceeds the pane.
      responsive: false,
      maxWidth: !preserveFlowchartLayout(code) && availableWidth && availableWidth >= 160
        ? availableWidth
        : undefined,
      autoDirection: true,
      links: false,
      images: false,
    });
    return { svg: themePeleSvg(rendered.svg, dark), usedEngine: "pele" };
  } catch (reason) {
    const fallbackReason = reason instanceof Error ? reason.message : String(reason);
    return {
      svg: await renderWithMermaid(code, dark, id),
      usedEngine: "mermaid",
      fallbackReason,
    };
  }
}
