import { getMermaidConfig, MERMAID_FONT_FAMILY, prepareMermaidCode } from "./mermaid";

export type DiagramEngine = "pele" | "mermaid";
export const DIAGRAM_ENGINE_STORAGE_KEY = "md-mermaid-studio-diagram-engine-v1";
export const DEFAULT_DIAGRAM_ENGINE: DiagramEngine = "pele";
export type DiagramResult = { svg: string; usedEngine: DiagramEngine; fallbackReason?: string };

// Inline the theme on the SVG root so SVG/PNG/standalone HTML exports retain colors.
export function themePeleSvg(svg: string, dark: boolean): string {
  if (!/^<svg\b/u.test(svg)) throw new Error("Pele 沒有產生有效 SVG");
  const palette = dark
    ? ["#191c20", "#edf0f3", "#a6aeb8", "#d8dee6", "#292f35", "#303942", "#717e8b", "#ed7a49"]
    : ["#ffffff", "#202328", "#626c75", "#39444e", "#f4f6f8", "#e8edf2", "#a5afb9", "#d55b2c"];
  const names = ["bg", "fg", "muted", "line", "surface", "surface-alt", "border", "accent"];
  const variables = names.map((name, i) => `--pele-${name}:${palette[i]}`).join(";");
  return svg.replace(/^<svg\b/u, `<svg style="${variables};--pele-font:${MERMAID_FONT_FAMILY}"`);
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
      maxWidth: availableWidth && availableWidth >= 160 ? availableWidth : undefined,
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
