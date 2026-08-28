#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mergeGuideDocuments } from "./guide-core.mjs";
import { renderMermaidBlocks } from "./render-mermaid.mjs";

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(toolDirectory, "../..");
const defaults = {
  manifest: path.join(projectRoot, "guide-order.txt"),
  intermediate: path.join(projectRoot, "build/developer-guide/all.md"),
  output: path.join(projectRoot, "dist/developer_guide.html"),
};

function parseArguments(argv) {
  const result = { ...defaults };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!["--manifest", "--intermediate", "--output"].includes(argument)) {
      throw new Error(`不支援的參數：${argument}`);
    }
    const value = argv[index + 1];
    if (!value) throw new Error(`${argument} 缺少路徑`);
    result[argument.slice(2)] = path.resolve(projectRoot, value);
    index += 1;
  }
  return result;
}

function runPandoc(arguments_, options = {}) {
  const executable = process.env.PANDOC || "pandoc";
  const result = spawnSync(executable, arguments_, {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });
  if (result.error?.code === "ENOENT") {
    throw new Error("找不到 Pandoc；請安裝 Pandoc，或以 PANDOC 指定可攜版執行檔");
  }
  if (result.status !== 0) {
    throw new Error(`Pandoc 執行失敗：${result.stderr?.trim() || result.error?.message || "未知錯誤"}`);
  }
  return result.stdout;
}

function projectRelative(absolutePath) {
  return path.relative(projectRoot, absolutePath).split(path.sep).join("/");
}

async function readManifest(manifestPath) {
  const raw = await fs.readFile(manifestPath, "utf8");
  const entries = raw.split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  if (entries.length !== 5) {
    throw new Error(`guide-order.txt 必須正好列出 5 份 Markdown，目前為 ${entries.length} 份`);
  }
  if (new Set(entries).size !== entries.length) throw new Error("guide-order.txt 含有重複路徑");

  return Promise.all(entries.map(async (entry) => {
    const absolutePath = path.resolve(projectRoot, entry);
    const insideProject = path.relative(projectRoot, absolutePath);
    if (insideProject.startsWith("..") || path.isAbsolute(insideProject)) {
      throw new Error(`文件路徑不可超出專案：${entry}`);
    }
    const stat = await fs.stat(absolutePath).catch(() => null);
    if (!stat?.isFile()) throw new Error(`找不到 Markdown 文件：${entry}`);
    if (!/\.(?:md|markdown|mdown|mkd)$/iu.test(absolutePath)) {
      throw new Error(`文件副檔名不支援：${entry}`);
    }
    return { entry, absolutePath, sourcePath: projectRelative(absolutePath) };
  }));
}

async function assertStandaloneHtml(outputPath, expectedAnchors) {
  const html = await fs.readFile(outputPath, "utf8");
  if (!/^<!DOCTYPE html>/iu.test(html)) throw new Error("輸出不是完整的 standalone HTML");
  if (!/<nav[^>]+id="TOC"/iu.test(html)) throw new Error("輸出缺少單頁目錄");
  if (/(?:src|href)="(?:generated\/|tools\/developer-guide\/guide\.css)/iu.test(html)) {
    throw new Error("輸出仍引用本機資源，尚未完成單檔嵌入");
  }
  for (const anchor of expectedAnchors) {
    if (!html.includes(`id="${anchor}"`)) throw new Error(`HTML 缺少 Anchor：${anchor}`);
  }
  return Buffer.byteLength(html);
}

export async function buildGuide(options = parseArguments(process.argv.slice(2))) {
  const sources = await readManifest(options.manifest);
  const parsedDocuments = sources.map((source) => {
    const json = runPandoc(["--from=gfm+attributes", "--to=json", source.absolutePath]);
    return { sourcePath: source.sourcePath, ast: JSON.parse(json) };
  });
  const merged = mergeGuideDocuments(parsedDocuments);

  const intermediateDirectory = path.dirname(options.intermediate);
  const generatedDirectory = path.join(intermediateDirectory, "generated");
  await fs.mkdir(intermediateDirectory, { recursive: true });
  await fs.mkdir(path.dirname(options.output), { recursive: true });
  const mermaidCount = await renderMermaidBlocks(merged.ast, generatedDirectory);

  const markdown = runPandoc(
    ["--from=json", "--to=gfm+attributes", "--wrap=none"],
    { input: JSON.stringify(merged.ast) },
  );
  await fs.writeFile(options.intermediate, markdown, "utf8");

  runPandoc([
    `--defaults=${path.join(toolDirectory, "pandoc-defaults.yaml")}`,
    `--resource-path=${intermediateDirectory}`,
    options.intermediate,
    `--output=${options.output}`,
  ]);

  const bytes = await assertStandaloneHtml(
    options.output,
    merged.documents.map((document) => document.rootAnchor),
  );
  return {
    sourceCount: sources.length,
    anchorCount: merged.anchorCount,
    rewrittenLinks: merged.rewrittenLinks,
    mermaidCount,
    intermediate: projectRelative(options.intermediate),
    output: projectRelative(options.output),
    bytes,
  };
}

const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try {
    const summary = await buildGuide();
    console.log(`Developer Guide 建置完成：${summary.output}`);
    console.log(`文件 ${summary.sourceCount}、Anchor ${summary.anchorCount}、改寫連結 ${summary.rewrittenLinks}、Mermaid ${summary.mermaidCount}`);
    console.log(`單一 HTML 大小：${summary.bytes} bytes`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

