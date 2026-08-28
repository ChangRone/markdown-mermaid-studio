import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkBreaks from "remark-breaks";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { getMermaidConfig, prepareMermaidCode } from "./mermaid";

const MARKDOWN_EXTENSION = /\.(?:md|markdown|mdown|mkd|txt)$/iu;
const MARKDOWN_LINK_EXTENSION = /\.(?:md|markdown|mdown|mkd)$/iu;
const EXTERNAL_TARGET = /^(?:[a-z][a-z\d+.-]*:|\/\/)/iu;

export const MAX_MERGE_FILES = 50;
export const MAX_MERGE_TOTAL_BYTES = 20 * 1024 * 1024;

type MdNode = {
  type: string;
  value?: string;
  url?: string;
  depth?: number;
  lang?: string | null;
  children?: MdNode[];
  data?: Record<string, unknown> & {
    hProperties?: Record<string, unknown>;
    generatedHtml?: boolean;
  };
};

export type MergeSource = {
  name: string;
  content: string;
  path?: string;
  size?: number;
};

export type MergeHeading = {
  id: string;
  depth: number;
  text: string;
  documentIndex: number;
};

export type MergeSummary = {
  fileCount: number;
  anchorCount: number;
  rewrittenLinks: number;
  mermaidCount: number;
};

export type MergePreparation = {
  errors: string[];
  warnings: string[];
  headings: MergeHeading[];
  markdown: string;
  summary: MergeSummary;
  ast: MdNode;
};

export type SingleHtmlBuild = MergePreparation & {
  html: string;
};

export type SingleHtmlOptions = {
  title?: string;
  dark?: boolean;
  renderMermaid?: (code: string, index: number, dark: boolean) => Promise<string>;
};

type PreparedDocument = {
  index: number;
  source: MergeSource;
  sourcePath: string;
  basename: string;
  rootAnchor: string;
  ast: MdNode;
  anchors: Map<string, string>;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function normalizePath(value: string) {
  const normalized: string[] = [];
  for (const part of value.replaceAll("\\", "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") normalized.pop();
    else normalized.push(part);
  }
  return normalized.join("/");
}

function basename(value: string) {
  return normalizePath(value).split("/").at(-1) || value;
}

function dirname(value: string) {
  const parts = normalizePath(value).split("/");
  parts.pop();
  return parts.join("/");
}

function stem(value: string) {
  return basename(value).replace(MARKDOWN_EXTENSION, "");
}

function joinPath(left: string, right: string) {
  return normalizePath(left ? `${left}/${right}` : right);
}

function fallbackTitle(sourcePath: string) {
  const value = stem(sourcePath).replace(/^\d+[-_. ]*/u, "").replace(/[-_]+/gu, " ").trim();
  return value || stem(sourcePath) || "未命名文件";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function decodePart(value: string, label: string, errors: string[]) {
  try {
    return decodeURIComponent(value);
  } catch {
    errors.push(`${label}含有無效的 URL 編碼：${value}`);
    return value;
  }
}

function inlineText(node: MdNode | MdNode[] | string | undefined): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(inlineText).join("");
  if (!node) return "";
  if (node.type === "break") return " ";
  if (typeof node.value === "string") return node.value;
  return inlineText(node.children);
}

function walk(node: MdNode, visitor: (node: MdNode, parent?: MdNode) => void, parent?: MdNode) {
  visitor(node, parent);
  for (const child of node.children || []) walk(child, visitor, node);
}

export function anchorSlug(value: string) {
  const slug = value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}_-]+/gu, " ")
    .trim()
    .replace(/[\s_]+/gu, "-")
    .replace(/-+/gu, "-");
  return slug || "section";
}

function parseSource(source: MergeSource) {
  return unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkGfm)
    .use(remarkMath)
    .parse(source.content) as MdNode;
}

function stringifyMarkdown(ast: MdNode) {
  return String(
    unified()
      .use(remarkStringify, { bullet: "-", fences: true })
      .use(remarkFrontmatter, ["yaml"])
      .use(remarkGfm)
      .use(remarkMath)
      .stringify(ast as never),
  );
}

function headingNode(title: string): MdNode {
  return { type: "heading", depth: 1, children: [{ type: "text", value: title }] };
}

function lookupAnchor(
  document: PreparedDocument,
  rawFragment: string,
  originalTarget: string,
  errors: string[],
) {
  const decoded = decodePart(rawFragment, "連結 Anchor ", errors).replace(/^#/u, "");
  const match = document.anchors.get(decoded) || document.anchors.get(anchorSlug(decoded));
  if (match) return match;
  errors.push(`找不到頁內目標：${originalTarget}（來源：${document.sourcePath}）`);
  return "";
}

function rewriteTarget(
  target: string,
  current: PreparedDocument,
  byPath: Map<string, PreparedDocument>,
  byBasename: Map<string, PreparedDocument>,
  errors: string[],
) {
  if (!target || EXTERNAL_TARGET.test(target)) return target;
  const hashAt = target.indexOf("#");
  const rawPath = hashAt >= 0 ? target.slice(0, hashAt) : target;
  const rawFragment = hashAt >= 0 ? target.slice(hashAt + 1) : "";

  if (!rawPath) {
    if (!rawFragment) return target;
    const anchor = lookupAnchor(current, rawFragment, target, errors);
    return anchor ? `#${anchor}` : target;
  }

  const decodedPath = decodePart(rawPath, "連結路徑 ", errors);
  if (!MARKDOWN_LINK_EXTENSION.test(decodedPath)) return target;
  const resolved = joinPath(dirname(current.sourcePath), decodedPath);
  const destination = byPath.get(resolved) || byBasename.get(basename(decodedPath).toLocaleLowerCase());
  if (!destination) {
    errors.push(`跨文件連結未納入合併清單：${target}（來源：${current.sourcePath}）`);
    return target;
  }
  if (!rawFragment) return `#${destination.rootAnchor}`;
  const anchor = lookupAnchor(destination, rawFragment, target, errors);
  return anchor ? `#${anchor}` : target;
}

function markdownAstWithAnchors(ast: MdNode) {
  const output = clone(ast);
  const addAnchors = (node: MdNode) => {
    if (!node.children) return;
    const children: MdNode[] = [];
    for (const child of node.children) {
      const id = child.type === "heading"
        ? String(child.data?.hProperties?.id || "")
        : "";
      if (id) {
        children.push({
          type: "html",
          value: `<a id="${escapeHtml(id)}"></a>`,
          data: { generatedHtml: true },
        });
      }
      addAnchors(child);
      children.push(child);
    }
    node.children = children;
  };
  addAnchors(output);
  return output;
}

export function prepareSingleHtml(sources: MergeSource[]): MergePreparation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const headings: MergeHeading[] = [];
  const totalBytes = sources.reduce(
    (sum, source) => sum + (source.size ?? new TextEncoder().encode(source.content).length),
    0,
  );

  if (!sources.length) errors.push("請至少選擇一份 Markdown 文件");
  if (sources.length > MAX_MERGE_FILES) errors.push(`一次最多合併 ${MAX_MERGE_FILES} 份文件`);
  if (totalBytes > MAX_MERGE_TOTAL_BYTES) errors.push("全部文件合計不可超過 20 MB");

  const seenPaths = new Set<string>();
  const seenBasenames = new Set<string>();
  const prepared: PreparedDocument[] = [];
  for (const [index, source] of sources.entries()) {
    const sourcePath = normalizePath(source.path || source.name);
    const sourceBasename = basename(sourcePath).toLocaleLowerCase();
    if (!MARKDOWN_EXTENSION.test(source.name)) {
      errors.push(`不支援的文件格式：${source.name}`);
      continue;
    }
    if (seenPaths.has(sourcePath)) {
      errors.push(`文件重複列入：${sourcePath}`);
      continue;
    }
    if (seenBasenames.has(sourceBasename)) {
      errors.push(`檔名重複，無法安全解析跨文件連結：${basename(sourcePath)}`);
      continue;
    }
    seenPaths.add(sourcePath);
    seenBasenames.add(sourceBasename);
    try {
      prepared.push({
        index,
        source,
        sourcePath,
        basename: sourceBasename,
        rootAnchor: `doc-${String(index + 1).padStart(2, "0")}-${anchorSlug(stem(sourcePath))}`,
        ast: parseSource(source),
        anchors: new Map(),
      });
    } catch (reason) {
      errors.push(`無法解析 ${source.name}：${reason instanceof Error ? reason.message : String(reason)}`);
    }
  }

  const usedAnchors = new Set<string>();
  for (const document of prepared) {
    const children = document.ast.children || [];
    if (!children.some((node) => node.type === "heading" && node.depth === 1)) {
      children.unshift(headingNode(fallbackTitle(document.sourcePath)));
      document.ast.children = children;
    }
    let rootAssigned = false;
    const slugCounts = new Map<string, number>();
    walk(document.ast, (node) => {
      if (node.type !== "heading") return;
      const text = inlineText(node.children).trim() || "未命名章節";
      const baseSlug = anchorSlug(text);
      const count = (slugCounts.get(baseSlug) || 0) + 1;
      slugCounts.set(baseSlug, count);
      const uniqueSlug = count === 1 ? baseSlug : `${baseSlug}-${count}`;
      const isRoot = node.depth === 1 && !rootAssigned;
      const id = isRoot ? document.rootAnchor : `${document.rootAnchor}--${uniqueSlug}`;
      if (usedAnchors.has(id)) errors.push(`章節 Anchor 重複：${id}（來源：${document.sourcePath}）`);
      usedAnchors.add(id);
      node.data = { ...(node.data || {}), hProperties: { ...(node.data?.hProperties || {}), id } };
      document.anchors.set(uniqueSlug, id);
      if (count === 1) document.anchors.set(baseSlug, id);
      document.anchors.set(text, id);
      if (isRoot) {
        document.anchors.set(document.rootAnchor, document.rootAnchor);
        rootAssigned = true;
      }
      headings.push({ id, depth: node.depth || 1, text, documentIndex: document.index });
    });
  }

  const byPath = new Map(prepared.map((document) => [document.sourcePath, document]));
  const byBasename = new Map(prepared.map((document) => [document.basename, document]));
  let rewrittenLinks = 0;
  let mermaidCount = 0;
  for (const document of prepared) {
    walk(document.ast, (node) => {
      if (node.type === "code" && node.lang?.toLocaleLowerCase() === "mermaid") mermaidCount += 1;
      if (node.type === "link" && typeof node.url === "string") {
        const rewritten = rewriteTarget(node.url, document, byPath, byBasename, errors);
        if (rewritten !== node.url) {
          node.url = rewritten;
          rewrittenLinks += 1;
        }
      }
      if (node.type === "image" && typeof node.url === "string" &&
          !EXTERNAL_TARGET.test(node.url) && !node.url.startsWith("data:") && !node.url.startsWith("#")) {
        warnings.push(`本機圖片未嵌入單頁 HTML：${node.url}（來源：${document.sourcePath}）`);
      }
    });
  }

  const mergedChildren: MdNode[] = [];
  prepared.forEach((document, index) => {
    const children = document.ast.children || [];
    const filtered = children.filter((node) => {
      if (node.type !== "yaml") return true;
      if (index === 0 && mergedChildren.length === 0) return true;
      warnings.push(`已略過 ${document.sourcePath} 的次要 Frontmatter，單頁只保留第一份`);
      return false;
    });
    if (index > 0) mergedChildren.push({ type: "thematicBreak" });
    mergedChildren.push(...filtered);
  });
  const ast: MdNode = { type: "root", children: mergedChildren };
  let markdown = "";
  try {
    markdown = stringifyMarkdown(markdownAstWithAnchors(ast));
  } catch (reason) {
    errors.push(`無法產生合併 Markdown：${reason instanceof Error ? reason.message : String(reason)}`);
  }

  return {
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    headings,
    markdown,
    summary: {
      fileCount: prepared.length,
      anchorCount: usedAnchors.size,
      rewrittenLinks,
      mermaidCount,
    },
    ast,
  };
}

async function defaultMermaidRenderer(code: string, index: number, dark: boolean) {
  const mermaid = (await import("mermaid")).default;
  const prepared = prepareMermaidCode(code);
  mermaid.initialize(getMermaidConfig(dark));
  await mermaid.parse(prepared);
  const id = `single-html-mermaid-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return (await mermaid.render(id, prepared)).svg;
}

async function prepareRenderAst(
  ast: MdNode,
  dark: boolean,
  renderer: NonNullable<SingleHtmlOptions["renderMermaid"]>,
) {
  const output = clone(ast);
  let diagramIndex = 0;
  const transformChildren = async (node: MdNode) => {
    if (!node.children) return;
    const children: MdNode[] = [];
    for (const child of node.children) {
      if (child.type === "code" && child.lang?.toLocaleLowerCase() === "mermaid") {
        const currentIndex = diagramIndex++;
        const svg = await renderer(child.value || "", currentIndex, dark);
        children.push({
          type: "html",
          value: `<figure class="mermaid-figure" aria-label="Mermaid 圖表 ${currentIndex + 1}">${svg}</figure>`,
          data: { generatedHtml: true },
        });
        continue;
      }
      if (child.type === "html" && !child.data?.generatedHtml) {
        children.push({ type: "text", value: child.value || "" });
        continue;
      }
      await transformChildren(child);
      children.push(child);
    }
    node.children = children;
  };
  await transformChildren(output);
  return output;
}

function rehypeLinkPolicy() {
  return (tree: MdNode) => {
    walk(tree, (node) => {
      if (node.type !== "element") return;
      const properties = (node as MdNode & { tagName?: string; properties?: Record<string, unknown> }).properties;
      const tagName = (node as MdNode & { tagName?: string }).tagName;
      if (tagName !== "a" || !properties || typeof properties.href !== "string") return;
      if (!properties.href.startsWith("#")) {
        properties.target = "_blank";
        properties.rel = ["noreferrer", "noopener"];
      }
    });
  };
}

function tocHtml(headings: MergeHeading[]) {
  const visible = headings.filter((heading) => heading.depth <= 3);
  return visible.map((heading) => (
    `<a class="toc-depth-${heading.depth}" href="#${escapeHtml(heading.id)}">${escapeHtml(heading.text)}</a>`
  )).join("\n");
}

const STANDALONE_CSS = `
:root{color-scheme:light;--bg:#f4f5f7;--panel:#fff;--soft:#f8f9fb;--line:#e3e6ea;--text:#202328;--muted:#727983;--accent:#d55b2c}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--text);background:var(--bg);font-family:Inter,"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif;line-height:1.75;word-break:break-word;overflow-wrap:anywhere}
.guide-shell{display:grid;grid-template-columns:280px minmax(0,1fr);max-width:1440px;margin:auto;min-height:100vh}.guide-toc{position:sticky;top:0;height:100vh;overflow:auto;padding:28px 20px;border-right:1px solid var(--line);background:var(--panel)}.guide-toc strong{display:block;margin-bottom:16px;font-size:15px}.guide-toc a{display:block;margin:3px 0;padding:5px 8px;border-radius:6px;color:var(--muted);font-size:12px;text-decoration:none}.guide-toc a:hover{color:var(--accent);background:#fff0e8}.guide-toc .toc-depth-2{padding-left:18px}.guide-toc .toc-depth-3{padding-left:30px;font-size:11px}.guide-content{min-width:0;max-width:980px;padding:54px clamp(28px,6vw,88px) 100px;background:var(--panel)}
h1{margin:0 0 24px;padding:20px 0 14px;border-bottom:1px solid var(--line);font-size:30px;line-height:1.3}h1:not(:first-child){margin-top:58px}h2{margin:36px 0 14px;font-size:21px}h3{margin:28px 0 10px;font-size:17px}h4,h5,h6{margin:22px 0 8px}p{margin:10px 0;color:#3e434b}a{color:var(--accent);text-underline-offset:3px}blockquote{margin:20px 0;padding:12px 16px;border-left:3px solid var(--accent);background:#fff0e8}table{width:100%;margin:20px 0;border-collapse:collapse;font-size:13px}th,td{padding:9px 11px;border:1px solid var(--line);text-align:left}th{background:var(--soft)}code{padding:2px 5px;border-radius:4px;color:var(--accent);background:#fff0e8;font-family:"SFMono-Regular","Cascadia Code",Consolas,monospace}pre{overflow:auto;padding:16px;border:1px solid var(--line);border-radius:8px;background:var(--soft)}pre code{padding:0;color:inherit;background:transparent}img,svg{max-width:100%;height:auto}.mermaid-figure{overflow:auto;margin:24px 0;padding:20px;border:1px solid var(--line);border-radius:10px;background:var(--soft);text-align:center}.mermaid-figure svg{display:inline-block}.nodeLabel,.edgeLabel,.cluster-label{white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important}.katex-mathml{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(1px,1px,1px,1px)}.katex-display{overflow:auto;padding:8px 0;text-align:center}hr{margin:44px 0;border:0;border-top:2px solid var(--line)}
@media(max-width:820px){.guide-shell{display:block}.guide-toc{position:relative;width:auto;height:auto;max-height:38vh;border-right:0;border-bottom:1px solid var(--line)}.guide-content{padding:28px 20px 70px}h1{font-size:25px}}
`;

export async function buildSingleHtml(
  sources: MergeSource[],
  options: SingleHtmlOptions = {},
): Promise<SingleHtmlBuild> {
  const prepared = prepareSingleHtml(sources);
  if (prepared.errors.length) throw new Error(prepared.errors.join("\n"));
  const title = options.title?.trim() || "合併文件指南";
  const dark = options.dark === true;
  const renderAst = await prepareRenderAst(
    prepared.ast,
    dark,
    options.renderMermaid || defaultMermaidRenderer,
  );
  const processor = unified()
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkBreaks)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeKatex)
    .use(rehypeLinkPolicy)
    .use(rehypeStringify, { allowDangerousHtml: true });
  const hast = await processor.run(renderAst as never);
  const body = String(processor.stringify(hast));
  const darkOverride = dark
    ? ":root{color-scheme:dark;--bg:#111316;--panel:#191c20;--soft:#15181c;--line:#2d3137;--text:#eef0f2;--muted:#a1a8b2;--accent:#ed7a49}p{color:#d2d6dc}blockquote,code{background:#38241c}"
    : "";
  const html = `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>${STANDALONE_CSS}${darkOverride}</style></head>
<body><div class="guide-shell"><nav class="guide-toc" aria-label="文件索引"><strong>${escapeHtml(title)}</strong>${tocHtml(prepared.headings)}</nav><main class="guide-content">${body}</main></div></body></html>`;
  return { ...prepared, html };
}
