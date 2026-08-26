export const MAX_PNG_DIMENSION = 4096;
export const PNG_EXPORT_SCALE = 2;

type SvgSize = {
  width: number;
  height: number;
};

const NUMBER_PATTERN = "[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[-+]?\\d+)?";

function positiveSize(width: number, height: number): SvgSize | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
}

function readViewBox(svg: string) {
  const viewBox = svg.match(
    new RegExp(
      `\\bviewBox\\s*=\\s*["']\\s*(${NUMBER_PATTERN})[\\s,]+(${NUMBER_PATTERN})[\\s,]+(${NUMBER_PATTERN})[\\s,]+(${NUMBER_PATTERN})\\s*["']`,
      "iu",
    ),
  );
  return viewBox ? positiveSize(Number(viewBox[3]), Number(viewBox[4])) : null;
}

function readNumericAttribute(svg: string, name: "width" | "height") {
  const match = svg.match(
    new RegExp(`\\b${name}\\s*=\\s*["']\\s*(${NUMBER_PATTERN})(?:px)?\\s*["']`, "iu"),
  );
  return match ? Number(match[1]) : Number.NaN;
}

export function getSvgSize(svg: string, fallback?: Partial<SvgSize>): SvgSize {
  const viewBox = readViewBox(svg);
  if (viewBox) return viewBox;

  const attributes = positiveSize(
    readNumericAttribute(svg, "width"),
    readNumericAttribute(svg, "height"),
  );
  if (attributes) return attributes;

  return positiveSize(fallback?.width ?? 0, fallback?.height ?? 0) ?? {
    width: 1200,
    height: 700,
  };
}

export function getPngSize(svg: string, fallback?: Partial<SvgSize>): SvgSize {
  const source = getSvgSize(svg, fallback);
  const scale = Math.min(
    PNG_EXPORT_SCALE,
    MAX_PNG_DIMENSION / source.width,
    MAX_PNG_DIMENSION / source.height,
  );
  return {
    width: Math.max(1, Math.round(source.width * scale)),
    height: Math.max(1, Math.round(source.height * scale)),
  };
}

export function prepareSvgDataUrl(svg: string, fallback?: Partial<SvgSize>) {
  const source = getSvgSize(svg, fallback);
  const openingTag = svg.match(/<svg\b[^>]*>/iu)?.[0];
  if (!openingTag) throw new Error("SVG 內容無效");

  const normalizedTag = openingTag
    .replace(/\swidth\s*=\s*["'][^"']*["']/iu, "")
    .replace(/\sheight\s*=\s*["'][^"']*["']/iu, "")
    .replace(/>$/u, ` width="${source.width}" height="${source.height}">`);
  const normalizedSvg = svg.replace(openingTag, normalizedTag);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalizedSvg)}`;
}

function securityError(reason: unknown) {
  return typeof reason === "object" && reason !== null && "name" in reason
    && reason.name === "SecurityError";
}

export async function svgToPng(svg: string, dark: boolean) {
  const image = new Image();
  image.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("SVG 圖片載入失敗"));
    image.src = prepareSvgDataUrl(svg);
  });

  const { width, height } = getPngSize(svg, {
    width: image.naturalWidth,
    height: image.naturalHeight,
  });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("瀏覽器無法建立圖片畫布");
  context.fillStyle = dark ? "#191c20" : "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  try {
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("PNG 轉換失敗"))),
        "image/png",
      );
    });
  } catch (reason) {
    if (securityError(reason)) {
      throw new Error("PNG 匯出受到瀏覽器安全限制，請移除圖表中的外部圖片後重試");
    }
    throw reason;
  }
}
