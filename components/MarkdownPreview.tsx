/* eslint-disable @next/next/no-img-element */
"use client";

import {
  Check,
  Clipboard,
  Download,
  ImageDown,
  LocateFixed,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { extractMermaidBlocks, parseFrontmatter } from "@/lib/studio";

type MarkdownNode = ExtraProps["node"];

type MarkdownPreviewProps = {
  markdown: string;
  dark: boolean;
  activeLine?: number;
  onJumpSource: (line: number, endLine?: number) => void;
  onNotify: (message: string) => void;
};

function sourceAttributes(node: MarkdownNode) {
  const start = node?.position?.start.line;
  const end = node?.position?.end.line;
  return {
    "data-source-start": start,
    "data-source-end": end,
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function svgToPng(svg: string, dark: boolean) {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("SVG 圖片載入失敗"));
      image.src = url;
    });
    const width = Math.max(320, Math.min(4096, image.naturalWidth || 1200));
    const height = Math.max(180, Math.min(4096, image.naturalHeight || 700));
    const scale = Math.min(2, 4096 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("瀏覽器無法建立圖片畫布");
    context.fillStyle = dark ? "#191c20" : "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("PNG 轉換失敗"))),
        "image/png",
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function MermaidDiagram({
  code,
  dark,
  index,
  startLine,
  endLine,
  onJumpSource,
  onNotify,
}: {
  code: string;
  dark: boolean;
  index: number;
  startLine: number;
  endLine: number;
  onJumpSource: (line: number, endLine?: number) => void;
  onNotify: (message: string) => void;
}) {
  const targetRef = useRef<HTMLDivElement>(null);
  const rawId = useId();
  const [error, setError] = useState("");
  const [svg, setSvg] = useState("");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let active = true;
    const draw = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: dark ? "dark" : "neutral",
          fontFamily: "Inter, Noto Sans TC, system-ui, sans-serif",
          suppressErrorRendering: true,
        });
        await mermaid.parse(code);
        const id = `diagram-${rawId.replace(/[^a-zA-Z0-9]/g, "")}-${Date.now()}`;
        const rendered = await mermaid.render(id, code);
        if (active && targetRef.current) {
          targetRef.current.innerHTML = rendered.svg;
          setSvg(rendered.svg);
          setError("");
        }
      } catch (reason) {
        if (active) {
          const message = reason instanceof Error ? reason.message : String(reason);
          setError(message.split("\n").filter(Boolean).slice(0, 3).join(" "));
          setSvg("");
        }
      }
    };
    void draw();
    return () => {
      active = false;
    };
  }, [code, dark, rawId]);

  const filename = `mermaid-diagram-${index + 1}`;
  if (error) {
    return (
      <div
        className="diagram-error source-positioned"
        role="alert"
        data-source-start={startLine}
        data-source-end={endLine}
      >
        <strong>Mermaid 無法顯示</strong>
        <span>{error}</span>
        <button type="button" onClick={() => onJumpSource(startLine, endLine)}>
          <LocateFixed size={13} />跳到來源第 {startLine} 行
        </button>
      </div>
    );
  }

  return (
    <figure
      className="diagram-figure source-positioned"
      data-source-start={startLine}
      data-source-end={endLine}
    >
      <div className="diagram-toolbar">
        <span>Mermaid #{index + 1}</span>
        <div>
          <button
            type="button"
            title="縮小"
            onClick={(event) => {
              event.stopPropagation();
              setZoom((value) => Math.max(0.5, value - 0.15));
            }}
          ><Minus size={13} /></button>
          <button
            type="button"
            title="重設縮放"
            onClick={(event) => {
              event.stopPropagation();
              setZoom(1);
            }}
          ><RotateCcw size={13} /></button>
          <button
            type="button"
            title="放大"
            onClick={(event) => {
              event.stopPropagation();
              setZoom((value) => Math.min(2.5, value + 0.15));
            }}
          ><Plus size={13} /></button>
          <button
            type="button"
            title="複製 Mermaid 原始碼"
            onClick={async (event) => {
              event.stopPropagation();
              await navigator.clipboard.writeText(code);
              onNotify("Mermaid 原始碼已複製");
            }}
          ><Clipboard size={13} /></button>
          <button
            type="button"
            title="下載 SVG"
            disabled={!svg}
            onClick={(event) => {
              event.stopPropagation();
              downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${filename}.svg`);
              onNotify("SVG 已下載");
            }}
          ><Download size={13} /><span>SVG</span></button>
          <button
            type="button"
            title="下載 PNG"
            disabled={!svg}
            onClick={async (event) => {
              event.stopPropagation();
              try {
                downloadBlob(await svgToPng(svg, dark), `${filename}.png`);
                onNotify("PNG 已下載");
              } catch (reason) {
                onNotify(reason instanceof Error ? reason.message : "PNG 匯出失敗");
              }
            }}
          ><ImageDown size={13} /><span>PNG</span></button>
        </div>
      </div>
      <div className="mermaid-scroll">
        <div
          className="mermaid-canvas"
          ref={targetRef}
          aria-label={`Mermaid 圖表 ${index + 1}`}
          style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
        />
      </div>
    </figure>
  );
}

export default function MarkdownPreview({
  markdown,
  dark,
  activeLine,
  onJumpSource,
  onNotify,
}: MarkdownPreviewProps) {
  const articleRef = useRef<HTMLElement>(null);
  const frontmatter = useMemo(() => parseFrontmatter(markdown), [markdown]);
  const mermaidBlocks = useMemo(() => extractMermaidBlocks(markdown), [markdown]);

  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const candidates = [...article.querySelectorAll<HTMLElement>("[data-source-start]")];
    for (const candidate of candidates) candidate.removeAttribute("data-source-active");
    if (!activeLine) return;
    const target = candidates
      .map((element) => ({
        element,
        start: Number(element.dataset.sourceStart),
        end: Number(element.dataset.sourceEnd || element.dataset.sourceStart),
      }))
      .filter(({ start, end }) => activeLine >= start && activeLine <= end)
      .sort((a, b) => (a.end - a.start) - (b.end - b.start))[0];
    target?.element.setAttribute("data-source-active", "true");
  }, [activeLine, markdown]);

  const components = useMemo<Components>(() => {
    const positioned = (node: MarkdownNode) => sourceAttributes(node);
    return {
      h1: ({ node, ...props }) => <h1 {...positioned(node)} {...props} />,
      h2: ({ node, ...props }) => <h2 {...positioned(node)} {...props} />,
      h3: ({ node, ...props }) => <h3 {...positioned(node)} {...props} />,
      h4: ({ node, ...props }) => <h4 {...positioned(node)} {...props} />,
      h5: ({ node, ...props }) => <h5 {...positioned(node)} {...props} />,
      h6: ({ node, ...props }) => <h6 {...positioned(node)} {...props} />,
      p: ({ node, ...props }) => <p {...positioned(node)} {...props} />,
      ul: ({ node, ...props }) => <ul {...positioned(node)} {...props} />,
      ol: ({ node, ...props }) => <ol {...positioned(node)} {...props} />,
      li: ({ node, ...props }) => <li {...positioned(node)} {...props} />,
      blockquote: ({ node, ...props }) => <blockquote {...positioned(node)} {...props} />,
      table: ({ node, ...props }) => <table {...positioned(node)} {...props} />,
      thead: ({ node, ...props }) => <thead {...positioned(node)} {...props} />,
      tbody: ({ node, ...props }) => <tbody {...positioned(node)} {...props} />,
      tr: ({ node, ...props }) => <tr {...positioned(node)} {...props} />,
      hr: ({ node, ...props }) => <hr {...positioned(node)} {...props} />,
      img: ({ node, alt, ...props }) => <img {...positioned(node)} alt={alt ?? ""} {...props} />,
      pre: ({ children }) => <>{children}</>,
      code: ({ className, children, node, ...props }) => {
        const code = String(children ?? "").replace(/\n$/, "");
        if (className === "language-mermaid") {
          const startLine = node?.position?.start.line ?? 1;
          const endLine = node?.position?.end.line ?? startLine;
          const detectedIndex = mermaidBlocks.findIndex(
            (block) => startLine >= block.fenceLine && startLine <= block.endLine + 1,
          );
          const index = detectedIndex >= 0 ? detectedIndex : 0;
          return (
            <MermaidDiagram
              code={code}
              dark={dark}
              index={index}
              startLine={startLine}
              endLine={endLine}
              onJumpSource={onJumpSource}
              onNotify={onNotify}
            />
          );
        }
        if (!className && !code.includes("\n")) {
          return <code className="inline-code" {...props}>{children}</code>;
        }
        return (
          <pre className="code-block" {...positioned(node)}>
            <code className={className} {...props}>{children}</code>
          </pre>
        );
      },
      a: ({ href, children, ...props }) => (
        <a href={href} target="_blank" rel="noreferrer" {...props}>{children}</a>
      ),
    };
  }, [dark, mermaidBlocks, onJumpSource, onNotify]);

  const handlePreviewClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea")) return;
    const positioned = target.closest<HTMLElement>("[data-source-start]");
    const line = Number(positioned?.dataset.sourceStart);
    const end = Number(positioned?.dataset.sourceEnd);
    if (line > 0) onJumpSource(line, end > 0 ? end : undefined);
  };

  return (
    <article ref={articleRef} className="markdown-body" onClick={handlePreviewClick}>
      {frontmatter.length > 0 && (
        <section
          className="frontmatter-card source-positioned"
          data-source-start="1"
          data-source-end={frontmatter.length + 2}
        >
          <div><Check size={13} />Frontmatter</div>
          <dl>
            {frontmatter.map((item) => (
              <div key={item.key}><dt>{item.key}</dt><dd>{item.value}</dd></div>
            ))}
          </dl>
        </section>
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkFrontmatter, remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
