import path from "node:path";

const MARKDOWN_EXTENSION = /\.(?:md|markdown|mdown|mkd)$/iu;
const EXTERNAL_TARGET = /^(?:[a-z][a-z\d+.-]*:|\/\/)/iu;

function clone(value) {
  return structuredClone(value);
}

function normalizePath(value) {
  return path.posix.normalize(value.replaceAll("\\", "/"));
}

function inlineText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(inlineText).join("");
  if (!value || typeof value !== "object") return "";
  if (value.t === "Space" || value.t === "SoftBreak" || value.t === "LineBreak") return " ";
  if (value.t === "Code" || value.t === "Math") return inlineText(value.c?.at(-1));
  return inlineText(value.c);
}

export function anchorSlug(value) {
  const slug = value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}_-]+/gu, " ")
    .trim()
    .replace(/[\s_]+/gu, "-")
    .replace(/-+/gu, "-");
  return slug || "section";
}

function fallbackTitle(sourcePath) {
  const stem = path.posix.basename(sourcePath, path.posix.extname(sourcePath));
  return stem.replace(/^\d+[-_. ]*/u, "").replace(/[-_]+/gu, " ") || stem;
}

function textInlines(value) {
  return [{ t: "Str", c: value }];
}

function header(level, identifier, title) {
  return { t: "Header", c: [level, [identifier, [], []], textInlines(title)] };
}

function walk(value, visitor) {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visitor);
    return;
  }
  if (!value || typeof value !== "object") return;
  visitor(value);
  if ("c" in value) walk(value.c, visitor);
}

function decodePart(value, label) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error(`${label} 含有無效的 URL 編碼：${value}`);
  }
}

function lookupAnchor(document, rawFragment, originalTarget) {
  const decoded = decodePart(rawFragment, "連結 Anchor");
  const candidates = [decoded, decoded.replace(/^#/u, ""), anchorSlug(decoded)];
  for (const candidate of candidates) {
    const match = document.anchors.get(candidate);
    if (match) return match;
  }
  throw new Error(`找不到頁內目標：${originalTarget}（來源：${document.sourcePath}）`);
}

function rewriteTarget(target, current, documentByPath) {
  if (!target || EXTERNAL_TARGET.test(target)) return target;

  const hashAt = target.indexOf("#");
  const rawPath = hashAt >= 0 ? target.slice(0, hashAt) : target;
  const rawFragment = hashAt >= 0 ? target.slice(hashAt + 1) : "";

  if (!rawPath) {
    return rawFragment ? `#${lookupAnchor(current, rawFragment, target)}` : target;
  }

  const decodedPath = decodePart(rawPath, "連結路徑");
  if (!MARKDOWN_EXTENSION.test(decodedPath)) return target;

  const resolved = normalizePath(path.posix.join(path.posix.dirname(current.sourcePath), decodedPath));
  const destination = documentByPath.get(resolved);
  if (!destination) {
    throw new Error(`跨文件連結未納入 guide-order.txt：${target}（來源：${current.sourcePath}）`);
  }

  if (!rawFragment) return `#${destination.rootAnchor}`;
  return `#${lookupAnchor(destination, rawFragment, target)}`;
}

export function mergeGuideDocuments(inputDocuments) {
  if (!Array.isArray(inputDocuments) || inputDocuments.length === 0) {
    throw new Error("guide-order.txt 至少需要一份 Markdown 文件");
  }

  const seenPaths = new Set();
  const seenAnchors = new Set();
  const documents = inputDocuments.map((input, index) => {
    const sourcePath = normalizePath(input.sourcePath);
    if (seenPaths.has(sourcePath)) throw new Error(`文件重複列入：${sourcePath}`);
    seenPaths.add(sourcePath);

    const ast = clone(input.ast);
    const blocks = ast.blocks ?? [];
    const stem = path.posix.basename(sourcePath, path.posix.extname(sourcePath));
    const rootAnchor = `doc-${anchorSlug(stem)}`;
    if (seenAnchors.has(rootAnchor)) throw new Error(`文件 Anchor 重複：${rootAnchor}`);

    let firstLevelOne = blocks.find((block) => block?.t === "Header" && block.c?.[0] === 1);
    if (!firstLevelOne) {
      firstLevelOne = header(1, "", fallbackTitle(sourcePath));
      blocks.unshift(firstLevelOne);
    }

    const anchors = new Map();
    let rootAssigned = false;
    for (const block of blocks) {
      if (block?.t !== "Header") continue;
      const [level, attributes, inlines] = block.c;
      const originalId = attributes[0] || anchorSlug(inlineText(inlines));
      const newId = level === 1 && !rootAssigned
        ? rootAnchor
        : `${rootAnchor}--${anchorSlug(originalId)}`;
      if (seenAnchors.has(newId)) {
        throw new Error(`章節 Anchor 重複：${newId}（來源：${sourcePath}）`);
      }
      seenAnchors.add(newId);
      attributes[0] = newId;
      anchors.set(originalId, newId);
      anchors.set(anchorSlug(originalId), newId);
      anchors.set(anchorSlug(inlineText(inlines)), newId);
      if (level === 1 && !rootAssigned) {
        anchors.set(rootAnchor, rootAnchor);
        rootAssigned = true;
      }
    }

    return {
      index,
      sourcePath,
      rootAnchor,
      anchors,
      blocks,
      ast,
    };
  });

  const documentByPath = new Map(documents.map((document) => [document.sourcePath, document]));
  let rewrittenLinks = 0;
  for (const document of documents) {
    walk(document.blocks, (node) => {
      if (node.t !== "Link") return;
      const target = node.c?.[2]?.[0];
      if (typeof target !== "string") return;
      const rewritten = rewriteTarget(target, document, documentByPath);
      if (rewritten !== target) {
        node.c[2][0] = rewritten;
        rewrittenLinks += 1;
      }
    });
  }

  const blocks = [];
  documents.forEach((document, index) => {
    if (index > 0) blocks.push({ t: "HorizontalRule" });
    blocks.push(...document.blocks);
  });

  return {
    ast: {
      "pandoc-api-version": clone(inputDocuments[0].ast["pandoc-api-version"]),
      meta: clone(inputDocuments[0].ast.meta ?? {}),
      blocks,
    },
    documents,
    rewrittenLinks,
    anchorCount: seenAnchors.size,
  };
}
